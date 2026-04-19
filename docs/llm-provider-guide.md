# LLM Provider Guide

The tool uses an LLM for four things:
1. RFP/RFI extraction (parse a document into structured requirements)
2. "Ask Claude" explanations (customer-tailored Explain content)
3. Drafting RFI response sections
4. Explaining sizing decisions in the Build section

All LLM calls go through a **provider abstraction**. Swapping providers is a config change. This guide covers how to configure an existing provider and how to add a new one.

---

## 1. How it works

```
app code
   │
   ▼
lib/llm/provider.ts                    ← interface
   │
   ├─► lib/llm/anthropic.ts            ← default
   ├─► lib/llm/openai-compatible.ts    ← covers Gemma, Kimi, Nemotron, Ollama, vLLM, etc.
   └─► lib/llm/<your-new-provider>.ts  ← add here
```

Provider selection happens at startup from env vars. The rest of the app never imports a specific provider — it calls `getLlmProvider().complete({...})`.

---

## 2. The interface

```ts
// lib/llm/provider.ts

export interface LlmProvider {
  name: string

  complete(opts: {
    system?: string
    messages: { role: 'user' | 'assistant'; content: string }[]
    maxTokens?: number
    temperature?: number
    json?: boolean         // hint that response should be valid JSON
  }): Promise<{
    text: string
    usage?: { inputTokens: number; outputTokens: number }
  }>
}

export function getLlmProvider(): LlmProvider
```

All providers implement this single method. The app doesn't care about provider-specific features — it either works on the baseline or doesn't.

**Design constraints:**
- Single-shot completion only in v1 (no streaming, no multi-turn state outside `messages`)
- JSON mode is a hint; providers that don't support native JSON mode fall back to "be sure to reply with valid JSON" in the system prompt
- No tool/function calling in v1 — structured outputs are handled via prompt + parse

---

## 3. Configuring existing providers

### 3.1 Anthropic (default)

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-7      # or another Claude model
```

Uses the official `@anthropic-ai/sdk`. Native JSON mode unavailable, so JSON hints go in the system prompt.

### 3.2 OpenAI-compatible

This one adapter covers a lot of providers that expose an OpenAI-compatible `/v1/chat/completions` endpoint:
- **Gemma** served via vLLM or TGI
- **Kimi** (Moonshot) — via their OpenAI-compatible endpoint
- **Nemotron** via NVIDIA NIM or vLLM
- **Ollama** (local)
- **vLLM** (any model)
- **TGI** (any model)
- **Together, Groq, Fireworks, DeepInfra** (hosted)
- **LM Studio** (local)

```env
LLM_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_MODEL=gemma-4-27b-it
```

**Base URL must include `/v1`**. This is the most common mistake.

### 3.3 Switching providers

Edit `.env`, restart the app:

```bash
# Docker
docker compose restart

# Local
# Ctrl-C the dev server, then npm run dev
```

No code changes.

---

## 4. Adding a new provider

Use this if you have a provider whose API doesn't fit the OpenAI-compatible mold (e.g., Google Vertex AI Gemini with its own SDK, AWS Bedrock, Azure AI with special auth, or an internal corporate endpoint with custom auth).

### Step 1 — create the provider file

```ts
// lib/llm/bedrock.ts
import { LlmProvider } from './provider'

export class BedrockProvider implements LlmProvider {
  name = 'bedrock'

  constructor(private config: {
    region: string
    accessKeyId: string
    secretAccessKey: string
    modelId: string
  }) {}

  async complete(opts) {
    // ...call AWS Bedrock SDK...
    const response = await bedrockClient.invokeModel({
      modelId: this.config.modelId,
      body: JSON.stringify({
        messages: opts.messages,
        system: opts.system,
        max_tokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.2
      })
    })

    const body = JSON.parse(new TextDecoder().decode(response.body))
    return {
      text: body.content[0].text,
      usage: {
        inputTokens: body.usage?.input_tokens,
        outputTokens: body.usage?.output_tokens
      }
    }
  }
}
```

### Step 2 — register it in the factory

```ts
// lib/llm/provider.ts

