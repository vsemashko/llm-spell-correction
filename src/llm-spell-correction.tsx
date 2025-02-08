import { getSelectedText, Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { OpenAIResponse, ClaudeResponse, LlamaResponse } from "./types";

interface Preferences {
  openAiToken: string;
  model: string;
  apiProvider: APIProvider;
  systemPrompt?: string;
}

type APIProvider = "openai" | "claude" | "llama";

const API_URLS = {
  openai: "https://api.openai.com/v1/chat/completions",
  llama: "http://localhost:11434/api/generate", // Adjust if using a different LLaMA API
  claude: "https://api.anthropic.com/v1/messages",
};

async function correctWithOpenAI(
  inputText: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
): Promise<string> {
  const response = await fetch(API_URLS.openai, {
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
      temperature: 0,
      max_tokens: 1024,
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
): Promise<string> {
  const response = await fetch(API_URLS.claude, {
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
      temperature: 0,
      max_tokens: 1024,
    }),
  });

  const data = (await response.json()) as ClaudeResponse;
  if (!response.ok) throw new Error(`Claude API error: ${data.error?.message}`);
  return data.content[0].text.trim();
}

async function correctWithLlama(inputText: string, model: string, systemPrompt: string): Promise<string> {
  const response = await fetch(API_URLS.llama, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      prompt: `${systemPrompt}\n\n${inputText}`,
      stream: false,
      temperature: 0,
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
): Promise<string> {
  switch (apiProvider) {
    case "openai":
      return correctWithOpenAI(inputText, apiKey, model, systemPrompt);
    case "claude":
      return correctWithClaude(inputText, apiKey, model, systemPrompt);
    case "llama":
      return correctWithLlama(inputText, model, systemPrompt);
    default:
      throw new Error(`Unsupported API provider: ${apiProvider}`);
  }
}

export default async function main() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const apiKey = preferences.openAiToken;
    const model = preferences.model || "gpt-4o-mini";
    const apiProvider: APIProvider = preferences.apiProvider || "openai";
    const systemPrompt =
      preferences.systemPrompt ||
      "You are an AI assistant responsible for correcting spelling errors in a text selection while preserving structured elements such as code snippets, constants, bracketed text ([]), inline code ( ), special characters, and numerical values.\n\nFollow these steps:\nCarefully analyze the provided text.\nIdentify and correct only misspelled words in natural language text.\nPreserve code, constants, bracketed text, inline code, symbols, and numerical values exactly as they appear.\nReview the corrected text to ensure that all spelling errors are fixed without modifying protected elements.\nOutput Instructions:\n- Only output the corrected text in plain text format.\n- Do not modify or remove any bracketed text ([]), code snippets, inline code, constants, symbols, or numbers.\n- Do not reformat the text or add any additional content.\n- Ensure compliance with ALL these instructions.";

    const selectedText = await getSelectedText();
    await showHUD("🔄 Correcting text...");

    const correctedText = await correctText(selectedText, apiKey, model, apiProvider, systemPrompt);
    await Clipboard.paste(correctedText);
    await showHUD("✅ Text corrected!");
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
