import { getSelectedText, Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { OpenAIResponse, ClaudeResponse, LlamaResponse } from "./types";

interface Preferences {
  apiToken?: string;
  apiProvider: APIProvider;
  modelType?: string;
  customModel?: string;
  systemPrompt?: string;
  temperature?: string;
  maxTokens?: string;
  apiUrl?: string;
}

type APIProvider = "openai" | "claude" | "llama";

const getApiUrl = (preferences: Preferences, provider: APIProvider): string => {
  if (preferences.apiUrl) return preferences.apiUrl;
  
  return {
    openai: "https://api.openai.com/v1/chat/completions",
    llama: "http://localhost:11434/api/generate",
    claude: "https://api.anthropic.com/v1/messages",
  }[provider];
};

const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant responsible for correcting spelling errors in a text selection while preserving structured elements such as code snippets, constants, bracketed text ([]), inline code ( ), special characters, and numerical values.

Follow these steps:
Carefully analyze the provided text.
Identify and correct only misspelled words in natural language text.
Preserve code, constants, bracketed text, inline code, symbols, and numerical values exactly as they appear.
Review the corrected text to ensure that all spelling errors are fixed without modifying protected elements.

Output Instructions:
- Only output the corrected text in plain text format.
- Do not modify or remove any bracketed text ([]), code snippets, inline code, constants, symbols, or numbers.
- Do not reformat the text or add any additional content.
- Ensure compliance with ALL these instructions.`;

async function correctWithOpenAI(
  inputText: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  apiUrl: string,
): Promise<string> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: inputText },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  const data = (await response.json()) as OpenAIResponse;
  if (!response.ok) throw new Error(`OpenAI API error: ${data.error?.message}`);
  return data.choices[0].message.content.trim();
}

async function correctWithClaude(
  inputText: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  apiUrl: string,
): Promise<string> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model,
      system: systemPrompt,
      messages: [{ role: "user", content: inputText }],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const data = (await response.json()) as ClaudeResponse;
  if (!response.ok) throw new Error(`Claude API error: ${data.error?.message}`);
  return data.content[0].text.trim();
}

async function correctWithLlama(
  inputText: string,
  model: string,
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  apiUrl: string,
): Promise<string> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      prompt: `${systemPrompt}\n\n${inputText}`,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  });

  const data = (await response.json()) as LlamaResponse;
  if (!response.ok) throw new Error(`LLaMA API error: ${JSON.stringify(data)}`);
  return data.response.trim();
}

async function correctText(
  inputText: string,
  apiKey: string,
  model: string,
  apiProvider: APIProvider,
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  apiUrl: string,
): Promise<string> {
  switch (apiProvider) {
    case "openai":
      return correctWithOpenAI(inputText, apiKey, model, systemPrompt, temperature, maxTokens, apiUrl);
    case "claude":
      return correctWithClaude(inputText, apiKey, model, systemPrompt, temperature, maxTokens, apiUrl);
    case "llama":
      return correctWithLlama(inputText, model, systemPrompt, temperature, maxTokens, apiUrl);
    default:
      throw new Error(`Unsupported API provider: ${apiProvider}`);
  }
}

export default async function main() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const apiProvider: APIProvider = preferences.apiProvider;
    const apiKey = preferences.apiToken;
    const apiUrl = getApiUrl(preferences, apiProvider);

    // Validate API token for OpenAI and Claude
    if ((apiProvider === "openai" || apiProvider === "claude") && !apiKey) {
      throw new Error(`API token is required for ${apiProvider}`);
    }

    // Get the appropriate model based on provider
    const model = preferences.modelType === "custom" 
      ? preferences.customModel || "gpt-3.5-turbo"
      : preferences.modelType || "gpt-3.5-turbo";

    const systemPrompt = preferences.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const temperature = parseFloat(preferences.temperature || "0");
    const maxTokens = parseInt(preferences.maxTokens || "1024", 10);

    const selectedText = await getSelectedText();
    await showHUD("🔄 Correcting text...");

    const correctedText = await correctText(
      selectedText,
      apiKey || "",
      model,
      apiProvider,
      systemPrompt,
      temperature,
      maxTokens,
      apiUrl,
    );
    await Clipboard.paste(correctedText);
    await showHUD("✅ Text corrected!");
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
