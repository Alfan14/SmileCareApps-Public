import { Bot, RotateCcw, Send, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useAiChat } from "../../hooks/useAi";
import { chatErrorMessage, historyFor, MAX_MESSAGE_CHARS } from "../../lib/chat";
import { cn } from "../../lib/cn";
import { inputClass } from "../../lib/formStyles";
import type { ChatMessage } from "../../types/api";
import { Button } from "../ui/Button";
import { Disclaimer } from "./Disclaimer";

type Bubble = ChatMessage & { id: number };

const SUGGESTIONS = [
  "What causes tooth sensitivity?",
  "Do I need a dental X-ray?",
  "How do I prepare for a root canal?",
  "What are my options for straighter teeth?",
  "What are your clinic opening hours?",
];

const GREETING = "Hi! I am SmileCare’s AI dental assistant. I can answer general questions about oral health, treatments, preparing for a visit, and our clinic.";

export function ChatPanel() {
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [demo, setDemo] = useState(false);
  const chat = useAiChat();
  const conversation = useRef(0); // lets "New chat" ignore an answer that arrives late
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages, chat.isPending]);

  const tooLong = draft.length > MAX_MESSAGE_CHARS;

  function ask(history: ChatMessage[]) {
    const id = conversation.current;
    chat.mutate(history, {
      onSuccess: (r) => {
        if (conversation.current !== id) return;
        setDemo(r.provider === "mock");
        setMessages((m) => [...m, { id: nextId.current++, role: "assistant", content: r.reply }]);
      },
    });
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || content.length > MAX_MESSAGE_CHARS || chat.isPending) return;
    const next: Bubble[] = [...messages, { id: nextId.current++, role: "user", content }];
    setMessages(next);
    setDraft("");
    ask(historyFor(next));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  }

  function newChat() {
    conversation.current += 1;
    chat.reset();
    setMessages([]);
    setDraft("");
    setDemo(false);
  }

  return (
    <section aria-label="Chat with the AI dental assistant" className="flex flex-col rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-strong text-white">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-brand-deep">Ask SmileCare AI</h2>
            <p className="text-xs text-slate-500">General dental information</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" onClick={newChat}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            New chat
          </Button>
        )}
      </div>

      <div role="log" aria-label="Conversation" aria-live="polite" className="h-[26rem] space-y-4 overflow-y-auto px-5 py-4">
        <Message role="assistant" content={GREETING} />
        {messages.map((m) => (
          <Message key={m.id} role={m.role} content={m.content} />
        ))}
        {chat.isPending && (
          <p role="status" className="text-sm text-slate-500">
            The assistant is typing…
          </p>
        )}
        {chat.isError && (
          <div role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">
            <p>{chatErrorMessage(chat.error)}</p>
            <Button variant="outline" className="mt-2" onClick={() => ask(historyFor(messages))}>
              Try again
            </Button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length === 0 && (
        <div className="px-5 pb-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full bg-brand-soft px-3 py-1.5 text-left text-sm text-brand-deep hover:bg-brand-soft/70 focus-visible:outline-2 focus-visible:outline-brand-deep"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="border-t border-slate-100 p-4">
        <label htmlFor="chat-input" className="sr-only">
          Your question
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="chat-input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your question…"
            aria-describedby="chat-count chat-hint"
            aria-invalid={tooLong}
            className={cn(inputClass, "resize-none")}
          />
          <Button type="submit" className="h-11 w-11 shrink-0 !p-0" disabled={!draft.trim() || tooLong || chat.isPending} aria-label="Send message">
            <Send className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-1 flex justify-between text-xs">
          <span id="chat-hint" className="text-slate-500">
            Enter to send, Shift+Enter for a new line. Chats are not saved. Please do not share personal or medical details.
          </span>
          <span id="chat-count" className={cn("tabular-nums", tooLong ? "font-semibold text-red-700" : "text-slate-500")}>
            {draft.length}/{MAX_MESSAGE_CHARS}
          </span>
        </div>
        {demo && <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">Demo mode: these answers are pre-written, not generated by a live AI model.</p>}
        <div className="mt-3">
          <Disclaimer />
        </div>
      </form>
    </section>
  );
}

function Message({ role, content }: { role: ChatMessage["role"]; content: string }) {
  const user = role === "user";
  return (
    <div className={cn("flex gap-2", user && "flex-row-reverse")}>
      <span aria-hidden="true" className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", user ? "bg-slate-200 text-slate-600" : "bg-brand-soft text-brand-deep")}>
        {user ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      {/* Rendered as plain text, never as HTML, so an answer can not inject markup. */}
      <p className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed", user ? "bg-brand-strong text-white" : "bg-slate-50 text-slate-800")}>
        <span className="sr-only">{user ? "You: " : "Assistant: "}</span>
        {content}
      </p>
    </div>
  );
}
