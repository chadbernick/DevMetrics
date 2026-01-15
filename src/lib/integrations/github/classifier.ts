/**
 * GitHub Commit/PR Classification
 *
 * Classifies commits and PRs based on their message/title to determine work type.
 */

export type WorkType = "feature" | "bug_fix" | "refactor" | "docs" | "test" | "chore" | "other";

/**
 * Classification result
 */
export interface ClassificationResult {
  type: WorkType;
  confidence: number;
  hoursSaved: number;
}

/**
 * Classification patterns and their associated hours saved
 */
const CLASSIFICATION_PATTERNS: Array<{
  type: WorkType;
  patterns: RegExp[];
  confidence: number;
  hoursSaved: number;
}> = [
  {
    type: "feature",
    patterns: [
      /^feat(ure)?(\(|:|!|\s)/i,
      /\badd(s|ed|ing)?\b/i,
      /\bimplement(s|ed|ing)?\b/i,
      /\bnew\b/i,
    ],
    confidence: 0.8,
    hoursSaved: 2,
  },
  {
    type: "bug_fix",
    patterns: [
      /^fix(\(|:|!|\s)/i,
      /\bfix(es|ed|ing)?\b/i,
      /\bbug\b/i,
      /\bpatch(es|ed|ing)?\b/i,
      /\bresolve[sd]?\b/i,
    ],
    confidence: 0.85,
    hoursSaved: 1.5,
  },
  {
    type: "refactor",
    patterns: [
      /^refactor(\(|:|!|\s)/i,
      /\brefactor(s|ed|ing)?\b/i,
      /\bclean(s|ed|ing)?\s*up\b/i,
      /\brestructure[sd]?\b/i,
      /\bimprove[sd]?\b/i,
    ],
    confidence: 0.75,
    hoursSaved: 3,
  },
  {
    type: "docs",
    patterns: [
      /^docs?(\(|:|!|\s)/i,
      /\bdocument(s|ed|ing|ation)?\b/i,
      /\breadme\b/i,
      /\bcomment(s|ed|ing)?\b/i,
    ],
    confidence: 0.9,
    hoursSaved: 0.5,
  },
  {
    type: "test",
    patterns: [
      /^test(\(|:|!|\s)/i,
      /\btest(s|ed|ing)?\b/i,
      /\bspec(s)?\b/i,
      /\bcoverage\b/i,
    ],
    confidence: 0.85,
    hoursSaved: 1,
  },
  {
    type: "chore",
    patterns: [
      /^chore(\(|:|!|\s)/i,
      /\bdeps?\b/i,
      /\bconfig(ure)?\b/i,
      /\bbuild\b/i,
      /\bci\b/i,
      /\bupgrade[sd]?\b/i,
      /\bbump\b/i,
    ],
    confidence: 0.7,
    hoursSaved: 0.5,
  },
];

/**
 * Default classification when no patterns match
 */
const DEFAULT_CLASSIFICATION: ClassificationResult = {
  type: "other",
  confidence: 0.5,
  hoursSaved: 0.5,
};

/**
 * Classify a commit message to determine work type
 *
 * @param message - The commit message to classify
 * @returns Classification result with type, confidence, and estimated hours saved
 */
export function classifyCommitMessage(message: string): ClassificationResult {
  // Get the first line of the commit message
  const firstLine = message.split("\n")[0].toLowerCase();

  for (const classification of CLASSIFICATION_PATTERNS) {
    if (classification.patterns.some((pattern) => pattern.test(firstLine))) {
      return {
        type: classification.type,
        confidence: classification.confidence,
        hoursSaved: classification.hoursSaved,
      };
    }
  }

  return DEFAULT_CLASSIFICATION;
}

/**
 * Classify a PR title to determine work type
 * Uses the same logic as commit classification
 *
 * @param title - The PR title to classify
 * @returns Classification result with type, confidence, and estimated hours saved
 */
export function classifyPrTitle(title: string): ClassificationResult {
  return classifyCommitMessage(title);
}

/**
 * Get all supported work types
 */
export function getSupportedWorkTypes(): WorkType[] {
  return ["feature", "bug_fix", "refactor", "docs", "test", "chore", "other"];
}
