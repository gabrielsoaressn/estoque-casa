"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmtDate, fmtDaysLeft, fmtQty, fmtRate } from "./format";
import type { PredictedItem } from "./prediction";
import { CATEGORIES, UNITS, type ItemInput, type Unit } from "./types";

/**
 * Assistente do estoque: conversa com um modelo local via Ollama (http://localhost:11434).
 * O app é estático (web + APK), então o navegador fala direto com o Ollama — sem servidor no meio.
 * A cada pergunta enviamos um "retrato" atualizado do estoque como mensagem de sistema.
 */

/** Cadastro proposto pela IA — só entra no estoque quando o usuário confirma. */
export interface ItemDraft {
  id: string;
  input: ItemInput;
  status: "pending" | "added" | "discarded";
  /** Nome do item já existente com o mesmo nome, se houver. */
  duplicateOf?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  drafts?: ItemDraft[];
}

export interface AiSettings {
  url: string;
  model: string;
}

type Status = "idle" | "waiting" | "streaming";
type Health = "checking" | "online" | "offline";

const SETTINGS_KEY = "estoque-casa:ai";
const DEFAULT_SETTINGS: AiSettings = { url: "http://localhost:11434", model: "" };
const HISTORY_LIMIT = 12;

const STATUS_LABEL = { critical: "CRÍTICO", attention: "ATENÇÃO", ok: "tranquilo" } as const;

/** Texto compacto com tudo que o modelo precisa saber sobre o estoque agora. */
export function buildInventoryContext(data: PredictedItem[], now: number): string {
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  if (data.length === 0) return `Hoje é ${today}. O estoque está vazio: nenhum item cadastrado.`;

  const lines = data.map(({ item, prediction: p }) => {
    const parts = [
      `${item.name} [${item.category}]`,
      `tem ~${fmtQty(p.currentQuantity, item.unit)}`,
      `consumo ${fmtRate(p.dailyRate, item.unit)}`,
      `dura ${fmtDaysLeft(p.daysLeft, p.currentQuantity)}`,
    ];
    if (p.depletionDate) parts.push(`acaba ${fmtDate(p.depletionDate, now)}`);
    parts.push(`status ${STATUS_LABEL[p.status]}`, `compra padrão ${fmtQty(item.restockAmount, item.unit)}`);
    if (item.lastPurchaseAt) parts.push(`última compra ${fmtDate(new Date(item.lastPurchaseAt), now)}`);
    return `- ${parts.join("; ")}`;
  });

  const count = (s: string) => data.filter((d) => d.prediction.status === s).length;
  return [
    `Hoje é ${today}.`,
    `Resumo: ${data.length} itens — ${count("critical")} crítico(s) (<3 dias), ${count("attention")} em atenção (3–7 dias), ${count("ok")} tranquilo(s).`,
    `Itens (ordenados do que acaba primeiro):`,
    ...lines,
  ].join("\n");
}

