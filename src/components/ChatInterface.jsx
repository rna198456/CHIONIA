import { useState, useRef, useEffect } from "react";
import Avatar from "./Avatar";
import LogPanel from "./LogPanel";
import {
  SYSTEM_PROMPT, MODE_PROMPTS, MODES, GENERATION_CONFIG,
  SUGGESTIONS, WELCOME_MESSAGE, GROQ_ENDPOINT, GROQ_MODELS,
  SHEETS_ENDPOINT,
} from "../data/chionPrompt";
import { logInteraction, clearApiKey } from "../utils/storage";
import { sendToRemoteLog } from "../utils/remoteLog";

const C = {
  bg: "#0e0e0e", surface: "#161616", card: "#202020",
  border: "#2d2d2d", muted: "#666", text: "#e2e0d8", textDim: "#8a8880",
  amber: "#c47c30", amberDeep: "#7a441a", amberText: "#fde8c0",
};

// ── Modelo activo en sesión ───────────────────────────────────────────────────
const MODEL_KEY = "chion_model";
const getSavedModel = () => { try { return sessionStorage.getItem(MODEL_KEY) || null; } catch { return null; } };
const saveModel    = (m) => { try { sessionStorage.setItem(MODEL_KEY, m); } catch {} };

// ── Barras de carga ───────────────────────────────────────────────────────────
function AudioBars() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 20 }}>
      {[0,1,2,3,4].map((i) => (
        <span key={i} style={{
          width: 3, borderRadius: 2, background: C.amber,
          animation: `bar${i+1} 1.1s ease-in-out infinite`,
          animationDelay: `${i * 110}ms`,
        }} />
      ))}
    </div>
  );
}

