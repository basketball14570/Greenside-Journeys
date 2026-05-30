import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function claude(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  _client = new Anthropic({ apiKey });
  return _client;
}

// Default vision-capable Claude model for bet-slip parsing.
// Keep this in one place so model upgrades are a single-line change.
export const VISION_MODEL = "claude-sonnet-4-6";

// Long-form writing / reasoning model — course-guide prose and the
// structural-profile generation. Uses the most capable Opus tier since
// these run rarely (weekly cron) and quality is the whole point.
export const WRITING_MODEL = "claude-opus-4-8";
