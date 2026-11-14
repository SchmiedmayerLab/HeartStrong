import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import GithubSlugger from "github-slugger";
import MarkdownIt from "markdown-it";
import { parseFragment } from "parse5";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".astro",
  ".git",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const markdown = new MarkdownIt({ html: true, linkify: false });
const documentCache = new Map();
const failures = [];

async function listMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter(
        (entry) => !entry.isDirectory() || !ignoredDirectories.has(entry.name),
      )
      .map((entry) => {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) return listMarkdown(path);
        return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
      }),
  );
  return nested.flat();
}

function visitHtml(node, callback) {
  callback(node);
  for (const child of node.childNodes ?? []) visitHtml(child, callback);
  if (node.content) visitHtml(node.content, callback);
}

function inlineText(token) {
  return (token.children ?? [])
    .map((child) => {
      if (["text", "code_inline", "emoji"].includes(child.type))
        return child.content;
      if (child.type === "image") return child.content;
      if (child.type === "html_inline")
        return child.content.replace(/<[^>]*>/g, "");
      return "";
    })
    .join("")
    .trim();
}

async function parseDocument(file) {
  if (documentCache.has(file)) return documentCache.get(file);
  const content = await readFile(file, "utf8");
  const tokens = markdown.parse(content, {});
  const slugger = new GithubSlugger();
  const anchors = new Set();
  const links = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "heading_open") {
      const heading = tokens[index + 1];
      if (heading?.type === "inline")
        anchors.add(slugger.slug(inlineText(heading)));
    }
    for (const child of token.children ?? []) {
      if (child.type === "link_open")
        links.push({ value: child.attrGet("href"), line: token.map?.[0] });
      if (child.type === "image")
        links.push({ value: child.attrGet("src"), line: token.map?.[0] });
    }
    if (token.type === "html_block" || token.type === "html_inline") {
      const fragment = parseFragment(token.content);
      visitHtml(fragment, (node) => {
        for (const attribute of node.attrs ?? []) {
          if (attribute.name === "id") anchors.add(attribute.value);
          if (attribute.name === "href" || attribute.name === "src") {
            links.push({ value: attribute.value, line: token.map?.[0] });
          }
        }
      });
    }
  }

  const parsed = { anchors, links };
  documentCache.set(file, parsed);
  return parsed;
}

function displayPath(file) {
  return relative(root, file).split(sep).join("/");
}

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

async function checkLink(source, link) {
  const value = link.value?.trim();
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return;

  const sourcePath = displayPath(source);
  const rootAbsolute = value.startsWith("/");
  if (rootAbsolute && sourcePath.startsWith("src/content/")) return;

  const hashIndex = value.indexOf("#");
  const rawPath = (hashIndex === -1 ? value : value.slice(0, hashIndex)).split(
    "?",
  )[0];
  const rawHash = hashIndex === -1 ? "" : value.slice(hashIndex + 1);
  const path = decode(rawPath);
  const hash = decode(rawHash);
  const line = typeof link.line === "number" ? `:${link.line + 1}` : "";
  const location = `${displayPath(source)}${line}`;
  if (path === undefined || hash === undefined) {
    failures.push(`${location}: malformed percent-encoding in “${value}”`);
    return;
  }

  const target =
    path ?
      rootAbsolute ? resolve(root, path.replace(/^\/+/, ""))
      : resolve(dirname(source), path)
    : source;
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    failures.push(`${location}: “${value}” escapes the repository`);
    return;
  }

  let targetStats;
  try {
    targetStats = await stat(target);
  } catch {
    const contentRoute =
      sourcePath.startsWith("src/content/") && !extname(path);
    if (contentRoute) return;
    failures.push(`${location}: “${value}” has no source-file target`);
    return;
  }

  if (!hash) return;
  if (!targetStats.isFile() || extname(target).toLowerCase() !== ".md") {
    failures.push(
      `${location}: “${value}” points to a fragment on a non-Markdown target`,
    );
    return;
  }
  const targetDocument = await parseDocument(target);
  if (!targetDocument.anchors.has(hash)) {
    failures.push(
      `${location}: “${value}” has no matching Markdown heading or HTML id`,
    );
  }
}

const files = await listMarkdown(root);
for (const file of files) {
  const document = await parseDocument(file);
  for (const link of document.links) await checkLink(file, link);
}

if (failures.length > 0) {
  process.stderr.write(
    `Markdown link audit failed with ${failures.length} problem(s):\n`,
  );
  process.stderr.write(failures.map((failure) => `- ${failure}`).join("\n"));
  process.stderr.write("\n");
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Markdown link audit passed: ${files.length} source files checked.\n`,
  );
}
