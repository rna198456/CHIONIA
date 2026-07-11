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
    title: "Abrí Google AI Studio",
    desc: "Es el portal gratuito de Google para usar sus modelos de IA.",
    link: "https://aistudio.google.com/app/apikey",
    linkLabel: "→ Ir a aistudio.google.com",
    note: "Necesitás una cuenta de Gmail. No requiere tarjeta de crédito.",
  },
  {
    num: "2",
    title: 'Hacé click en "Create API key"',
    desc: 'En la página que se abre, buscá el botón azul "Create API key". Seleccioná un proyecto o creá uno nuevo. Copiá la clave generada (empieza con "AIza" y tiene ~39 caracteres).',
    note: "El tier gratuito da 1.500 consultas/día y 1 millón de tokens/día — más que suficiente.",
  },
  {
    num: "3",
    title: "Pegá tu clave aquí abajo",
    desc: "La clave se guarda solo en tu navegador. Nunca sale de tu computadora.",
  },
];

export default function ApiKeySetup({ onReady }) {
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = key.trim();
    if (trimmed.length < 20) {
      setError("La clave parece demasiado corta. Copiala completa desde aistudio.google.com/app/apikey");
      return;
    }
    setTesting(true);
    setError("");

    try {
      // Test rápido con una request mínima
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${trimmed}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Di solo: OK" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      );

      if (res.status === 400) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Key inválida.");
      }
      if (res.status === 403) throw new Error("Key sin permisos. Generá una nueva en AI Studio.");
      if (!res.ok) throw new Error(`Error ${res.status}. Verificá tu clave.`);

      // Key válida
      saveApiKey(trimmed);
      onReady(trimmed);
    } catch (err) {
      setError(err.message || "No se pudo verificar la clave. Revisá tu conexión.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif", padding: 24,
    }}>
      <div style={{ maxWidth: 520, width: "100%" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Avatar size={72} />
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#f0ece0" }}>
            Michel Chion
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            Chatbot académico · Gratuito · Sin servidor
          </p>
        </div>

        {/* Info de costo */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", justifyContent: "center",
        }}>
          {[
            { icon: "💸", label: "$0 para vos" },
            { icon: "🔒", label: "Key solo en tu navegador" },
            { icon: "⚡", label: "Respuestas en ~2 seg" },
            { icon: "📱", label: "Funciona en cualquier dispositivo" },
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
                fontSize: 12, fontWeight: 700, color: C.amberText,
              }}>{s.num}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f0ece0", marginBottom: 4 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{s.desc}</div>
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block", marginTop: 8, fontSize: 12,
                      color: C.amber, textDecoration: "none", fontWeight: 500,
                    }}
                  >
                    {s.linkLabel}
                  </a>
                )}
                {s.note && (
                  <div style={{
                    marginTop: 8, fontSize: 11, color: "#555",
                    background: C.card, borderRadius: 6, padding: "5px 10px",
                    border: `1px solid ${C.border}`,
                  }}>
                    {s.note}
                  </div>
                )}

                {/* Campo de input — solo en el paso 3 */}
                {i === 2 && (
                  <div style={{ marginTop: 12 }}>
                    <input
                      type="password"
                      value={key}
                      onChange={(e) => { setKey(e.target.value); setError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                      placeholder="AIzaSy... (39 caracteres aprox.)"
                      style={{
                        width: "100%", background: C.card, border: `1px solid ${C.border}`,
                        borderRadius: 8, padding: "10px 14px", fontSize: 13,
                        color: C.text, outline: "none", boxSizing: "border-box",
                        fontFamily: "monospace",
                      }}
                      onFocus={(e) => e.target.style.borderColor = C.amber}
                      onBlur={(e) => e.target.style.borderColor = C.border}
                    />
                    {error && (
                      <div style={{ marginTop: 8, fontSize: 12, color: C.red, lineHeight: 1.5 }}>
                        ⚠ {error}
                      </div>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={!key.trim() || testing}
                      style={{
                        width: "100%", marginTop: 10, padding: "11px",
                        background: key.trim() && !testing
                          ? `linear-gradient(135deg, ${C.amberDeep}, ${C.amber})`
                          : C.card,
                        color: key.trim() && !testing ? C.amberText : C.muted,
                        border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: key.trim() && !testing ? "pointer" : "default",
                        fontFamily: "inherit",
                      }}
                    >
                      {testing ? "Verificando clave…" : "Guardar y comenzar →"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: "#333", lineHeight: 1.7 }}>
          Basado en «La Audiovisión» de Michel Chion (Paidós, 1993) ·
          Simulación académica · Las consultas se registran localmente con fines pedagógicos
        </p>
      </div>
    </div>
  );
}
