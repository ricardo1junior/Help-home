"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDateTime, sendMessage, subscribeToMessages, type Message } from "@helphome/shared";
import { createClient } from "@/lib/supabase/client";

export function Chat({
  requestId,
  userId,
  initialMessages,
}: {
  requestId: string;
  userId: string;
  initialMessages: Message[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeToMessages(supabase, requestId, (m) =>
        setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m])),
      ),
    [supabase, requestId],
  );

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const message = await sendMessage(supabase, userId, requestId, text);
      setMessages((prev) => (prev.some((p) => p.id === message.id) ? prev : [...prev, message]));
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card">
      <h2 className="font-semibold">Conversa</h2>
      <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">Combine os detalhes do serviço por aqui.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-brand-100" : "text-slate-500"}`}>
                  {formatDateTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem"
          maxLength={2000}
        />
        <button className="btn-primary" disabled={sending || !text.trim()}>Enviar</button>
      </form>
    </section>
  );
}
