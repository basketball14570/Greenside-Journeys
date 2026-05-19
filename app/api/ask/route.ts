import { NextResponse, type NextRequest } from "next/server";
import { claude } from "@/lib/claude";
import { TOOLS, SYSTEM_PROMPT, runTool } from "@/lib/ai/tools";
import { supabaseServer } from "@/lib/supabase/server";
import { checkQuota, bumpUsage, QUOTA_ERROR_CODE } from "@/lib/usage";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

type ClientMessage = { role: "user" | "assistant"; content: string };

// Non-streaming endpoint for the Ask Greenside chat. We loop tool_use →
// tool_result until Claude returns a final text answer, then send the whole
// transcript back so the client can render it.
export async function POST(req: NextRequest) {
  // Auth-gate so anonymous callers can't drain the Claude budget.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  }
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const quota = await checkQuota(userData.user.id, "ask");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: QUOTA_ERROR_CODE,
        message: `You've used all ${quota.limit} questions today. Upgrade to Pro for unlimited.`,
        used: quota.used,
        limit: quota.limit,
        tier: quota.tier,
      },
      { status: 429 },
    );
  }

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

    await bumpUsage(userData.user.id, "ask");

    return NextResponse.json({
      reply: text,
      usage: { used: quota.used + 1, limit: quota.limit, allowed: true, tier: quota.tier },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
