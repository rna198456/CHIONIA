import { useState, useRef, useEffect } from "react";
import Avatar from "./Avatar";
import LogPanel from "./LogPanel";
import { T } from "../utils/theme";
import {
  SYSTEM_PROMPT, MODE_PROMPTS, MODES, GENERATION_CONFIG,
  SUGGESTIONS, WELCOME_MESSAGE, GROQ_ENDPOINT, GROQ_MODELS,
} from "../data/chionPrompt";
import { logInteraction, clearApiKey } from "../utils/storage";
import { sendToRemoteLog } from "../utils/remoteLog";

const MODEL_KEY = "chion_model";
const getSavedModel = () => { try { return sessionStorage.getItem(MODEL_KEY) || null; } catch { return null; } };
const saveModel    = (m) => { try { sessionStorage.setItem(MODEL_KEY, m); } catch {} };

// ── Dot loader ────────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: T.amber, opacity: 0.8,
          animation: `dot-bounce 1.2s ease-in-out infinite`,
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </div>
  );
}

// ── Groq call ────────────────────────────────────────────────────────────────
async function callGroq(apiKey, messages) {
  const saved  = getSavedModel();
  const models = saved ? [saved, ...GROQ_MODELS.filter(m => m !== saved)] : GROQ_MODELS;

  for (const model of models) {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature: GENERATION_CONFIG.temperature,
        max_tokens:  GENERATION_CONFIG.max_tokens,
        top_p:       GENERATION_CONFIG.top_p,
        stream:      false,
      }),
    });

    if (res.status === 404) continue;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || "";
      if (res.status === 401) throw new Error("API key inválida. Usá el botón 🔑 para cambiarla.");
      if (res.status === 429) throw new Error("Límite de requests alcanzado. Esperá un minuto.");
      throw new Error(`Error ${res.status}: ${msg || "Error de la API."}`);
    }

    saveModel(model);
    const reply = data?.choices?.[0]?.message?.content ?? "";
    if (!reply) throw new Error("Respuesta vacía. Intentá de nuevo.");
    return { reply, model };
  }
  throw new Error("Ningún modelo disponible. Verificá tu key en console.groq.com");
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatInterface({ apiKey, onLogout }) {
  const DEFAULT_MODE  = MODES[0];
  const [activeMode,  setActiveMode]  = useState(DEFAULT_MODE);
  const [messages,    setMessages]    = useState([WELCOME_MESSAGE]);
  const [input,       setInput]       = useState("");
  const [generating,  setGenerating]  = useState(false);
  const [showPanel,   setShowPanel]   = useState(false);
  const [activeModel, setActiveModel] = useState(getSavedModel() || "");
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const abortRef    = useRef(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Exportar conversación completa como TXT ──────────────────────────────
  const exportConversation = () => {
    const lines = [
      "CHIONIA — Conversación con Michel Chion",
      `Fecha: ${new Date().toLocaleString("es-AR")}`,
      `Modo: ${activeMode.label}`,
      "─".repeat(60),
      "",
      ...messages.map(m => {
        const rol = m.role === "user" ? "ALUMNO" : "MICHEL CHION";
        return `[${rol}]\n${m.content}\n`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `chion-conversacion-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Cambio de modo ───────────────────────────────────────────────────────
  const handleModeChange = (mode) => {
    if (mode.id === activeMode.id) return;
    setActiveMode(mode);
    setInput("");
    abortRef.current = true;
    setGenerating(false);
    const welcomes = {
      consulta:    WELCOME_MESSAGE,
      analisis:    { role: "assistant", content: "Decime qué película y qué escena estás mirando. Cuanto más describís lo que ves y escuchás, más preciso puedo ser en el análisis." },
      socratico:   { role: "assistant", content: "Bien. Pero aviso: no voy a darte las respuestas directamente. Voy a preguntarte.\n\n¿Sobre qué concepto o escena querés trabajar?" },
      ocultadores: { role: "assistant", content: "Vamos a analizar una escena juntos, siguiendo el método del capítulo 10 de mi libro.\n\nPaso 1 de 6 — ¿Qué película y qué escena vas a analizar? Tenela disponible para ver mientras trabajamos." },
    };
    setMessages([welcomes[mode.id] || WELCOME_MESSAGE]);
    if (textareaRef.current) textareaRef.current.style.height = "46px";
  };

  // ── Enviar mensaje ───────────────────────────────────────────────────────
  const send = async (override) => {
    const txt = (override ?? input).trim();
    if (!txt || generating) return;

    const userMsg = { role: "user", content: txt };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "46px";
    setGenerating(true);
    abortRef.current = false;
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const systemContent = SYSTEM_PROMPT + (MODE_PROMPTS[activeMode.id] || "");
      const history = updated.slice(1).slice(-10).map(({ role, content }) => ({
        role: role === "model" ? "assistant" : role, content,
      }));

      const { reply, model } = await callGroq(apiKey, [
        { role: "system", content: systemContent },
        ...history,
      ]);

      if (model !== activeModel) setActiveModel(model);
      if (!abortRef.current) {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: reply };
          return next;
        });
        logInteraction(txt, reply);
        sendToRemoteLog(txt, reply, model);
      }
    } catch (err) {
      if (!abortRef.current) {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: `⚠ ${err.message}` };
          return next;
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => { abortRef.current = true; handleModeChange(activeMode); setGenerating(false); };
  const handleLogout = () => {
    if (!confirm("¿Eliminar tu API key?")) return;
    clearApiKey();
    try { sessionStorage.removeItem(MODEL_KEY); } catch {}
    onLogout();
  };
  const handleChange = (e) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const placeholders = {
    consulta:    "Preguntale a Chion sobre su obra…",
    analisis:    "Describí la película y la escena que querés analizar…",
    socratico:   "Escribí lo que querés explorar…",
    ocultadores: "Respondé para continuar con el siguiente paso…",
  };

  const showSuggestions = messages.length === 1 && !generating && activeMode.id === "consulta";

  return (
    <div style={{
      minHeight: "100vh", background: T.bgBase, color: T.textPrim,
      display: "flex", flexDirection: "column", fontFamily: T.fontBase,
    }}>

      {/* ── Header ── */}
      <header style={{
        background: T.bgSurface, borderBottom: `1px solid ${T.borderSub}`,
        padding: "0 20px", height: 56,
        display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 20, flexShrink: 0,
      }}>
        <Avatar size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrim, letterSpacing: "-0.01em" }}>
            Michel Chion
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
            {activeModel ? activeModel : "Groq AI"} · {activeMode.label}
          </div>
        </div>

        {/* Acciones del header */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Indicador online */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "block" }} />
            <span style={{ fontSize: 11, color: T.textMuted }}>En línea</span>
          </div>

          {[
            { label: "Exportar", icon: "⬇", onClick: exportConversation, title: "Descargar conversación completa" },
            { label: "Registro", icon: "📊", onClick: () => setShowPanel(true), title: "Ver registro de sesión" },
            { label: "Reiniciar", icon: null, onClick: reset, title: "Nueva conversación" },
          ].map((btn, i) => (
            <button key={i} onClick={btn.onClick} title={btn.title} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "0 12px", height: 32, borderRadius: T.radiusMd,
              border: `1px solid ${T.borderSub}`, background: T.bgCard,
              color: T.textSec, fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: T.fontBase, transition: T.transition,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderStr; e.currentTarget.style.color = T.textPrim; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderSub; e.currentTarget.style.color = T.textSec; }}>
              {btn.icon && <span>{btn.icon}</span>}
              {btn.label}
            </button>
          ))}

          <button onClick={handleLogout} title="Cambiar API key" style={{
            padding: "0 8px", height: 32, border: `1px solid ${T.borderSub}`,
            background: "transparent", borderRadius: T.radiusMd,
            color: T.textMuted, fontSize: 14, cursor: "pointer",
          }}>🔑</button>
        </div>
      </header>

      {showPanel && <LogPanel onClose={() => setShowPanel(false)} />}

      {/* ── Selector de modos ── */}
      <div style={{
        background: T.bgSurface, borderBottom: `1px solid ${T.borderSub}`,
        padding: "0 20px", height: 44,
        display: "flex", alignItems: "center", gap: 4,
        overflowX: "auto", flexShrink: 0,
      }}>
        {MODES.map((mode) => {
          const isActive = activeMode.id === mode.id;
          return (
            <button key={mode.id} onClick={() => handleModeChange(mode)} title={mode.desc} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "0 14px", height: 30, borderRadius: T.radiusFull,
              whiteSpace: "nowrap", flexShrink: 0,
              fontSize: 12, fontWeight: isActive ? 600 : 400,
              fontFamily: T.fontBase, cursor: "pointer",
              border: `1px solid ${isActive ? mode.border : "transparent"}`,
              background: isActive ? mode.bg : "transparent",
              color: isActive ? mode.color : T.textSec,
              transition: T.transition,
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = T.bgCard; e.currentTarget.style.color = T.textPrim; }}}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textSec; }}}>
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* ── Mensajes ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Indicador de modo activo */}
          {activeMode.id !== "consulta" && (
            <div style={{
              alignSelf: "center", padding: "5px 14px",
              borderRadius: T.radiusFull,
              border: `1px solid ${activeMode.border}`,
              background: activeMode.bg,
              fontSize: 11, color: activeMode.color, fontWeight: 500,
            }}>
              {activeMode.label}
            </div>
          )}

          {/* Burbujas */}
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const isLoading = m.content === "" && generating && i === messages.length - 1;
            return (
              <div key={i} style={{
                display: "flex", gap: 10,
                justifyContent: isUser ? "flex-end" : "flex-start",
                alignItems: "flex-start",
              }}>
                {!isUser && <Avatar size={28} />}
                <div style={{
                  maxWidth: "76%",
                  padding: isLoading ? "14px 16px" : "12px 16px",
                  borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                  fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap",
                  background: isUser ? T.amberDim : T.bgCard,
                  color: isUser ? T.amberText : T.textPrim,
                  border: !isUser ? `1px solid ${T.borderSub}` : "none",
                }}>
                  {isLoading ? <ThinkingDots /> : m.content}
                </div>
              </div>
            );
          })}

          {/* Preguntas sugeridas */}
          {showSuggestions && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 11, color: T.textMuted, textAlign: "center", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Preguntas sugeridas
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s)} style={{
                    textAlign: "left", fontSize: 12, lineHeight: 1.55,
                    background: T.bgCard, border: `1px solid ${T.borderSub}`,
                    borderRadius: T.radiusMd, padding: "10px 14px",
                    color: T.textSec, cursor: "pointer", fontFamily: T.fontBase,
                    transition: T.transition,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.amber; e.currentTarget.style.color = T.textPrim; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderSub; e.currentTarget.style.color = T.textSec; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} style={{ height: 16 }} />
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{
        background: T.bgSurface, borderTop: `1px solid ${T.borderSub}`,
        padding: "14px 20px 16px", flexShrink: 0,
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: T.bgCard, border: `1px solid ${T.borderMid}`,
            borderRadius: 14, padding: "10px 10px 10px 16px",
            transition: T.transition,
          }}
          onFocusCapture={e => e.currentTarget.style.borderColor = T.amber}
          onBlurCapture={e => e.currentTarget.style.borderColor = T.borderMid}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleChange}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={placeholders[activeMode.id]}
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 14, color: T.textPrim, resize: "none",
                minHeight: 26, maxHeight: 120, lineHeight: 1.6,
                fontFamily: T.fontBase, padding: 0,
              }}
            />
            <button onClick={() => send()} disabled={!input.trim() || generating} style={{
              width: 38, height: 38, borderRadius: 10, border: "none",
              background: input.trim() && !generating ? T.amber : T.bgInset,
              color: input.trim() && !generating ? "#fff" : T.textMuted,
              cursor: input.trim() && !generating ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0, transition: T.transition,
            }}>
              {generating ? "…" : "↑"}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 10, color: T.textMuted, marginTop: 8 }}>
            Basado en «La Audiovisión» (Paidós, 1993) · Consultas registradas localmente
          </p>
        </div>
      </div>

      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        textarea::placeholder { color: ${T.textMuted}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.borderMid}; border-radius: 4px; }
      `}</style>
    </div>
  );
}
