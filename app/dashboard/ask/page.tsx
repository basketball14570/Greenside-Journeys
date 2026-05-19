"use client";

import { useEffect, useRef, useState } from "react";
import { QuotaLimitBanner } from "@/components/edge/QuotaBanner";
import { useQuota } from "@/lib/use-quota";
import { QUOTA_ERROR_CODE } from "@/lib/usage";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Which of my bets has the biggest live EV move?",
  "Show me my AM-wave bets and the wave-split impact",
  "Hedge my McIlroy bet — what does the lock look like?",
  "How am I doing this month, broken down by book?",
  "What's the wind doing at Quail Hollow vs. forecast?",
  "Build me a contrarian DFS lineup using wind-positive players",
];

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { usage, setUsage } = useQuota("ask");
  const overLimit = usage?.allowed === false;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setError(null);
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429 && data.error === QUOTA_ERROR_CODE) {
          if (data.limit != null) {
            setUsage({ used: data.used, limit: data.limit, allowed: false });
          }
          throw new Error(data.message ?? "Daily limit reached");
        }
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      if (data.usage) setUsage(data.usage);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="px-5 lg:px-8 py-6 max-w-4xl mx-auto h-full flex flex-col">
      <header className="mb-5 flex items-end justify-between flex-wrap gap-3">
        <div>
          <span
            className="num font-semibold uppercase"
            style={{ fontSize: 10, letterSpacing: 1.4, color: "#f5c558" }}
          >
            ● Ask Greenside
          </span>
          <h1
            className="serif-italic mt-1.5"
            style={{ fontSize: 36, letterSpacing: -0.4, fontStyle: "normal" }}
          >
            <em>Talk to your portfolio.</em>
          </h1>
          <p className="text-text-dim mt-1 max-w-xl" style={{ fontSize: 13.5 }}>
            Conversational access to every bet, every alert, every condition.
            Answers grounded in your actual data — never guessed.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="num font-semibold uppercase text-text-dim hover:text-text"
            style={{ fontSize: 10.5, letterSpacing: 0.8 }}
          >
            Clear ↻
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-[14px] bg-surface-1 border border-line p-4 lg:p-6"
        style={{ minHeight: 400 }}
      >
        {messages.length === 0 ? (
          <Suggestions onPick={send} />
        ) : (
          <div className="space-y-5">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {sending && (
              <Bubble role="assistant" content="" pending />
            )}
            {error && (
              <div
                className="rounded-[10px] p-3 text-red"
                style={{
                  fontSize: 12.5,
                  background: "rgba(224,120,104,0.08)",
                  border: "1px solid rgba(224,120,104,0.3)",
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          placeholder="Ask anything about your bets or the live conditions…"
          className="flex-1 bg-surface-2 border border-line rounded-[10px] px-4 py-3 text-text focus:outline-none focus:border-fairway"
          style={{ fontSize: 14 }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="font-bold rounded-[10px] disabled:opacity-40"
          style={{
            background: "#8ee68e",
            color: "#06140c",
            padding: "0 18px",
            fontSize: 13.5,
          }}
        >
          {sending ? "Thinking…" : "Send →"}
        </button>
      </form>

      {overLimit && (
        <div className="mt-3">
          <QuotaLimitBanner body="You've used your free Ask questions for today." />
        </div>
      )}

      <p
        className="text-text-muted text-center mt-3"
        style={{ fontSize: 10.5, letterSpacing: 0.4 }}
      >
        Powered by Claude · responses grounded in your portfolio data via tool use
        {usage && usage.limit != null && (
          <>
            {" · "}
            {usage.used} of {usage.limit} questions today
          </>
        )}
      </p>
    </div>
  );
}

function Suggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="py-8">
      <div
        className="serif-italic text-text mb-1.5"
        style={{ fontSize: 22, letterSpacing: -0.3, fontStyle: "normal" }}
      >
        Try asking…
      </div>
      <p className="text-text-dim mb-5" style={{ fontSize: 13.5 }}>
        Greenside has tools for every live bet, alert, condition, leaderboard
        row, hedge calc, and DFS player in your slate.
      </p>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left rounded-[10px] p-3 transition border hover:border-fairway/40"
            style={{
              background: "rgba(0,0,0,0.18)",
              borderColor: "rgba(255,255,255,0.06)",
              fontSize: 13,
              lineHeight: 1.4,
              color: "#a8b3ac",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({
  role,
  content,
  pending,
}: {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-[14px] px-4 py-3 max-w-[85%]`}
        style={{
          background: isUser ? "rgba(142,230,142,0.13)" : "rgba(255,255,255,0.03)",
          border: isUser
            ? "1px solid rgba(142,230,142,0.3)"
            : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {!isUser && (
          <div
            className="num font-semibold uppercase mb-1.5"
            style={{ fontSize: 9.5, letterSpacing: 1.1, color: "#8ee68e" }}
          >
            Greenside
          </div>
        )}
        {pending ? (
          <ThinkingDots />
        ) : (
          <div
            className="text-text whitespace-pre-wrap"
            style={{ fontSize: 14, lineHeight: 1.55 }}
          >
            {content}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: 6,
            height: 6,
            background: "#8ee68e",
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes pulse {
          0%,
          80%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          40% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
