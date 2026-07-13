// This source file is part of the Stanford HeartStrong open-source project
//
// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT

export type RouteName =
  "/" | "/hf-basics" | "/goal-setting" | "/treatment-options" | "/resources";

export interface NavItem {
  slug: string;
  title: string;
  href: RouteName;
  shortTitle: string;
}

export interface CallToAction {
  label: string;
  href: string;
}

export interface PageHero {
  title: string;
  intro: string;
  eyebrow: string;
  mascotKey: MascotKey;
  cta?: CallToAction;
}

export type GoalPromptId =
  | "priority"
  | "priorityCustom"
  | "barrier"
  | "action"
  | "frequency"
  | "support";

interface BaseGoalPrompt {
  id: GoalPromptId;
  label: string;
}

export interface ChoiceGoalPrompt extends BaseGoalPrompt {
  id: "priority";
  type: "choice";
  options: string[];
}

export interface TextGoalPrompt<
  Id extends Exclude<GoalPromptId, "priority"> = Exclude<
    GoalPromptId,
    "priority"
  >,
> extends BaseGoalPrompt {
  id: Id;
  type: "text" | "textarea";
}

export type GoalPrompt =
  | ChoiceGoalPrompt
  | TextGoalPrompt<"priorityCustom">
  | TextGoalPrompt<"barrier">
  | TextGoalPrompt<"action">
  | TextGoalPrompt<"frequency">
  | TextGoalPrompt<"support">;

export interface MedicationClass {
  slug: string;
  title: string;
  audience: string;
  summary: string;
  whatItDoes: string;
  commonSideEffects: string[];
  responseStates: string[];
  mascotKey: MascotKey;
}

export interface ResourceItem {
  slug: string;
  title: string;
  kind: "printable" | "guide" | "external";
  href: string;
  description: string;
}

export interface VideoItem {
  slug: string;
  title: string;
  description: string;
  context: string;
  descriptionBold?: boolean;
  youtubeId: string;
  placements: VideoPlacement[];
}

export interface VideoSection {
  slug: string;
  title: string;
  description: string;
  videos: VideoItem[];
}

export type VideoPlacement = "hf-basics" | "resources";

export type MascotKey =
  "welcome" | "basics" | "goal" | "treatment" | "resources" | "celebrate";

export const siteTitle = "HeartStrong";

export const navItems: NavItem[] = [
  { slug: "welcome", title: "Welcome", href: "/", shortTitle: "Welcome" },
  {
    slug: "hf-basics",
    title: "HF Basics",
    href: "/hf-basics",
    shortTitle: "Basics",
  },
  {
    slug: "goal-setting",
    title: "Goal Setting",
    href: "/goal-setting",
    shortTitle: "Goals",
  },
  {
    slug: "treatment-options",
    title: "Treatment Options",
    href: "/treatment-options",
    shortTitle: "Treatment",
  },
  {
    slug: "resources",
    title: "Resources",
    href: "/resources",
    shortTitle: "Resources",
  },
];

export const pageHeroes: Record<RouteName, PageHero> = {
  "/": {
    eyebrow: "Patient Action Guide",
    title: "HeartStrong brings your booklet to life.",
    intro:
      "Simple education, guided activities, and practical tools to help you understand heart failure and feel more prepared for every appointment.",
    mascotKey: "welcome",
    cta: {
      label: "See how HeartStrong helps",
      href: "#welcome-highlights",
    },
  },
  "/hf-basics": {
    eyebrow: "Heart Failure Basics",
    title: "Understand what heart failure means and what to watch for.",
    intro:
      "Use this page alongside your booklet to review common symptoms, understand ejection fraction, and learn why medications matter.",
    mascotKey: "basics",
    cta: {
      label: "Start with the basics",
      href: "#hf-overview",
    },
  },
  "/goal-setting": {
    eyebrow: "HEARTSTRONG GOAL",
    title: "Turn what matters most into one clear next step.",
    intro:
      "Choose a goal that fits your life, name what gets in the way, and create a plan you can bring back to your booklet and care team.",
    mascotKey: "goal",
    cta: {
      label: "Build my goal",
      href: "#goal-wizard",
    },
  },
  "/treatment-options": {
    eyebrow: "Heart Training Program",
    title: "Learn the medication classes that help support your heart.",
    intro:
      "Tap through the four core therapy groups, review common side effects, and mark what feels familiar so you can bring questions to your next visit.",
    mascotKey: "treatment",
    cta: {
      label: "See the four medication groups",
      href: "#medication-explorer",
    },
  },
  "/resources": {
    eyebrow: "Resource Library",
    title: "Keep resources, trackers, and videos in one place.",
    intro:
      "Use these printables and education links between appointments, then bring what you learn back to your HeartStrong booklet.",
    mascotKey: "resources",
    cta: {
      label: "Browse printables and tools",
      href: "#resource-library",
    },
  },
};