// ── Llamada a Groq con fallback de modelos ────────────────────────────────────
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
        stream:      false, // sin streaming para simplicidad
      }),
    });

    if (res.status === 404) continue;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || "";
      if (res.status === 401) throw new Error("API key inválida. Usá el botón 🔑 para cambiarla.");
      if (res.status === 429) throw new Error("Límite de requests alcanzado. Esperá un minuto e intentá de nuevo.");
      throw new Error(`Error ${res.status}: ${msg || "Error de la API."}`);
    }

    saveModel(model);
    const reply = data?.choices?.[0]?.message?.content ?? "";
    if (!reply) throw new Error("La API respondió vacío. Intentá de nuevo.");
    return { reply, model };
  }

  throw new Error("Ningún modelo de Groq disponible. Verificá tu key en console.groq.com");
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ChatInterface({ apiKey, onLogout }) {
  const DEFAULT_MODE   = MODES[0];
  const [activeMode,   setActiveMode]   = useState(DEFAULT_MODE);
  const [messages,     setMessages]     = useState([WELCOME_MESSAGE]);
  const [input,        setInput]        = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [showPanel,    setShowPanel]    = useState(false);
  const [activeModel,  setActiveModel]  = useState(getSavedModel() || "");
  const bottomRef    = useRef(null);
  const textareaRef  = useRef(null);
  const abortRef     = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generating]);

  // Cambio de modo → nueva conversación
  const handleModeChange = (mode) => {
    if (mode.id === activeMode.id) return;
    setActiveMode(mode);
    setInput("");
    abortRef.current = true;
    setGenerating(false);

    // Mensaje de bienvenida específico por modo
    const modeWelcome = {
      consulta:    WELCOME_MESSAGE,
      analisis:    { role: "assistant", content: "Bien. Decime qué película y qué escena estás mirando, y la analizo con mis herramientas. Podés ser tan detallado como quieras — cuanto más describís lo que ves y escuchás, más preciso puedo ser." },
      socratico:   { role: "assistant", content: "Empezemos. Pero aviso: no voy a darte las respuestas. Voy a preguntarte. ¿Sobre qué concepto o escena querés trabajar?" },
      ocultadores: { role: "assistant", content: "Vamos a analizar una escena juntos, siguiendo el método que describo en el capítulo 10 de mi libro.\n\nPaso 1 de 6 — ¿Qué película y qué escena vas a analizar? Asegurate de tenerla disponible para ver mientras trabajamos." },
    };

    setMessages([modeWelcome[mode.id] || WELCOME_MESSAGE]);
    if (textareaRef.current) textareaRef.current.style.height = "46px";
  };

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

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      // System prompt = base + extensión del modo activo
      const modeExtra = MODE_PROMPTS[activeMode.id] || "";
      const systemContent = SYSTEM_PROMPT + modeExtra;

      const history = updated
        .slice(1)
        .slice(-10)
        .map(({ role, content }) => ({
          role: role === "model" ? "assistant" : role,
          content,
        }));

      const apiMessages = [
        { role: "system", content: systemContent },
        ...history,
      ];

      const { reply, model } = await callGroq(apiKey, apiMessages);
      if (model !== activeModel) setActiveModel(model);

      if (!abortRef.current) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: reply };
          return next;
        });
        logInteraction(txt, reply);
        sendToRemoteLog(txt, reply, model);
      }

    } catch (err) {
      if (!abortRef.current) {
        console.error("[Groq]", err);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: `⚠ ${err.message}` };
          return next;
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    abortRef.current = true;
    handleModeChange(activeMode);
    setGenerating(false);
  };

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
    ta.style.height = Math.min(ta.scrollHeight, 130) + "px";
  };

  const showSuggestions = messages.length === 1
    && !generating
    && activeMode.id === "consulta";

  // Placeholder dinámico por modo
  const placeholders = {
    consulta:    "Preguntale a Chion sobre su obra y conceptos…",
    analisis:    "Describí la película y la escena que querés analizar…",
    socratico:   "Escribí lo que querés explorar — Chion te va a preguntar…",
    ocultadores: "Respondé a Chion para continuar con el siguiente paso…",
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif",
    }}>

      {/* ── Header ── */}
      <header style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "13px 18px", display: "flex", alignItems: "center",
        gap: 12, position: "sticky", top: 0, zIndex: 10,
      }}>
        <Avatar size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#f0ece0" }}>Michel Chion</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {activeModel || "Groq AI"} · $0
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: C.muted }}>Conectado</span>
          </div>
          <button onClick={() => setShowPanel(true)} style={{
            fontSize: 11, color: C.amber, background: "#1c1008",
            border: `1px solid ${C.amberDeep}`, borderRadius: 8,
            padding: "5px 10px", cursor: "pointer", fontFamily: "inherit",
          }}>📊 Registro</button>
          <button onClick={reset} style={{
            fontSize: 11, color: C.muted, background: C.card,
            border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "5px 10px", cursor: "pointer", fontFamily: "inherit",
          }}>Reiniciar</button>
          <button onClick={handleLogout} title="Cambiar API key" style={{
            fontSize: 14, color: "#555", background: "transparent",
            border: "none", cursor: "pointer", padding: "4px",
          }}>🔑</button>
        </div>
      </header>

      {showPanel && <LogPanel onClose={() => setShowPanel(false)} />}

      {/* ── Selector de modos ── */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "8px 14px", overflowX: "auto",
        display: "flex", gap: 6, flexShrink: 0,
      }}>
        {MODES.map((mode) => {
          const isActive = activeMode.id === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode)}
              title={mode.desc}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20, whiteSpace: "nowrap",
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                fontFamily: "inherit", cursor: "pointer",
                border: `1px solid ${isActive ? mode.border : C.border}`,
                background: isActive ? mode.bg : "transparent",
                color: isActive ? mode.color : C.muted,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = mode.border;
                  e.currentTarget.style.color = mode.color;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.muted;
                }
              }}
            >
              <i className={`ti ${mode.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* ── Mensajes ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 14px 8px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Badge del modo activo */}
          {activeMode.id !== "consulta" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 20, alignSelf: "center",
              background: activeMode.bg, border: `1px solid ${activeMode.border}`,
              fontSize: 11, color: activeMode.color,
            }}>
              <i className={`ti ${activeMode.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
              {activeMode.label}
            </div>
          )}

          {/* Burbujas */}
          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start", gap: 10,
            }}>
              {m.role !== "user" && <Avatar size={30} />}
              <div style={{
                maxWidth: "78%", padding: "11px 15px",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap",
                background: m.role === "user" ? C.amberDeep : C.card,
                color: m.role === "user" ? C.amberText : C.text,
                border: m.role !== "user" ? `1px solid ${C.border}` : "none",
              }}>
                {m.content === "" && generating && i === messages.length - 1
                  ? <AudioBars />
                  : m.content}
              </div>
            </div>
          ))}

          {/* Sugerencias (solo en modo consulta) */}
          {showSuggestions && (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Preguntas sugeridas
                </span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s)} style={{
                    textAlign: "left", fontSize: 12, background: C.surface,
                    border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: "9px 12px", color: C.textDim,
                    cursor: "pointer", lineHeight: 1.5, fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textDim; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{
        background: C.surface, borderTop: `1px solid ${C.border}`,
        padding: "12px 14px 14px", position: "sticky", bottom: 0,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleChange}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={placeholders[activeMode.id]}
              rows={1}
              style={{
                flex: 1, background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: "10px 14px", fontSize: 14,
                color: C.text, resize: "none", outline: "none",
                minHeight: 46, maxHeight: 130, lineHeight: 1.6,
                fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || generating}
              style={{
                background: input.trim() && !generating ? C.amber : C.card,
                color: input.trim() && !generating ? C.amberText : C.muted,
                border: "none", borderRadius: 12, padding: "0 18px",
                fontSize: 13, fontWeight: 600, height: 46,
                cursor: input.trim() && !generating ? "pointer" : "default",
                flexShrink: 0, fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              {generating ? "…" : "Enviar"}
            </button>
          </div>
          <div style={{ textAlign: "center", fontSize: 10, color: "#3a3a3a", marginTop: 8 }}>
            Simulación académica · «La Audiovisión» (Paidós, 1993) · Consultas registradas localmente
          </div>
        </div>
      </div>

      {/* Tabler Icons CDN */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.0.0/dist/tabler-icons.min.css" />

      <style>{`
        @keyframes bar1 { 0%,100%{height:5px}  50%{height:18px} }
        @keyframes bar2 { 0%,100%{height:14px} 50%{height:6px}  }
        @keyframes bar3 { 0%,100%{height:7px}  50%{height:22px} }
        @keyframes bar4 { 0%,100%{height:18px} 50%{height:8px}  }
        @keyframes bar5 { 0%,100%{height:9px}  50%{height:16px} }
        textarea::placeholder { color: #444; }
        textarea:focus { border-color: #c47c30 !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0e0e0e; }
        ::-webkit-scrollbar-thumb { background: #2d2d2d; border-radius: 3px; }
      `}</style>
    </div>
  );
}
