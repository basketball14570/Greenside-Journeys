import { NextResponse, type NextRequest } from "next/server";
import { claude } from "@/lib/claude";
import { TOOLS, SYSTEM_PROMPT, runTool } from "@/lib/ai/tools";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

type ClientMessage = { role: "user" | "assistant"; content: string };

// Non-streaming endpoint for the Ask Greenside chat. We loop tool_use →
// tool_result until Claude returns a final text answer, then send the whole
// transcript back so the client can render it.
export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: ClientMessage[] } = await req.json();
    if (!messages?.length) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let response = await claude().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      tools: TOOLS as unknown as Anthropic.Tool[],
      messages: apiMessages,
    });

    // Loop while Claude wants to call tools.
    let safety = 0;
    while (response.stop_reason === "tool_use" && safety < 6) {
      safety++;
      const toolUses = response.content.filter(
        (b) => b.type === "tool_use",
      ) as Anthropic.ToolUseBlock[];

      apiMessages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const t of toolUses) {
        const result = await runTool(t.name, t.input as Record<string, unknown>);
        toolResults.push({
          type: "tool_result",
          tool_use_id: t.id,
          content: JSON.stringify(result),
        });
      }
      apiMessages.push({ role: "user", content: toolResults });

      response = await claude().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        tools: TOOLS as unknown as Anthropic.Tool[],
        messages: apiMessages,
      });
    }

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("\n\n");

    return NextResponse.json({ reply: text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