export const quickSupport = {
  emergencyLabel:
    "If you have chest pain, fainting, or shortness of breath at rest, call 911 right away.",
  disclaimer:
    "This website is for education only and does not provide medical advice. If you have symptoms or concerns about your health, contact your doctor or seek care right away.",
  crisisCtaLabel: "Veterans Crisis Line",
  crisisCallLabel: "Call 988, then press 1",
  crisisPhone: "988, then press 1",
  crisisText: "838255",
  crisisUrl: "https://www.veteranscrisisline.net/",
};

export const welcomeHighlights = [
  {
    title: "Notice symptoms earlier",
    description:
      "Use the symptom guide and daily trackers to spot change before it becomes overwhelming.",
  },
  {
    title: "Build a plan with your care team",
    description:
      "Learn the questions to ask, the medications to review, and what to bring to each appointment.",
  },
  {
    title: "Stay connected to what matters",
    description:
      "The goal-setting activity helps turn big priorities into one realistic next step.",
  },
];

export const focusAreaCards: Array<{
  title: string;
  href: RouteName;
  description: string;
}> = [
  {
    title: "HF Basics",
    href: "/hf-basics",
    description:
      "Learn what heart failure means, review ejection fraction, and know when symptoms need attention.",
  },
  {
    title: "Goal Setting",
    href: "/goal-setting",
    description:
      "Create a SMART goal based on your priorities, barriers, and support system.",
  },
  {
    title: "Treatment Options",
    href: "/treatment-options",
    description:
      "Review the four medication classes and bring your tracker to every appointment.",
  },
  {
    title: "Resources",
    href: "/resources",
    description:
      "Find printable logs, video links, and extra tools that reinforce the booklet.",
  },
];

export const goalPrompts: GoalPrompt[] = [
  {
    id: "priority",
    label: "What matters most to you right now?",
    type: "choice",
    options: [
      "Spend time with family",
      "Stay out of the hospital",
      "Live longer",
      "Have more energy",
      "Avoid med side effects",
    ],
  },
  {
    id: "priorityCustom",
    label: "Add your own priority",
    type: "text",
  },
  {
    id: "barrier",
    label: "What gets in the way of this?",
    type: "textarea",
  },
  {
    id: "action",
    label: "What is one thing you can do to work toward this goal?",
    type: "textarea",
  },
  {
    id: "frequency",
    label: "How often will you do this?",
    type: "text",
  },
  {
    id: "support",
    label: "Who or what could help you stick with this goal?",
    type: "textarea",
  },
];

