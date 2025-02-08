export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

export interface ClaudeResponse {
  content: Array<{
    text: string;
  }>;
  error?: {
    message: string;
  };
}

export interface LlamaResponse {
  response: string;
}
