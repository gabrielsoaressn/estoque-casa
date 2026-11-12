"use client";

import {
  ArrowUp,
  RotateCcw,
  Settings2,
  Sparkles,
  Square,
  WifiOff,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Assistant, ChatMessage, ItemDraft } from "@/lib/assistant";
import { DraftCard } from "./DraftCard";
import { Markdown } from "./Markdown";
import { easeOutExpo, spring } from "./motion";

const SUGGESTIONS = [
  "Quero cadastrar um item",
  "O que acaba essa semana?",
  "Monte minha lista de compras",
  "O que devo comprar primeiro?",
];

interface DraftActions {
  now: number;
  onConfirmDraft: (d: ItemDraft) => void;
  onEditDraft: (d: ItemDraft) => void;
  onDiscardDraft: (d: ItemDraft) => void;
}

export function AssistantChat({
  ai,
  hasItems,
  ...actions
}: {
  ai: Assistant;
  hasItems: boolean;
} & DraftActions) {
  const [text, setText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = ai.status !== "idle";
  const canSend = ai.health === "online" && !!ai.settings.model && !busy;

  const last = ai.messages.at(-1);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ai.messages.length, last?.content, last?.drafts?.length]);

  // A primeira resposta pode demorar enquanto o modelo carrega na GPU.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (ai.status !== "waiting") return setSlow(false);
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [ai.status]);

  const submit = (q: string) => {
    if (!q.trim() || !canSend) return;
    ai.send(q);
    setText("");
  };

  return (
    <div className="pb-40">
      {/* Status do modelo */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-surface py-2 pr-3.5 pl-3 text-sm font-semibold"
          aria-expanded={showSettings}
        >
          <span className="relative flex h-2.5 w-2.5">
            {ai.health === "online" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-ok opacity-60" />
            )}
            <span
              className={`relative h-2.5 w-2.5 rounded-full ${ai.health === "online" ? "bg-ok" : ai.health === "offline" ? "bg-crit" : "bg-warn"}`}
            />
          </span>
          <span className="truncate">
            {ai.health === "online"
              ? ai.settings.model || "sem modelo"
              : ai.health === "offline"
                ? "IA offline"
                : "conectando…"}
          </span>
          <Settings2 className="h-4 w-4 shrink-0 text-muted" />
        </button>
        {ai.messages.length === 0 && (
          <span className="text-xs text-muted">
            roda nesta máquina · privado
          </span>
        )}
        {ai.messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.9, rotate: -90 }}
            onClick={ai.clear}
            aria-label="Nova conversa"
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2"
          >
            <RotateCcw className="h-4 w-4" />
          </motion.button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {(showSettings || ai.health === "offline") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <SettingsPanel ai={ai} />
          </motion.div>
        )}
      </AnimatePresence>

      {ai.messages.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
          className="pt-6"
        >
          <motion.div
            animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="mb-5 grid h-14 w-14 place-items-center rounded-[20px] bg-accent text-accent-ink shadow-[0_16px_32px_-12px_var(--glow)]"
          >
            <Sparkles className="h-7 w-7" strokeWidth={1.75} />
          </motion.div>
          <h2 className="font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.04em]">
            Pergunte ou cadastre conversando.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-muted">
            {hasItems
              ? "Eu leio o estoque em tempo real: o que tem, quanto dura e o que comprar. Ou só me diga o que você comprou que eu cadastro."
              : "Seu estoque está vazio. Me conte o que tem em casa — “comprei 2 pacotes de café de 500 g, usamos 50 g por dia” — que eu preparo os cadastros."}
          </p>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.06, delayChildren: 0.2 },
              },
            }}
            className="mt-6 flex flex-wrap gap-2"
          >
            {SUGGESTIONS.map((s) => (
              <motion.button
                key={s}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0 },
                }}
                whileTap={{ scale: 0.95 }}
                disabled={!canSend}
                onClick={() => submit(s)}
                className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-40"
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {ai.messages.map((m) => (
              <Bubble
                key={m.id}
                m={m}
                streaming={m === last && ai.status === "streaming"}
                actions={actions}
              />
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {ai.status === "waiting" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 pl-1 text-sm text-muted"
              >
                <TypingDots />
                <AnimatePresence>
                  {slow && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      carregando o modelo… a 1ª resposta leva uns segundos
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <div ref={endRef} className="scroll-mb-44" />

      {/* Campo de mensagem, flutuando acima do dock (portal: a aba animada tem transform, que quebraria o fixed) */}
      {createPortal(
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] z-30 px-4"
        >
          <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-full border border-line bg-surface/90 p-1.5 pl-5 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.35)] backdrop-blur-xl focus-within:border-ink">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                ai.health === "online"
                  ? "Pergunte ou diga o que comprou…"
                  : "Conecte a IA para conversar"
              }
              disabled={ai.health !== "online"}
              enterKeyHint="send"
              aria-label="Mensagem para o assistente"
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted focus-visible:outline-none disabled:opacity-60"
            />
            <AnimatePresence mode="popLayout" initial={false}>
              {busy ? (
                <motion.button
                  key="stop"
                  type="button"
                  onClick={ai.stop}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={spring}
                  aria-label="Parar resposta"
                  className="grid h-11 w-11 place-items-center rounded-full bg-ink text-bg"
                >
                  <Square className="h-4 w-4 fill-current" />
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  type="submit"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  whileTap={{ scale: 0.88 }}
                  transition={spring}
                  disabled={!text.trim() || !canSend}
                  aria-label="Enviar"
                  className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-ink transition-opacity disabled:opacity-35"
                >
                  <ArrowUp className="h-5 w-5" strokeWidth={2.75} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </form>,
        document.body,
      )}
    </div>
  );
}

function Bubble({
  m,
  streaming,
  actions,
}: {
  m: ChatMessage;
  streaming: boolean;
  actions: DraftActions;
}) {
  const mine = m.role === "user";
  if (!mine && !m.content && !m.drafts?.length) return null;
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12, scale: 0.97, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={spring}
      className={`flex flex-col gap-2 ${mine ? "items-end" : "items-start"}`}
    >
      {(mine || m.content) && (
      <div
        className={`max-w-[86%] px-4 py-3 text-[15px] leading-relaxed ${
          mine
            ? "rounded-[22px] rounded-br-md bg-ink text-bg"
            : m.error
              ? "rounded-[22px] rounded-bl-md border border-crit/30 bg-crit/10 text-crit"
              : "rounded-[22px] rounded-bl-md border border-line bg-surface"
        }`}
      >
        {mine ? m.content : <Markdown text={m.content} />}
        {streaming && (
          <motion.span
            aria-hidden
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-full bg-accent"
          />
        )}
      </div>
      )}
      {m.drafts?.map((d) => (
        <div key={d.id} className="w-full max-w-[92%]">
          <DraftCard
            draft={d}
            now={actions.now}
            onConfirm={() => actions.onConfirmDraft(d)}
            onEdit={() => actions.onEditDraft(d)}
            onDiscard={() => actions.onDiscardDraft(d)}
          />
        </div>
      ))}
    </motion.div>
  );
}