export const medicationClasses: MedicationClass[] = [
  {
    slug: "arni-acei-arb",
    title: "ARNI / ACEi / ARB",
    audience: "Often used for HFrEF",
    summary: "Helps lower the pressure your heart works against.",
    whatItDoes:
      "These medications relax blood vessels and help your heart pump against less pressure.",
    commonSideEffects: [
      "Dizziness or feeling lightheaded",
      "A change in kidney function",
      "Cough with some ACE inhibitors",
      "A change in potassium level",
    ],
    responseStates: [
      "I know this medication",
      "I've heard of this, but I have questions",
      "This is new to me",
    ],
    mascotKey: "treatment",
  },
  {
    slug: "beta-blockers",
    title: "Beta Blockers",
    audience: "Often used for HFrEF",
    summary: "Slows the heart and helps it get stronger over time.",
    whatItDoes:
      "Beta blockers help your heart work more efficiently and may improve heart function over time. They can also help lower strain on the heart.",
    commonSideEffects: [
      "Feeling more tired at first",
      "Dizziness as your dose changes",
      "A slower heart rate",
      "Cold hands or feet",
    ],
    responseStates: [
      "I know this medication",
      "I've heard of this, but I have questions",
      "This is new to me",
    ],
    mascotKey: "basics",
  },
  {
    slug: "sglt2-inhibitors",
    title: "SGLT2 Inhibitors",
    audience: "Used in HFrEF and HFpEF",
    summary:
      "Helps the body get rid of extra fluid and may support heart health.",
    whatItDoes:
      "SGLT2 inhibitors help remove excess fluid and can lower the workload on your heart.",
    commonSideEffects: [
      "Needing to urinate more often",
      "Dehydration if fluid intake is too low",
      "Lightheadedness",
      "Genital yeast infections in some people",
    ],
    responseStates: [
      "I know this medication",
      "I've heard of this, but I have questions",
      "This is new to me",
    ],
    mascotKey: "resources",
  },
  {
    slug: "mra",
    title: "MRA",
    audience: "Used in HFrEF and some HFpEF",
    summary: "Blocks harmful hormones, reducing fluid and strain on the heart.",
    whatItDoes:
      "MRAs block the hormone aldosterone, helping the body remove extra salt and water while protecting the heart and kidneys from long-term damage.",
    commonSideEffects: [
      "A change in potassium level",
      "A change in kidney function",
      "Breast tenderness or swelling with some medications",
      "Dehydration if fluid balance changes too much",
    ],
    responseStates: [
      "I know this medication",
      "I've heard of this, but I have questions",
      "This is new to me",
    ],
    mascotKey: "goal",
  },
];

export const symptomGuide = [
  {
    state: "Green: Keep going",
    tone: "green",
    items: [
      "No new or worse shortness of breath",
      "Weight is stable",
      "No new swelling in feet or ankles",
      "Physical activity feels close to normal",
    ],
    action:
      "Keep taking medications as directed and continue your daily routine.",
  },
  {
    state: "Yellow: Caution",
    tone: "amber",
    items: [
      "Weight gain of 3 pounds in a day or 5 pounds in a week",
      "Trouble sleeping or needing more pillows",
      "Shortness of breath with activity",
      "New dizziness or lightheadedness",
    ],
    action: "Message or call your care team today.",
  },
  {
    state: "Red: Alert",
    tone: "red",
    items: [
      "Fainting or passing out",
      "New chest pain or chest pressure",
      "Shortness of breath at rest",
      "New or severe dizziness, confusion, or sudden mental health distress",
    ],
    action: "Call 911 or go to the emergency room immediately.",
  },
];

