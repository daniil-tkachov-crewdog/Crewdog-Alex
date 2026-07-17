"use client";

import { useEffect, useRef, useState } from "react";

/** client_id is passed by the loader as a query param (unused server-side in
 * Slice 1, but forwarded so the wiring is already in place). */
function readClientId(): string {
  if (typeof window === "undefined") return "placeholder";
  return new URLSearchParams(window.location.search).get("client_id") || "placeholder";
}

/**
 * The Alex chat window — served inside the sandboxed iframe that widget.js
 * mounts on the board's site. It talks only to our own /api/chat; no secrets
 * live here. Slice 1: chat only, placeholder branding, no job search.
 */

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Render assistant text with clickable job links. Turns markdown links
 * [label](url) and bare http(s) URLs into anchors; everything else is left as
 * plain text (whitespace-pre-wrap on the bubble preserves line breaks).
 */
function Linkified({ text }: { text: string }) {
  // Markdown links first, then bare URLs in the remaining text.
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  const anchor = (href: string, label: string) => (
    <a
      key={key++}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline underline-offset-2"
      style={{ color: BRAND.color }}
    >
      {label}
    </a>
  );

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2]) {
      // [label](url)
      nodes.push(anchor(m[2], m[1]));
    } else if (m[3]) {
      // bare url — trim trailing sentence punctuation so it stays a valid link
      const raw = m[3];
      const trimmed = raw.replace(/[.,;:!?]+$/, "");
      nodes.push(anchor(trimmed, trimmed));
      if (trimmed.length < raw.length) nodes.push(raw.slice(trimmed.length));
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));

  return <>{nodes}</>;
}

// Placeholder brand for Slice 1 (neo-purple, matching the portal accent).
const BRAND = {
  name: "Alex",
  color: "oklch(0.54 0.23 293)",
  greeting: "Hi! I'm Alex. Tell me what kind of role you're after and I'll help you find it.",
};

export default function EmbedPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: BRAND.greeting },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: readClientId(),
          // Send only the real turns (drop the local greeting).
          messages: nextMessages,
        }),
      });
      const data = await res.json();
      const reply =
        typeof data.reply === "string" && data.reply.length > 0
          ? data.reply
          : data.error ?? "Sorry, something went wrong.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I couldn't reach the server. Try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-white text-[oklch(0.21_0.02_285)]">
      {/* Header */}
      <header
        className="flex items-center gap-2 px-4 py-3 text-white"
        style={{ backgroundColor: BRAND.color }}
      >
        <span className="grid size-7 place-items-center rounded-full bg-white/20 text-sm font-semibold">
          {BRAND.name.charAt(0)}
        </span>
        <span className="font-semibold">{BRAND.name}</span>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className="max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
              style={
                m.role === "user"
                  ? { backgroundColor: BRAND.color, color: "white" }
                  : { backgroundColor: "oklch(0.97 0.005 286)" }
              }
            >
              {m.role === "assistant" ? <Linkified text={m.content} /> : m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[oklch(0.97_0.005_286)] px-3.5 py-2 text-sm text-[oklch(0.55_0.02_286)]">
              Alex is typing…
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-[oklch(0.92_0.006_286)] px-3 py-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Ask Alex about jobs…"
          className="max-h-32 flex-1 resize-none rounded-xl border border-[oklch(0.92_0.006_286)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.54_0.23_293)]"
        />
        <button
          onClick={send}
          disabled={sending || input.trim().length === 0}
          className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: BRAND.color }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
