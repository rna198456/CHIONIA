import { useState, useRef, useEffect } from "react";
import Avatar from "./Avatar";
import LogPanel from "./LogPanel";
import { SYSTEM_PROMPT, GENERATION_CONFIG, SUGGESTIONS, WELCOME_MESSAGE, GEMINI_ENDPOINT } from "../data/chionPrompt";
import { logInteraction, clearApiKey } from "../utils/storage";

const C = {
  bg: "#0e0e0e", surface: "#161616", card: "#202020",
  border: "#2d2d2d", muted: "#666", text: "#e2e0d8", textDim: "#8a8880",
  amber: "#c47c30", amberDeep: "#7a441a", amberText: "#fde8c0",
};

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

export default function ChatInterface({ apiKey, onLogout }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generating]);

  /**
   * Llama a Gemini con streaming (SSE).
   * Gemini usa roles "user" / "model" (no "assistant").
   * El system prompt va en "system_instruction".
   */
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

    // Agrega placeholder del asistente
    setMessages((prev) => [...prev, { role: "model", content: "" }]);

    let fullResponse = "";

    try {
      // Convertir historial al formato de Gemini
      // Excluye el mensaje de bienvenida (primer mensaje) que no viene del usuario
      // Limita a últimos 10 turnos para no agotar tokens
      const history = updated
        .slice(1)          // omite el welcome
        .slice(-10)        // últimos 10 mensajes
        .map(({ role, content }) => ({
          role,            // "user" | "model" — ya en formato correcto
          parts: [{ text: content }],
        }));

      const body = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: history,
        generationConfig: GENERATION_CONFIG,
      };

      // Streaming SSE: alt=sse devuelve chunks line by line
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}&alt=sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const errBody = await res.json().catch(() => ({}));
      if (res.status === 400) throw new Error(errBody?.error?.message || "Request inválido.");
      if (res.status === 401) throw new Error("API key inválida. Revisá que la copiaste completa desde aistudio.google.com/app/apikey — luego usá el botón 🔑 del header para cambiarla.");
      if (res.status === 403) throw new Error("Key sin permisos. Generá una nueva en aistudio.google.com/app/apikey y usá el botón 🔑 para actualizarla.");
      if (res.status === 404) throw new Error("API no habilitada. Andá a aistudio.google.com/app/apikey, creá una key nueva (eso la habilita automáticamente) y usá el botón 🔑 del header para actualizarla.");
      if (res.status === 429) throw new Error("Límite de consultas alcanzado. Esperá unos segundos y volvé a intentar.");
      if (!res.ok) throw new Error(`Error ${res.status}: ${errBody?.error?.message || "Error desconocido de la API."}`);

      // Leer el stream SSE línea por línea
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        if (abortRef.current) { reader.cancel(); break; }
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // la última línea puede estar incompleta

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const chunk = JSON.parse(json);
            const delta = chunk?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (delta) {
              fullResponse += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "model", content: fullResponse };
                return next;
              });
            }
          } catch { /* chunk mal formado — ignorar */ }
        }
      }

      if (fullResponse && !abortRef.current) {
        logInteraction(txt, fullResponse);
      }

    } catch (err) {
      if (!abortRef.current) {
        console.error("[Gemini]", err);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "model",
            content: `⚠ ${err.message || "Error al conectar con la API. Revisá tu clave y tu conexión."}`,
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
    if (!confirm("¿Eliminar tu API key guardada? Tendrás que ingresarla de nuevo la próxima vez.")) return;
    clearApiKey();
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
            Teórico · «La Audiovisión» · Gemini 1.5 Flash · $0
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
          <button onClick={handleLogout} style={{
            fontSize: 11, color: "#666", background: "transparent",
            border: "none", cursor: "pointer", fontFamily: "inherit", padding: "5px 4px",
          }} title="Eliminar API key">🔑</button>
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

          {/* Sugerencias */}
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