export const videoSections: VideoSection[] = [
  {
    slug: "medications",
    title: "Heart Failure Medications",
    description:
      "Learn about heart failure medicines, why they matter, and how the core therapy groups support the heart.",
    videos: [
      {
        slug: "intro-heart-failure-medications",
        title: "Introduction to Heart Failure",
        youtubeId: "-uMPchtoxWQ",
        description:
          "A plain-language explanation of what heart failure is, why it is serious, and the symptoms that usually show up first.",
        context: "",
        descriptionBold: true,
        placements: ["hf-basics"],
      },
      {
        slug: "importance-of-heart-meds",
        title: "Importance of Heart Meds",
        youtubeId: "RDWYlyAMRAo",
        description:
          "An overview of guideline-directed medical therapy and why the four core medication groups help people feel better, live longer, and avoid hospitalization.",
        context: "",
        descriptionBold: true,
        placements: ["hf-basics", "resources"],
      },
      {
        slug: "beta-blockers",
        title: "Beta Blockers",
        youtubeId: "XfgcXkq61k0",
        description:
          "Explains how beta blockers help the heart get stronger over time and what side effects to watch for early on.",
        context: "",
        descriptionBold: true,
        placements: ["resources"],
      },
      {
        slug: "ace-inhibitors-arbs",
        title: "ACE Inhibitors and ARBs",
        youtubeId: "iY7I1g5Vxck",
        description:
          "Explains how ACE inhibitors and ARBs reduce strain on the heart, help remove salt and fluid, and relax blood vessels.",
        context: "",
        descriptionBold: true,
        placements: ["resources"],
      },
      {
        slug: "arni",
        title: "Angiotensin Receptor/Neprilysin Inhibitors (ARNI)",
        youtubeId: "bh-_1GkZmok",
        description:
          "Explains how sacubitril and valsartan work together to lower pressure in the heart and support stronger pumping.",
        context: "",
        descriptionBold: true,
        placements: ["resources"],
      },
      {
        slug: "mra",
        title: "Mineralocorticoid Receptor Antagonists (MRAs)",
        youtubeId: "YhfPNHtvnLk",
        description:
          "Explains how MRAs help manage fluid and protect the heart, along with why potassium checks matter.",
        context: "",
        descriptionBold: true,
        placements: ["resources"],
      },
      {
        slug: "sglt2",
        title: "SGLT2 Inhibitors",
        youtubeId: "SKrk3OuIiyE",
        description:
          "Explains how SGLT2 inhibitors help lower heart pressure by removing extra water and sugar through the kidneys.",
        context: "",
        descriptionBold: true,
        placements: ["resources"],
      },
      {
        slug: "diuretics",
        title: "Diuretics",
        youtubeId: "16UFTq-mZro",
        description:
          "Explains how water pills reduce swelling and breathing trouble, and why doses may change based on symptoms and labs.",
        context: "",
        descriptionBold: true,
        placements: ["resources"],
      },
    ],
  },
  {
    slug: "vitals-lifestyle",
    title: "Vitals and Lifestyle Videos",
    description:
      "Learn how daily monitoring and day-to-day habits support heart failure care between visits.",
    videos: [
      {
        slug: "blood-pressure-monitoring",
        title: "Blood Pressure Monitoring",
        youtubeId: "KBbePdLbwUE",
        description:
          "Explains why blood pressure trends matter in heart failure and how daily checks can guide medication decisions.",
        context: "",
        descriptionBold: true,
        placements: ["resources"],
      },
      {
        slug: "weight-monitoring",
        title: "Weight Monitoring",
        youtubeId: "p1fHRIt8Sxc",
        description:
          "Explains why sudden weight gain can signal fluid retention and when to call your care team about changes.",
        context: "",
        descriptionBold: true,
        placements: ["hf-basics", "resources"],
      },
      {
        slug: "diet-exercise",
        title: "Diet and Exercise",
        youtubeId: "8ETOXtCyO9k",
        description:
          "Explains how lower-salt eating and gradual activity can support breathing, energy, and heart strength.",
        context: "",
        descriptionBold: true,
        placements: ["hf-basics"],
      },
    ],
  },
  {
    slug: "symptoms",
    title: "Symptom Videos",
    description:
      "Learn about symptom tracking, health status surveys, and what dizziness can mean in heart failure.",
    videos: [
      {
        slug: "health-status",
        title: "Health Status",
        youtubeId: "5TqT6OMnCbE",
        description:
          "Explains the KCCQ-12 symptom survey and how repeated check-ins help your care team understand how you are doing over time.",
        context: "",
        descriptionBold: true,
        placements: ["hf-basics", "resources"],
      },
      {
        slug: "dizziness",
        title: "Dizziness",
        youtubeId: "d_MVN08JdTs",
        description:
          "Explains common reasons dizziness happens in heart failure and offers tips that can make it easier to manage safely.",
        context: "",
        descriptionBold: true,
        placements: ["hf-basics", "resources"],
      },
    ],
  },
];

export const resourceItems: ResourceItem[] = [
  {
    slug: "vitals-tracker",
    title: "Vitals tracker",
    kind: "printable",
    href: "/printables/vitals",
    description:
      "Printable daily tracker for weight, blood pressure, heart rate, symptoms, and whether medications were taken.",
  },
  {
    slug: "appointment-log",
    title: "Appointment log",
    kind: "printable",
    href: "/printables/appointments",
    description:
      "Bring this sheet to every visit so you can record questions, medication changes, tests, and next steps.",
  },
  {
    slug: "hospital-log",
    title: "Hospitalization or ED visit log",
    kind: "printable",
    href: "/printables/hospital-visits",
    description:
      "Track what happened during an emergency or hospital visit, including medication changes and follow-up plans.",
  },
];
