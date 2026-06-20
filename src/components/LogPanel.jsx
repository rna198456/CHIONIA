import { useState, useEffect } from "react";
import { getLog, clearLog, exportCSV } from "../utils/storage";

const C = {
  surface: "#161616", card: "#1e1e1e", border: "#2a2a2a",
  muted: "#555", text: "#e2e0d8", textDim: "#888",
  amber: "#c47c30", green: "#22c55e", red: "#ef4444", blue: "#60a5fa",
};

export default function LogPanel({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    setEntries(getLog());
    setLoading(false);
  }, []);

  const total = entries.length;
  const sessions = new Set(entries.map((e) => e.sid)).size;

  // Últimas 24 h
  const oneDayAgo = Date.now() - 86_400_000;
  const recent = entries.filter((e) => new Date(e.ts).getTime() > oneDayAgo).length;

  const visible = filter === "recent" ? entries.filter((e) => new Date(e.ts).getTime() > oneDayAgo) : entries;

  const handleClear = async () => {
    if (!confirm("¿Limpiar todo el registro? Esta acción no se puede deshacer.")) return;
    setClearing(true);
    clearLog();
    setEntries([]);
    setClearing(false);
  };

  const fmt = (iso) =>
    new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
        zIndex: 100, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16,
      }}
    >
      <div
        style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 16, width: "100%", maxWidth: 860,
          maxHeight: "88vh", display: "flex", flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#f0ece0" }}>
              📊 Registro de interacciones
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              Panel docente · Chion Bot · Almacenado en localStorage del navegador
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, width: 32, height: 32, cursor: "pointer",
              color: C.muted, fontSize: 16, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)",
            borderBottom: `1px solid ${C.border}`, flexShrink: 0,
          }}
        >
          {[
            { label: "Total consultas", value: loading ? "—" : total, color: C.amber },
            { label: "Sesiones distintas", value: loading ? "—" : sessions, color: C.blue },
            { label: "Últimas 24 h", value: loading ? "—" : recent, color: C.green },
            {
              label: "Prom. por sesión",
              value: loading || !sessions ? "—" : (total / sessions).toFixed(1),
              color: "#a78bfa",
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                padding: "14px 16px",
                borderRight: i < 3 ? `1px solid ${C.border}` : "none",
              }}
            >
              <div
                style={{
                  fontSize: 10, color: C.muted, textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: 6,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div
          style={{
            padding: "10px 16px", borderBottom: `1px solid ${C.border}`,
            display: "flex", gap: 6, alignItems: "center", flexShrink: 0,
          }}
        >
          {[["all", "Todas"], ["recent", "Últimas 24 h"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                fontSize: 11, padding: "4px 12px", borderRadius: 6,
                border: `1px solid ${filter === v ? C.amber : C.border}`,
                background: filter === v ? "#1c1008" : C.card,
                color: filter === v ? C.amber : C.muted,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {l}
            </button>
          ))}
          <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>
            {loading ? "Cargando…" : `${visible.length} registro${visible.length !== 1 ? "s" : ""}`}
          </span>
          <div style={{ marginLeft: "auto", fontSize: 10, color: "#333" }}>
            ⚠ El registro se almacena en el navegador de este dispositivo. Exportá CSV para conservarlo.
          </div>
        </div>

        {/* Tabla */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
              Cargando…
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
              {total === 0
                ? "Aún no hay consultas registradas. Las preguntas de los alumnos aparecerán aquí automáticamente."
                : "No hay registros con este filtro."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0 }}>
                <tr style={{ background: "#1a1a1a" }}>
                  {["Fecha / hora", "Sesión", "Pregunta del alumno", "Inicio de respuesta"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 14px", textAlign: "left", color: C.muted,
                        fontWeight: 600, fontSize: 10, textTransform: "uppercase",
                        letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((e, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: `1px solid #1a1a1a`,
                      background: i % 2 === 0 ? "transparent" : "#191919",
                    }}
                  >
                    <td style={{ padding: "9px 14px", color: C.textDim, whiteSpace: "nowrap", fontSize: 11 }}>
                      {fmt(e.ts)}
                    </td>
                    <td style={{ padding: "9px 14px", fontFamily: "monospace", color: C.blue, fontSize: 11 }}>
                      {e.sid}
                    </td>
                    <td style={{ padding: "9px 14px", color: C.text, maxWidth: 320 }}>
                      <div
                        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={e.q}
                      >
                        {e.q}
                      </div>
                    </td>
                    <td style={{ padding: "9px 14px", color: C.muted, maxWidth: 240, fontSize: 11 }}>
                      <div
                        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={e.r}
                      >
                        {e.r}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px", borderTop: `1px solid ${C.border}`,
            display: "flex", gap: 8, justifyContent: "space-between",
            alignItems: "center", flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 10, color: "#333" }}>
            Sesiones identificadas por código aleatorio · Sin datos personales
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => exportCSV(entries)}
              disabled={!total || loading}
              style={{
                fontSize: 11, padding: "7px 14px",
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 8, color: total ? C.text : C.muted,
                cursor: total ? "pointer" : "default", fontFamily: "inherit",
              }}
            >
              ⬇ Exportar CSV
            </button>
            <button
              onClick={handleClear}
              disabled={!total || clearing || loading}
              style={{
                fontSize: 11, padding: "7px 14px",
                background: total ? "#450a0a" : C.card,
                border: `1px solid ${total ? "#7f1d1d" : C.border}`,
                borderRadius: 8, color: total ? C.red : C.muted,
                cursor: total ? "pointer" : "default", fontFamily: "inherit",
              }}
            >
              {clearing ? "Limpiando…" : "🗑 Limpiar registro"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
