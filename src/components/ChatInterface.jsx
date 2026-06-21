import { useState, useRef, useEffect } from "react";
import { TextStreamer } from "@huggingface/transformers";
import Avatar from "./Avatar";
import LogPanel from "./LogPanel";
import { SYSTEM_PROMPT, GENERATION_CONFIG, SUGGESTIONS, WELCOME_MESSAGE } from "../data/chionPrompt";
import { logInteraction } from "../utils/storage";

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

export default function ChatInterface({ engine }) {
  // "engine" es el objeto pipeline de Transformers.js
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

    // Placeholder del asistente (se rellena token a token)
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      // Últimos 8 mensajes para no agotar el contexto del modelo pequeño
      const history = updated.slice(-8).map(({ role, content }) => ({ role, content }));
      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
      ];

      let fullResponse = "";

      // TextStreamer: llama callback_function con cada token decodificado
      const streamer = new TextStreamer(engine.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (token) => {
          if (abortRef.current) return;
          fullResponse += token;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: fullResponse };
            return next;
          });
        },
      });

      // Inferencia — bloquea hasta que termina (streaming va por callback)
      await engine(apiMessages, {
        max_new_tokens: GENERATION_CONFIG.max_new_tokens,
        temperature: GENERATION_CONFIG.temperature,
        top_p: GENERATION_CONFIG.top_p,
        do_sample: GENERATION_CONFIG.do_sample,
        repetition_penalty: GENERATION_CONFIG.repetition_penalty,
        streamer,
        return_full_text: false, // solo el texto generado, no el prompt
      });

      if (fullResponse && !abortRef.current) {
        logInteraction(txt, fullResponse);
      }

    } catch (err) {
      if (!abortRef.current) {
        console.error("[Inference]", err);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: "Ocurrió un error al generar la respuesta. Por favor, intentá de nuevo.",
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
            Teórico · «La Audiovisión» · IA local — sin servidor
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 6px #4ade8080" }} />
            <span style={{ fontSize: 11, color: C.muted }}>Local</span>
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
              {m.role === "assistant" && <Avatar size={30} />}
              <div style={{
                maxWidth: "78%", padding: "11px 15px",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap",
                background: m.role === "user" ? C.amberDeep : C.card,
                color: m.role === "user" ? C.amberText : C.text,
                border: m.role === "assistant" ? `1px solid ${C.border}` : "none",
                // Cursor derecho parpadeante mientras genera el último mensaje
                ...(generating && i === messages.length - 1 && m.role === "assistant" && m.content
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
                <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Preguntas sugeridas</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s)} style={{
                    textAlign: "left", fontSize: 12,
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "9px 12px", color: C.textDim,
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder={generating ? "Generando respuesta… (puede tardar hasta 1 min en CPU)" : "Preguntale a Michel Chion…"}
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