function TypingDots() {
  return (
    <span
      className="flex gap-1 rounded-full border border-line bg-surface px-3.5 py-3"
      aria-label="Pensando"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-ink"
          animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

function SettingsPanel({ ai }: { ai: Assistant }) {
  const [url, setUrl] = useState(ai.settings.url);
  useEffect(() => setUrl(ai.settings.url), [ai.settings.url]);
  const field =
    "w-full rounded-2xl border border-line bg-surface-2/60 px-4 py-3 text-sm outline-none focus:border-ink focus-visible:outline-none";

  return (
    <div className="mb-5 space-y-3 rounded-[24px] border border-line bg-surface p-4">
      {ai.health === "offline" && (
        <div className="flex gap-3 text-sm">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-crit" />
          <div>
            <p className="font-semibold">
              Não encontrei o Ollama em {ai.settings.url}
            </p>
            <p className="mt-1 text-muted">
              No computador, rode{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">
                ollama serve
              </code>
              . No celular, use o IP do PC (ex.: http://192.168.0.10:11434) e
              inicie o Ollama com{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">
                OLLAMA_HOST=0.0.0.0
              </code>
              .
            </p>
          </div>
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ai.setSettings({ ...ai.settings, url: url.trim() });
        }}
      >
        <input
          aria-label="Endereço do Ollama"
          className={field}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          inputMode="url"
        />
        <button
          type="submit"
          onClick={() => url.trim() === ai.settings.url && ai.checkHealth()}
          className="shrink-0 rounded-2xl bg-ink px-4 text-sm font-semibold text-bg"
        >
          Conectar
        </button>
      </form>
      {ai.models.length > 0 && (
        <select
          aria-label="Modelo"
          className={field}
          value={ai.settings.model}
          onChange={(e) =>
            ai.setSettings({ ...ai.settings, model: e.target.value })
          }
        >
          {ai.models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