export function getLlmProvider(): LlmProvider {
  const provider = process.env.LLM_PROVIDER ?? 'anthropic'

  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider({ ... })
    case 'openai-compatible':
      return new OpenAiCompatibleProvider({ ... })
    case 'bedrock':                                        // ← new case
      return new BedrockProvider({
        region: required('AWS_REGION'),
        accessKeyId: required('AWS_ACCESS_KEY_ID'),
        secretAccessKey: required('AWS_SECRET_ACCESS_KEY'),
        modelId: required('BEDROCK_MODEL_ID')
      })
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${provider}`)
  }
}
```

### Step 3 — document the env vars

Add to `.env.example`:
```env
# Bedrock (optional)
# LLM_PROVIDER=bedrock
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### Step 4 — test it

```ts
// tests/llm/bedrock.test.ts
import { BedrockProvider } from '@/lib/llm/bedrock'

// skip in CI if credentials aren't present
describe.skipIf(!process.env.AWS_ACCESS_KEY_ID)('BedrockProvider', () => {
  it('completes a simple prompt', async () => {
    const p = new BedrockProvider({ ... })
    const r = await p.complete({ messages: [{ role: 'user', content: 'Say hi' }] })
    expect(r.text.length).toBeGreaterThan(0)
  })
})
```

### Step 5 — update the README

Add your provider to the README's configuration section so the next person knows.

---

## 5. JSON mode handling

Several features (RFP extraction, response drafting) request JSON. Providers handle this differently:

| Provider | Native JSON mode | Engine approach |
|---|---|---|
| Anthropic | No (but very reliable with prompt) | Prompt instruction + parse; retry on parse failure |
| OpenAI-compatible | `response_format: { type: 'json_object' }` on some endpoints | Try native mode; fall back to prompt |
| Others | Varies | Prompt instruction |

The `json: true` flag in `complete()` is a hint. Providers that support native JSON mode should use it. Providers that don't should at minimum append a strong "reply with valid JSON only, no prose, no markdown fences" to the system prompt.

Callers should always wrap JSON parsing in try/catch and retry once with a clarifying prompt if parsing fails. This is in `lib/llm/json.ts` (utility).

---

## 6. Prompt versioning

All prompts live in `lib/llm/prompts/` as template files. Each has a `PROMPT_VERSION` constant:

```ts
// lib/llm/prompts/extract-rfp.ts
export const PROMPT_VERSION = 'extract-rfp@2025-11-01'

export function extractRfpPrompt(rfpText: string) {
  return {
    system: `You are an expert in ML/GenAI deployment RFPs...`,
    user: `Extract structured requirements from this RFP:\n\n${rfpText}`
  }
}
```

When a prompt changes materially, bump the version. Audit logs include `PROMPT_VERSION` so we can track which prompt produced which output if a customer disputes an extraction.

---

## 7. Cost awareness

The `usage` object in the response is used by the audit log and a per-project cost counter (Phase 6+). Providers should populate it when possible. Unknown usage is fine (just `undefined`) — no fake estimates.

---

## 8. Rate limits and retries

Providers should throw a typed error on rate limit / transient failure:

```ts
export class LlmRateLimitError extends Error {
  constructor(public retryAfterMs?: number) { super('Rate limited') }
}

export class LlmTransientError extends Error {}
```

The calling code (in `lib/llm/retry.ts`) handles retry with exponential backoff. Don't retry inside the provider — keep the provider thin.

---

## 9. Checklist for a new provider

- [ ] Implements `LlmProvider` interface
- [ ] Registered in `getLlmProvider()` factory
- [ ] Env vars documented in `.env.example`
- [ ] Env vars documented in README configuration section
- [ ] Handles `opts.json` hint (native if possible, prompt injection fallback)
- [ ] Throws `LlmRateLimitError` / `LlmTransientError` on respective failures
- [ ] Populates `usage` when the underlying API provides it
- [ ] Smoke test in `tests/llm/` (skipped in CI if credentials absent)

---

## 10. Future considerations (not in v1)

- Streaming responses (for "Ask Claude" to feel snappy)
- Tool / function calling (replace prompt-based JSON with structured outputs)
- Multi-provider fallback (try primary, fall back to secondary on failure)
- Per-feature provider selection (use fast model for explain, strong model for extraction)
- Caching layer (cache deterministic-prompt responses)

None of these are blocked by the current abstraction — they're additive.
