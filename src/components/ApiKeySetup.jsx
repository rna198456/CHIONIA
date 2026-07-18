import { useState } from "react";
import { saveApiKey } from "../utils/storage";
import Avatar from "./Avatar";
import { T } from "../utils/theme";

export default function ApiKeySetup({ onReady }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith("gsk_") || trimmed.length < 30) {
      setError('La clave de Groq empieza con "gsk_" y tiene ~56 caracteres.');
      return;
    }
    saveApiKey(trimmed);
    onReady(trimmed);
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bgBase, color: T.textPrim,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: T.fontBase, padding: "24px",
    }}>
      <div style={{ maxWidth: 480, width: "100%" }}>

        {/* Logo + título */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <Avatar size={64} />
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 600, color: T.textPrim, letterSpacing: "-0.01em" }}>
            Michel Chion
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: T.textSec, lineHeight: 1.5 }}>
            Chatbot académico sobre «La Audiovisión»
          </p>
        </div>

        {/* Card de setup */}
        <div style={{
          background: T.bgSurface, border: `1px solid ${T.borderSub}`,
          borderRadius: 16, overflow: "hidden",
        }}>
          {/* Badges */}
          <div style={{
            padding: "16px 20px", borderBottom: `1px solid ${T.borderSub}`,
            display: "flex", gap: 8, flexWrap: "wrap",
          }}>
            {[
              { icon: "💸", label: "$0 · sin tarjeta" },
              { icon: "⚡", label: "Respuestas en ~1 seg" },
              { icon: "📊", label: "14.400 consultas/día" },
              { icon: "🔒", label: "Tu key, tu navegador" },
            ].map((b, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: T.radiusFull,
                background: T.bgInset, border: `1px solid ${T.borderSub}`,
                fontSize: 11, color: T.textSec,
              }}>
                <span>{b.icon}</span><span>{b.label}</span>
              </div>
            ))}
          </div>

          {/* Pasos */}
          {[
            {
              n: "1",
              title: "Crear cuenta en Groq",
              body: "Gratuito, sin tarjeta de crédito.",
              link: "https://console.groq.com",
              linkLabel: "Abrir console.groq.com →",
            },
            {
              n: "2",
              title: 'Ir a "API Keys" → "Create API Key"',
              body: 'Ponele cualquier nombre. La clave empieza con "gsk_".',
            },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "16px 20px", borderBottom: `1px solid ${T.borderSub}`,
              display: "flex", gap: 14, alignItems: "flex-start",
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: T.amberBg, border: `1px solid ${T.amberDim}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600, color: T.amber, marginTop: 1,
              }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.textPrim, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.6 }}>{s.body}</div>
                {s.link && (
                  <a href={s.link} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-block", marginTop: 8, fontSize: 12,
                    color: T.amber, textDecoration: "none", fontWeight: 500,
                  }}>
                    {s.linkLabel}
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* Input */}
          <div style={{ padding: "20px" }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: T.textPrim, display: "block", marginBottom: 8 }}>
              3 · Pegá tu API key
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="gsk_..."
              autoComplete="off"
              style={{
                width: "100%", background: T.bgInset,
                border: `1px solid ${error ? T.error : T.borderMid}`,
                borderRadius: T.radiusMd, padding: "11px 14px",
                fontSize: 14, color: T.textPrim, outline: "none",
                fontFamily: T.fontMono, boxSizing: "border-box",
                transition: T.transition,
              }}
              onFocus={(e) => { e.target.style.borderColor = T.amber; e.target.style.boxShadow = `0 0 0 3px ${T.amberBg}`; }}
              onBlur={(e) => { e.target.style.borderColor = error ? T.error : T.borderMid; e.target.style.boxShadow = "none"; }}
            />
            {error && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: T.error, lineHeight: 1.5 }}>
                ⚠ {error}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!key.trim()}
              style={{
                width: "100%", marginTop: 12, padding: "13px",
                background: key.trim() ? T.amber : T.bgInset,
                color: key.trim() ? "#fff" : T.textMuted,
                border: "none", borderRadius: T.radiusMd,
                fontSize: 14, fontWeight: 600,
                cursor: key.trim() ? "pointer" : "default",
                fontFamily: T.fontBase, transition: T.transition,
                letterSpacing: "0.01em",
              }}
            >
              Comenzar →
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: T.textMuted, marginTop: 20, lineHeight: 1.7 }}>
          Basado en «La Audiovisión» de Michel Chion (Paidós, 1993) · Uso académico
        </p>
      </div>
    </div>
  );
}
