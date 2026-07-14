import { useState } from "react";
import { saveApiKey } from "../utils/storage";
import Avatar from "./Avatar";

const C = {
  bg: "#0e0e0e", surface: "#161616", card: "#202020",
  border: "#2d2d2d", muted: "#666", text: "#e2e0d8",
  amber: "#c47c30", amberText: "#fde8c0", amberDeep: "#7a441a",
  green: "#22c55e", red: "#ef4444",
};

const STEPS = [
  {
    num: "1",
    title: "Creá una cuenta gratis en Groq",
    desc: "Groq es una plataforma de IA que ofrece modelos de alta calidad de forma completamente gratuita. No requiere tarjeta de crédito.",
    link: "https://console.groq.com",
    linkLabel: "→ console.groq.com (click aquí)",
    note: "Gratis para siempre · 14.400 requests/día · Sin tarjeta de crédito",
  },
  {
    num: "2",
    title: 'Generá tu API key',
    desc: 'Una vez dentro de la consola, andá al menú "API Keys" (barra lateral izquierda) → click en "Create API Key" → ponele cualquier nombre → copiá la clave.',
    note: 'La clave empieza con "gsk_" y tiene ~56 caracteres.',
  },
  {
    num: "3",
    title: "Pegá tu clave aquí abajo",
    desc: "La clave se guarda solo en tu navegador. Nunca sale de tu computadora ni va a ningún servidor.",
  },
];

export default function ApiKeySetup({ onReady }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith("gsk_") || trimmed.length < 30) {
      setError('La clave de Groq debe empezar con "gsk_" y tener ~56 caracteres. Copiala completa desde console.groq.com');
      return;
    }
    saveApiKey(trimmed);
    onReady(trimmed);
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif", padding: 24,
    }}>
      <div style={{ maxWidth: 520, width: "100%" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Avatar size={72} />
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#f0ece0" }}>
            Michel Chion
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            Chatbot académico · Groq AI · Gratuito · Sin servidor
          </p>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { icon: "💸", label: "$0 — sin tarjeta" },
            { icon: "⚡", label: "~1 seg por respuesta" },
            { icon: "📊", label: "14.400 req/día" },
            { icon: "📱", label: "Cualquier dispositivo" },
          ].map((b, i) => (
            <div key={i} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12,
              background: C.card, border: `1px solid ${C.border}`, color: C.muted,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span>{b.icon}</span><span>{b.label}</span>
            </div>
          ))}
        </div>

        {/* Pasos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: C.amberDeep, border: `1.5px solid ${C.amber}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: C.amberText, marginTop: 2,
              }}>{s.num}</div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f0ece0", marginBottom: 4 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{s.desc}</div>

                {s.link && (
                  <a href={s.link} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-block", marginTop: 8, fontSize: 12,
                    color: C.amber, textDecoration: "none", fontWeight: 600,
                  }}>
                    {s.linkLabel}
                  </a>
                )}

                {s.note && (
                  <div style={{
                    marginTop: 8, fontSize: 11, color: "#4ade80",
                    background: "#052e16", borderRadius: 6, padding: "5px 10px",
                    border: "1px solid #166534",
                  }}>
                    ✓ {s.note}
                  </div>
                )}

                {i === 2 && (
                  <div style={{ marginTop: 12 }}>
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => { setKey(e.target.value); setError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                      placeholder="gsk_..."
                      autoComplete="off"
                      style={{
                        width: "100%", background: C.card,
                        border: `1px solid ${error ? C.red : C.border}`,
                        borderRadius: 8, padding: "10px 14px", fontSize: 13,
                        color: C.text, outline: "none", boxSizing: "border-box",
                        fontFamily: "monospace",
                      }}
                      onFocus={(e) => e.target.style.borderColor = C.amber}
                      onBlur={(e) => e.target.style.borderColor = error ? C.red : C.border}
                    />
                    {error && (
                      <div style={{ marginTop: 8, fontSize: 12, color: C.red, lineHeight: 1.5 }}>
                        ⚠ {error}
                      </div>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={!key.trim()}
                      style={{
                        width: "100%", marginTop: 10, padding: "12px",
                        background: key.trim()
                          ? `linear-gradient(135deg, ${C.amberDeep}, ${C.amber})`
                          : C.card,
                        color: key.trim() ? C.amberText : C.muted,
                        border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                        cursor: key.trim() ? "pointer" : "default",
                        fontFamily: "inherit",
                      }}
                    >
                      Guardar y comenzar →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: "#333", lineHeight: 1.7 }}>
          Basado en «La Audiovisión» de Michel Chion (Paidós, 1993) ·
          Simulación académica · Consultas registradas localmente con fines pedagógicos
        </p>
      </div>
    </div>
  );
}
