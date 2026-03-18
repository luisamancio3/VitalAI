import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const anthropic = new Anthropic();

export async function generateMessage(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      },
      { signal: controller.signal },
    );

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.text ?? "";
  } finally {
    clearTimeout(timeout);
  }
}
