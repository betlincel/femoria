"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { assistantResponseSchema } from "@/lib/assistant/schemas";
import { assistantUi } from "@/lib/content/assistant-content";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: Array<{ href: string; label: string }>;
}

export function AssistantWidget({ locale }: { locale: Locale }) {
  const ui = assistantUi[locale];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: ui.welcome },
  ]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const messageId = useRef(0);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => toggleRef.current?.focus());
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setLastQuestion(trimmed);
    setDraft("");
    const userMessage: ChatMessage = {
      id: `user-${messageId.current++}`,
      role: "user",
      content: trimmed,
    };
    const history = messages
      .filter((message) => message.id !== "welcome")
      .slice(-6)
      .map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, userMessage]);
    setPending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, message: trimmed, history }),
      });
      const parsed = assistantResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("Invalid assistant response");
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${messageId.current++}`,
          role: "assistant",
          content: parsed.data.reply,
          links: parsed.data.links,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { id: `assistant-${messageId.current++}`, role: "assistant", content: ui.error },
      ]);
    } finally {
      setPending(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(draft);
  };

  const reset = () => {
    setMessages([{ id: "welcome", role: "assistant", content: ui.welcome }]);
    setLastQuestion("");
    setDraft("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className={`assistant-root ${open ? "open" : ""}`}>
      {open ? (
        <section className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
          <header className="assistant-head">
            <div>
              <span className="assistant-brand" aria-hidden="true"><Icon name="spark" size={18} /></span>
              <div><strong id="assistant-title">{ui.name}</strong><span>FEMORIA</span></div>
            </div>
            <div className="assistant-head-actions">
              <button type="button" onClick={reset} aria-label={ui.newConversation} title={ui.newConversation}>
                <Icon name="refresh" size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  requestAnimationFrame(() => toggleRef.current?.focus());
                }}
                aria-label={ui.close}
              >
                <Icon name="close" size={19} />
              </button>
            </div>
          </header>

          <div className="assistant-messages" aria-live="polite" aria-busy={pending}>
            {messages.map((message) => (
              <article className={`assistant-message ${message.role}`} key={message.id}>
                <p>{message.content}</p>
                {message.links?.length ? (
                  <nav aria-label={ui.links}>
                    {message.links.map((link) => <Link href={link.href} key={link.href}>{link.label}<Icon name="arrow" size={14} /></Link>)}
                  </nav>
                ) : null}
              </article>
            ))}
            {pending ? <div className="assistant-typing" role="status"><span /><span /><span /><b className="sr-only">{ui.sending}</b></div> : null}
          </div>

          {messages.length === 1 ? (
            <div className="assistant-prompts" aria-label={ui.name}>
              {ui.quickQuestions.slice(0, 4).map((question) => (
                <button type="button" onClick={() => void ask(question)} key={question}>{question}</button>
              ))}
            </div>
          ) : null}

          <form className="assistant-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="assistant-message">{ui.placeholder}</label>
            <textarea
              id="assistant-message"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void ask(draft);
                }
              }}
              placeholder={ui.placeholder}
              maxLength={800}
              rows={2}
              disabled={pending}
            />
            <button type="submit" aria-label={ui.send} disabled={pending || !draft.trim()}>
              <Icon name="arrow" size={18} />
            </button>
          </form>
          {lastQuestion && !pending ? <button className="assistant-retry" type="button" onClick={() => void ask(lastQuestion)}><Icon name="refresh" size={14} />{ui.retry}</button> : null}
          <footer className="assistant-note"><Icon name="shield" size={14} /><span>{ui.disclosure} {ui.boundary}</span></footer>
        </section>
      ) : null}

      <button
        className="assistant-toggle"
        type="button"
        ref={toggleRef}
        aria-label={open ? ui.close : ui.open}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? "close" : "spark"} size={22} />
        <span>{ui.name}</span>
      </button>
    </div>
  );
}