const SYSTEM_PROMPT = `Você é o assistente do app "Estoque da Casa", que controla os itens de uma casa (fraldas, comida, limpeza etc.).
Responda SEMPRE em português do Brasil, de forma curta, calorosa e direta (no máximo ~6 linhas, use listas quando ajudar).
Use APENAS os dados do estoque abaixo. Se algo não estiver nos dados, diga que não sabe e sugira cadastrar o item.
As quantidades são estimativas: o app desconta o consumo diário desde a última contagem.
"Crítico" = acaba em menos de 3 dias; "Atenção" = 3 a 7 dias. Ao sugerir compras, use a "compra padrão" de cada item.
Destaque nomes de itens e números importantes em **negrito**.

CADASTRO DE ITENS: quando o usuário contar que comprou/tem algo ou pedir para cadastrar, CHAME a ferramenta cadastrar_item — uma chamada por item, na mesma resposta.
- Os únicos dados essenciais são: nome, quanto tem agora e o ritmo de consumo. Se o usuário informou esses três, CHAME A FERRAMENTA IMEDIATAMENTE, sem perguntar mais nada. Categoria você deduz; compra_padrao é opcional — NUNCA pergunte por ela.
- Só se faltar quantidade ou consumo, faça UMA pergunta curta, sugerindo um valor típico.
- NUNCA diga que cadastrou ou que gerou cartões sem ter chamado a ferramenta nesta resposta.
- Converta tudo para UMA unidade: "2 pacotes de 500 g" = 1000 g; "um fardo de 12 latas" = 12 un.
- Consumo: "usa X por dia" → consumo_quantidade = X, consumo_dias = 1. "X dura N dias/semanas" → consumo_quantidade = X (a quantidade TOTAL), consumo_dias = N em dias. Ex.: "5 kg de arroz dura 3 semanas" → 5 kg a cada 21 dias.
- Categorias: Despensa = comida e ingredientes (café, arroz, leite, açúcar); Bebidas = só bebidas prontas (água, suco, refrigerante, cerveja); Limpeza; Higiene; Bebê; Pet; Outros.
- Exemplos que JÁ têm tudo (chame a ferramenta direto, sem perguntas):
  "tenho 3 detergentes, gasto um por semana" → Detergente, Limpeza, 3 un, consumo 1 a cada 7 dias.
  "cadastra 30 fraldas G, o bebê usa 6 por dia" → Fralda G, Bebê, 30 un, consumo 6 a cada 1 dia.
  "comprei 2 pacotes de café de 500 g, usamos 50 g por dia" → Café, Despensa, 1000 g, consumo 50 a cada 1 dia.
- Itens já cadastrados não devem ser cadastrados de novo; avise que já existem.
- O app mostra um cartão para o usuário confirmar; depois de chamar a ferramenta, escreva só uma frase curta pedindo para conferir.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "cadastrar_item",
      description: "Propõe cadastrar UM novo item no estoque da casa. O usuário confirma no app antes de salvar.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome curto do produto, ex.: 'Café', 'Fralda G'" },
          categoria: { type: "string", enum: [...CATEGORIES] },
          unidade: { type: "string", enum: UNITS.map((u) => u.value) },
          quantidade: { type: "number", description: "Quanto tem em estoque agora, na unidade escolhida" },
          consumo_quantidade: { type: "number", description: "Quantidade consumida a cada 'consumo_dias' dias" },
          consumo_dias: { type: "number", description: "Período em dias do consumo" },
          compra_padrao: { type: "number", description: "Opcional: quanto costuma comprar de uma vez" },
        },
        required: ["nome", "categoria", "unidade", "quantidade", "consumo_quantidade", "consumo_dias"],
      },
    },
  },
];

interface ToolCall {
  function: { name: string; arguments: Record<string, unknown> | string };
}

const toNumber = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Valida e normaliza os argumentos da ferramenta — o modelo pode errar tipos e valores. */
export function draftFromToolCall(call: ToolCall, existing: string[]): ItemDraft | null {
  if (call.function.name !== "cadastrar_item") return null;
  let args = call.function.arguments;
  if (typeof args === "string") {
    try {
      args = JSON.parse(args) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  const name = String(args.nome ?? "").trim();
  if (!name) return null;
  const category = (CATEGORIES as readonly string[]).includes(String(args.categoria)) ? String(args.categoria) : "Outros";
  const unit = (UNITS.some((u) => u.value === args.unidade) ? args.unidade : "un") as Unit;
  const amount = toNumber(args.consumo_quantidade);
  const periodDays = toNumber(args.consumo_dias) || 1;
  const input: ItemInput = {
    name: name.charAt(0).toLocaleUpperCase("pt-BR") + name.slice(1),
    category,
    unit,
    quantity: toNumber(args.quantidade),
    consumption: { amount, periodDays },
    restockAmount: toNumber(args.compra_padrao) || Math.ceil((amount / periodDays) * 15) || 1,
  };
  const key = input.name.toLocaleLowerCase("pt-BR");
  const duplicateOf = existing.find((n) => n.toLocaleLowerCase("pt-BR") === key);
  return { id: uid(), input, status: "pending", duplicateOf };
}

/** Texto em que o modelo diz que gerou cartões ("confira os cartões…"), mesmo sem ter chamado a ferramenta. */
const CLAIMS_DRAFTS = /(confira|confirme|conferir|confirmar)\b.{0,40}\bcart(ão|ões|oes)|cart(ão|ões|oes)\b.{0,30}\b(apareceram|abaixo|ao lado|no app)/i;

const DRAFT_STATUS = { pending: "aguardando confirmação", added: "cadastrado", discarded: "descartado pelo usuário" };

/** Como uma resposta com cartões aparece no histórico enviado ao modelo. */
const historyContent = (m: ChatMessage) =>
  m.drafts?.length
    ? `${m.content}\n[Cadastros propostos: ${m.drafts.map((d) => `${d.input.name} (${DRAFT_STATUS[d.status]})`).join(", ")}]`
    : m.content;

const loadSettings = (): AiSettings => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const uid = () => Math.random().toString(36).slice(2, 10);
const trimUrl = (u: string) => u.trim().replace(/\/+$/, "");

/** Lê a resposta NDJSON do Ollama e entrega cada pedaço de texto conforme chega. */
async function streamOllama(
  settings: AiSettings,
  messages: { role: string; content: string }[],
  signal: AbortSignal,
  onToken: (t: string) => void,
  onToolCall: (c: ToolCall) => void,
) {
  // Sem Content-Type JSON de propósito: vira "simple request" e evita preflight de CORS.
  const res = await fetch(`${trimUrl(settings.url)}/api/chat`, {
    method: "POST",
    signal,
    body: JSON.stringify({
      model: settings.model,
      messages,
      tools: TOOLS,
      stream: true,
      think: false,
      keep_alive: "30m",
      options: { temperature: 0.1 },
    }),
  });
  if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const chunk = JSON.parse(line);
      if (chunk.error) throw new Error(chunk.error);
      if (chunk.message?.content) onToken(chunk.message.content);
      for (const call of chunk.message?.tool_calls ?? []) onToolCall(call);
    }
  }
}

export function useAssistant(data: PredictedItem[], now: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [settings, setSettingsState] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [health, setHealth] = useState<Health>("checking");
  const [models, setModels] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const contextRef = useRef({ data, now });
  contextRef.current = { data, now };

  useEffect(() => setSettingsState(loadSettings()), []);

  const setSettings = useCallback((next: AiSettings) => {
    setSettingsState(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* storage bloqueado */
    }
  }, []);

  /** Verifica se o Ollama responde e lista os modelos de chat (ignora os de embedding). */
  const checkHealth = useCallback(async () => {
    setHealth("checking");
    try {
      const res = await fetch(`${trimUrl(settings.url)}/api/tags`, { signal: AbortSignal.timeout(4000) });
      const json = (await res.json()) as { models: { name: string; capabilities?: string[] }[] };
      const chat = json.models
        .filter((m) => !/embed/i.test(m.name) && (!m.capabilities || m.capabilities.includes("completion")))
        .map((m) => m.name);
      setModels(chat);
      setHealth("online");
      if (chat.length && !chat.includes(settings.model)) setSettings({ ...settings, model: chat[0] });
    } catch {
      setModels([]);
      setHealth("offline");
    }
  }, [settings, setSettings]);

  useEffect(() => {
    checkHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.url]);

  // Pré-aquece o modelo na GPU assim que estiver online — a 1ª resposta fica bem mais rápida.
  useEffect(() => {
    if (health !== "online" || !settings.model) return;
    fetch(`${trimUrl(settings.url)}/api/generate`, {
      method: "POST",
      body: JSON.stringify({ model: settings.model, keep_alive: "30m" }),
    }).catch(() => {});
  }, [health, settings.url, settings.model]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || status !== "idle" || !settings.model) return;

      const user: ChatMessage = { id: uid(), role: "user", content: question };
      const reply: ChatMessage = { id: uid(), role: "assistant", content: "" };
      const history = [...messages.filter((m) => !m.error), user].slice(-HISTORY_LIMIT);
      setMessages((prev) => [...prev, user, reply]);
      setStatus("waiting");

      const controller = new AbortController();
      abortRef.current = controller;
      const { data: d, now: n } = contextRef.current;
      const payload = [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nDADOS DO ESTOQUE:\n${buildInventoryContext(d, n)}` },
        ...history.map((m) => ({ role: m.role, content: historyContent(m) })),
      ];

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((prev) => prev.map((m) => (m.id === reply.id ? fn(m) : m)));

      const existing = d.map((x) => x.item.name);
      let said = "";
      let drafted = 0;
      const onToolCall = (call: ToolCall) => {
        const draft = draftFromToolCall(call, existing);
        if (!draft) return;
        drafted++;
        existing.push(draft.input.name);
        patch((m) => ({ ...m, drafts: [...(m.drafts ?? []), draft] }));
      };
      try {
        await streamOllama(
          settings,
          payload,
          controller.signal,
          (token) => {
            said += token;
            setStatus("streaming");
            patch((m) => ({ ...m, content: m.content + token }));
          },
          onToolCall,
        );
        // Autocorreção: modelos pequenos às vezes ANUNCIAM os cartões sem chamar a ferramenta.
        // Nesse caso pedimos, em segundo plano, só as chamadas que faltaram.
        if (drafted === 0 && CLAIMS_DRAFTS.test(said)) {
          setStatus("waiting");
          await streamOllama(
            settings,
            [
              ...payload,
              { role: "assistant", content: said },
              {
                role: "user",
                content:
                  "Você mencionou os cartões, mas não chamou a ferramenta cadastrar_item. Chame-a agora, uma vez para cada item com os dados que eu já informei. Não escreva texto.",
              },
            ],
            controller.signal,
            () => {},
            onToolCall,
          );
        }
        // Só chamou a ferramenta, sem texto: escreve uma frase padrão.
        patch((m) =>
          m.drafts?.length && !m.content.trim()
            ? { ...m, content: m.drafts.length > 1 ? "Preparei os cadastros — confira e confirme:" : "Preparei o cadastro — confira e confirme:" }
            : m,
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setHealth((h) => (err instanceof TypeError ? "offline" : h));
          patch((m) => ({
            ...m,
            error: true,
            content:
              err instanceof TypeError
                ? "Não consegui falar com o Ollama. Confira se ele está rodando e o endereço nas configurações."
                : `O modelo respondeu com erro: ${(err as Error).message}`,
          }));
        }
      } finally {
        abortRef.current = null;
        setStatus("idle");
      }
    },
    [messages, settings, status],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const resolveDraft = useCallback((draftId: string, status: ItemDraft["status"]) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.drafts?.some((d) => d.id === draftId)
          ? { ...m, drafts: m.drafts.map((d) => (d.id === draftId ? { ...d, status } : d)) }
          : m,
      ),
    );
  }, []);
  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, status, settings, setSettings, health, models, checkHealth, send, stop, clear, resolveDraft };
}

export type Assistant = ReturnType<typeof useAssistant>;
