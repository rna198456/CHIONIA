import { useState, useRef, useEffect } from "react";
import Avatar from "./Avatar";
import LogPanel from "./LogPanel";
import {
  SYSTEM_PROMPT, GENERATION_CONFIG, SUGGESTIONS,
  WELCOME_MESSAGE, GROQ_ENDPOINT, GROQ_MODELS
} from "../data/chionPrompt";
import { logInteraction, clearApiKey } from "../utils/storage";

const C = {
  bg: "#0e0e0e", surface: "#161616", card: "#202020",
  border: "#2d2d2d", muted: "#666", text: "#e2e0d8", textDim: "#8a8880",
  amber: "#c47c30", amberDeep: "#7a441a", amberText: "#fde8c0",
};

// Modelo activo guardado en sessionStorage
const MODEL_KEY = "chion_model";
const getSavedModel = () => { try { return sessionStorage.getItem(MODEL_KEY) || null; } catch { return null; } };
const saveModel    = (m) => { try { sessionStorage.setItem(MODEL_KEY, m); } catch {} };

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

/**
 * Llama a Groq con streaming SSE (formato OpenAI-compatible).
 * Prueba modelos en orden hasta que uno responde 200.
 * onToken(str): callback llamado con cada token nuevo.
 */
async function callGroq(apiKey, messages, onToken) {
  const saved = getSavedModel();
  const models = saved
    ? [saved, ...GROQ_MODELS.filter(m => m !== saved)]
    : GROQ_MODELS;

  for (const model of models) {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature:  GENERATION_CONFIG.temperature,
        max_tokens:   GENERATION_CONFIG.max_tokens,
        top_p:        GENERATION_CONFIG.top_p,
        stream:       true,
      }),
    });

    if (res.status === 404) continue; // modelo no disponible — probar el siguiente

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.error?.message || "";
      if (res.status === 401) throw new Error("API key inválida. Usá el botón 🔑 para cambiarla.");
      if (res.status === 403) throw new Error("Key sin permisos. Verificá en console.groq.com");
      if (res.status === 429) throw new Error("Límite de requests alcanzado. Esperá un minuto.");
      throw new Error(`Error ${res.status}: ${msg || "Error de la API."}`);
    }

    // ── Leer stream SSE (formato OpenAI) ────────────────────────────────
    saveModel(model);
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full   = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") break;
        try {
          const chunk = JSON.parse(json);
          const delta = chunk?.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            full += delta;
            onToken(delta, full);
          }
        } catch { /* chunk mal formado */ }
      }
    }

    if (!full) throw new Error("La API respondió vacío. Intentá de nuevo.");
    return full;
  }

  throw new Error("Ningún modelo de Groq está disponible. Verificá tu key en console.groq.com");
}

export default function ChatInterface({ apiKey, onLogout }) {
  const [messages,    setMessages]  = useState([WELCOME_MESSAGE]);
  const [input,       setInput]     = useState("");
  const [generating,  setGenerating] = useState(false);
  const [showPanel,   setShowPanel]  = useState(false);
  const [activeModel, setActiveModel]= useState(getSavedModel() || "");
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const abortRef    = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generating]);

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

    // Placeholder vacío
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      // Historial para Groq — formato OpenAI con roles user/assistant
      const history = updated
        .slice(1)    // excluye welcome
        .slice(-10)  // últimos 10 mensajes
        .map(({ role, content }) => ({
          // Gemini usa "model", OpenAI/Groq usa "assistant"
          role: role === "model" ? "assistant" : role,
          content,
        }));

      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
      ];

      const reply = await callGroq(apiKey, apiMessages, (delta, full) => {
        if (abortRef.current) return;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: full };
          return next;
        });
      });

      const currentModel = getSavedModel();
      if (currentModel && currentModel !== activeModel) setActiveModel(currentModel);

      if (!abortRef.current) logInteraction(txt, reply);

    } catch (err) {
      if (!abortRef.current) {
        console.error("[Groq]", err);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: `⚠ ${err.message || "Error al conectar con la API."}`,
          };
          return next;
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    abortRef.current = true;
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    setGenerating(false);
    if (textareaRef.current) textareaRef.current.style.height = "46px";
  };

  const handleLogout = () => {
    if (!confirm("¿Eliminar tu API key? Vas a tener que ingresarla de nuevo.")) return;
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

  const showSuggestions = messages.length === 1 && !generating;

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
            Teórico · «La Audiovisión» · {activeModel || "Groq AI"} · $0
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 6px #4ade8080" }} />
            <span style={{ fontSize: 11, color: C.muted }}>Conectado</span>
          </div>
          <button onClick={() => setShowPanel(true)} style={{
            fontSize: 11, color: C.amber, background: "#1c1008",
            border: `1px solid ${C.amberDeep}`, borderRadius: 8,
            padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
          }}>📊 Registro</button>
          <button onClick={reset} style={{
            fontSize: 11, color: C.muted, background: C.card,
            border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
          }}>Reiniciar</button>
          <button onClick={handleLogout} title="Cambiar API key" style={{
            fontSize: 14, color: "#555", background: "transparent",
            border: "none", cursor: "pointer", padding: "5px 4px",
          }}>🔑</button>
        </div>
      </header>

      {showPanel && <LogPanel onClose={() => setShowPanel(false)} />}

      {/* ── Mensajes ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 14px 8px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

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
                ...(generating && i === messages.length - 1 && m.role !== "user" && m.content
                  ? { borderRight: `2px solid ${C.amber}` } : {}),
              }}>
                {m.content === "" && generating && i === messages.length - 1
                  ? <AudioBars />
                  : m.content}
              </div>
            </div>
          ))}

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
        padding: "13px 14px 15px", position: "sticky", bottom: 0,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleChange}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Preguntale a Michel Chion sobre su obra y conceptos…"
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
