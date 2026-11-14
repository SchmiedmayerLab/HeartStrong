import { describe, expect, it } from "vitest";
import {
  deploymentDestination,
  validateReleaseEvent,
} from "../../scripts/release-policy.mjs";

describe("opt-in release policy", () => {
  it("leaves a new template unpublished", () => {
    expect(deploymentDestination({ enabled: false }, true)).toBeUndefined();
    expect(() =>
      deploymentDestination(
        { enabled: true, destination: "https://research.example/" },
        true,
      ),
    ).toThrow("templateMode");
  });
  it.each(["https://research.example/", "https://group.github.io/project/"])(
    "accepts reviewed destination %s",
    (destination) => {
      expect(
        deploymentDestination({ enabled: true, destination }, false)?.origin,
      ).toBe(new URL(destination).origin);
    },
  );
  it.each([
    "http://research.example/",
    "https://lab-name.example.edu/",
    "https://user:pass@research.example/",
    "https://research.example/?preview=1",
    "https://research.example/#preview",
    "https://research.example/project",
  ])("rejects unsafe destination %s", (destination) => {
    expect(() =>
      deploymentDestination({ enabled: true, destination }, false),
    ).toThrow();
  });
  it("accepts stable releases and manual main dispatch only", () => {
    expect(() =>
      validateReleaseEvent({
        event: "workflow_dispatch",
        ref: "refs/heads/main",
      }),
    ).not.toThrow();
    expect(() =>
      validateReleaseEvent({
        event: "release",
        ref: "refs/tags/v1.2.3",
        tag: "v1.2.3",
        draft: "false",
        prerelease: "false",
      }),
    ).not.toThrow();
    for (const tag of ["v1.2.3-rc.1", "latest", "v01.2.3"])
      expect(() =>
        validateReleaseEvent({
          event: "release",
          ref: `refs/tags/${tag}`,
          tag,
          draft: "false",
          prerelease: "false",
        }),
      ).toThrow();
    expect(() =>
      validateReleaseEvent({
        event: "workflow_dispatch",
        ref: "refs/heads/feature/example",
      }),
    ).toThrow();
    expect(() =>
      validateReleaseEvent({
        event: "release",
        ref: "refs/tags/v1.2.3",
        tag: "v1.2.3",
        draft: "false",
        prerelease: "true",
      }),
    ).toThrow();
  });
});
