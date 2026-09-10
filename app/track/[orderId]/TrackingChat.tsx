"use client";

import { useState } from "react";
import type { ChatMessage, Order } from "@/lib/data";

export default function TrackingChat({
  order,
  initialMessages,
}: {
  order: Order;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    setError(null);
    const text = input;
    setInput("");
    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, message: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setMessages(data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Track your delivery</h1>
        <p className="text-sm text-gray-500">
          Order {order.id} for {order.customerName}
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 p-4 text-sm flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">{order.status.replace("_", " ")}</span>
          <span className="text-gray-500">ETA {order.eta}</span>
        </div>
        <span className="text-gray-500">{order.address}</span>
        {order.exception && (
          <span className="text-red-600 text-xs">
            We&apos;re handling an issue with your delivery (
            {order.exception.replace("_", " ")}
            {order.escalated ? " — a team member is reviewing it" : ""}).
          </span>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Chat with support
        </h2>
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 min-h-[16rem] max-h-[24rem] overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-sm text-gray-400">
              Ask about your ETA, driver, or anything else about this order.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "customer"
                  ? "self-end bg-blue-600 text-white"
                  : "self-start bg-gray-100 text-gray-800"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Ask a question about your order…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={sending || !input.trim()}
            onClick={sendMessage}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>
    </main>
  );
}
