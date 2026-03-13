import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

export async function generateMessage(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}
