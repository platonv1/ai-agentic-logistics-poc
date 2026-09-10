export interface AgentResult {
  reasoning: string;
  action: string;
  confidence: number;
}

export interface RunAgentParams {
  systemPrompt: string;
  userPrompt: string;
  /** Deterministic-but-scenario-aware fallback, computed by the caller from local
   * mock state. Used as the response when LLM_PROVIDER=mock, and as a safety net
   * if a real provider call fails, so the demo never dead-ends. */
  mockResult: AgentResult | (() => AgentResult);
}

function resolveMock(mockResult: RunAgentParams["mockResult"]): AgentResult {
  return typeof mockResult === "function" ? mockResult() : mockResult;
}

function parseAgentResult(text: string): AgentResult {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "");
  const parsed = JSON.parse(cleaned);
  if (
    typeof parsed.reasoning !== "string" ||
    typeof parsed.action !== "string" ||
    typeof parsed.confidence !== "number"
  ) {
    throw new Error("Malformed agent result JSON");
  }
  return {
    reasoning: parsed.reasoning,
    action: parsed.action,
    confidence: Math.max(0, Math.min(1, parsed.confidence)),
  };
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              reasoning: { type: "string" },
              action: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["reasoning", "action", "confidence"],
          },
        },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response missing text content");
  return parseAgentResult(text);
}

async function callOllama(
  systemPrompt: string,
  userPrompt: string
): Promise<AgentResult> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3";

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: `${systemPrompt}\n\n${userPrompt}\n\nRespond with ONLY a JSON object of the shape {"reasoning": string, "action": string, "confidence": number between 0 and 1}. No prose, no markdown fences.`,
      stream: false,
      format: "json",
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.response) throw new Error("Ollama response missing 'response' field");
  return parseAgentResult(data.response);
}

/**
 * Provider-agnostic entry point used by every agent route. Picks the provider from
 * LLM_PROVIDER (gemini | ollama | mock, default mock). If a real provider call throws
 * (missing key, unreachable local server, malformed output) it falls back to the
 * caller-supplied mock rather than surfacing an error, so the demo stays interactive
 * end to end.
 */
export async function runAgent(params: RunAgentParams): Promise<AgentResult> {
  const provider = (process.env.LLM_PROVIDER || "mock").toLowerCase();

  if (provider === "gemini" || provider === "ollama") {
    try {
      return provider === "gemini"
        ? await callGemini(params.systemPrompt, params.userPrompt)
        : await callOllama(params.systemPrompt, params.userPrompt);
    } catch (err) {
      console.error(`[llm] ${provider} call failed, falling back to mock:`, err);
    }
  }

  return resolveMock(params.mockResult);
}
