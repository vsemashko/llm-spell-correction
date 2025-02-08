# LLM Spellfixer for Raycast

A Raycast extension that uses AI language models to correct spelling in selected text while preserving code snippets, special characters, and formatting.

## Features

- Spell correction using multiple AI providers (OpenAI, Claude, LLaMA)
- Preserves code snippets, brackets, inline code, and special characters
- Customizable system prompt
- Easy-to-use: just select text and run the command

## Installation

1. Make sure you have [Raycast](https://raycast.com/) installed
2. Install the extension from the Raycast Store
3. Configure your API token in the extension preferences

## Configuration

### Required Settings

- **OpenAI API Token**: Your OpenAI API key for authentication

### Optional Settings

- **LLM Model**: Choose between different models (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- **System Prompt**: Customize the AI's behavior for spell correction

## Usage

1. Select text in any application
2. Open Raycast and search for "Correct Spelling with LLM"
3. Press Enter to correct the selected text
4. The corrected text will automatically replace your selection

## Support

For issues and feature requests, please open an issue on GitHub.

## License

MIT License
