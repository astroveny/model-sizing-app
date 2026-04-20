// Ref: docs/llm-provider-guide.md

export type LlmMessage = { role: "user" | "assistant" | "system"; content: string };

export type LlmCompleteParams = {
  messages: LlmMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  /** When true, response is expected to be JSON and will be parsed */
  json?: boolean;
};

export type LlmCompleteResult = {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
};

export class LlmTransientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LlmTransientError";
  }
}

export class LlmRateLimitError extends LlmTransientError {
  constructor(public readonly retryAfterMs: number, cause?: unknown) {
    super(`Rate limited — retry after ${retryAfterMs}ms`, cause);
    this.name = "LlmRateLimitError";
  }
}

export class LlmFatalError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LlmFatalError";
  }
}

export interface LlmProvider {
  complete(params: LlmCompleteParams): Promise<LlmCompleteResult>;
}
