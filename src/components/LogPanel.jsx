import { useState, useEffect } from "react";
import { getLog, clearLog, exportCSV } from "../utils/storage";
import { SHEETS_ENDPOINT } from "../data/chionPrompt";
import { T } from "../utils/theme";

export default function LogPanel({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const [clearing,setClearing]= useState(false);

  useEffect(() => { setEntries(getLog()); setLoading(false); }, []);

  const total   = entries.length;
  const sessions= [...new Set(entries.map(e => e.sid))].length;
  const oneDayAgo = Date.now() - 86_400_000;
  const recent  = entries.filter(e => new Date(e.ts).getTime() > oneDayAgo).length;
  const visible = filter === "recent" ? entries.filter(e => new Date(e.ts).getTime() > oneDayAgo) : entries;

  const handleClear = () => {
    if (!confirm("¿Limpiar todo el registro local?")) return;
    setClearing(true); clearLog(); setEntries([]); setClearing(false);
  };
  const fmt = iso => new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      zIndex: 100, display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20, backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: T.bgSurface, border: `1px solid ${T.borderSub}`,
        borderRadius: 16, width: "100%", maxWidth: 860,
        maxHeight: "88vh", display: "flex", flexDirection: "column",
        overflow: "hidden", fontFamily: T.fontBase,
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${T.borderSub}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrim }}>Registro de sesión</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
              Historial local · este navegador
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, border: `1px solid ${T.borderSub}`,
            borderRadius: T.radiusMd, background: T.bgCard,
            color: T.textSec, cursor: "pointer", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Banner registro remoto */}
        {SHEETS_ENDPOINT ? (
          <div style={{
            padding: "10px 20px", borderBottom: `1px solid ${T.borderSub}`,
            background: T.greenBg, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 13 }}>📡</span>
            <span style={{ fontSize: 12, color: T.green }}>
              Registro docente activo — las consultas de todos los alumnos se envían a Google Sheets
            </span>
          </div>
        ) : (
          <div style={{
            padding: "10px 20px", borderBottom: `1px solid ${T.borderSub}`,
            background: T.yellowBg, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 13 }}>⚠</span>
            <span style={{ fontSize: 12, color: T.yellow }}>
              Registro remoto no configurado. Configurá <code style={{ background: T.bgInset, padding: "1px 5px", borderRadius: 4 }}>SHEETS_ENDPOINT</code> en <code style={{ background: T.bgInset, padding: "1px 5px", borderRadius: 4 }}>chionPrompt.js</code> para activarlo.
            </span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: `1px solid ${T.borderSub}` }}>
          {[
            { label: "Total consultas", value: total, color: T.amber },
            { label: "Sesiones distintas", value: sessions, color: T.blue },
            { label: "Últimas 24 h", value: recent, color: T.green },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "14px 20px",
              borderRight: i < 2 ? `1px solid ${T.borderSub}` : "none",
            }}>
              <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{loading ? "—" : s.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{
          padding: "10px 20px", borderBottom: `1px solid ${T.borderSub}`,
          display: "flex", gap: 6, alignItems: "center",
        }}>
          {[["all","Todas"],["recent","Últimas 24 h"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              fontSize: 11, padding: "4px 12px", borderRadius: T.radiusFull,
              border: `1px solid ${filter === v ? T.amber : T.borderSub}`,
              background: filter === v ? T.amberBg : "transparent",
              color: filter === v ? T.amber : T.textSec,
              cursor: "pointer", fontFamily: T.fontBase,
            }}>{l}</button>
          ))}
          <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 4 }}>
            {visible.length} entrada{visible.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tabla */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {visible.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 13 }}>
              {total === 0 ? "Aún no hay consultas registradas en este navegador." : "Sin registros con este filtro."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: T.bgCard }}>
                <tr>
                  {["Fecha / hora", "Sesión", "Pregunta", "Inicio de respuesta"].map(h => (
                    <th key={h} style={{
                      padding: "9px 16px", textAlign: "left",
                      color: T.textMuted, fontWeight: 500, fontSize: 10,
                      textTransform: "uppercase", letterSpacing: "0.07em",
                      borderBottom: `1px solid ${T.borderSub}`, whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((e, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.borderSub}` }}>
                    <td style={{ padding: "9px 16px", color: T.textMuted, whiteSpace: "nowrap", fontSize: 11 }}>{fmt(e.ts)}</td>
                    <td style={{ padding: "9px 16px", fontFamily: T.fontMono, color: T.blue, fontSize: 11 }}>{e.sid}</td>
                    <td style={{ padding: "9px 16px", color: T.textPrim, maxWidth: 300 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.q}>{e.q}</div>
                    </td>
                    <td style={{ padding: "9px 16px", color: T.textSec, maxWidth: 260, fontSize: 11 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.r}>{e.r}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${T.borderSub}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 10, color: T.textMuted }}>Sin datos personales · código de sesión anónimo por visita</span>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "⬇ Exportar CSV", onClick: () => exportCSV(entries), disabled: !total, danger: false },
              { label: clearing ? "Limpiando…" : "🗑 Limpiar", onClick: handleClear, disabled: !total || clearing, danger: true },
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} disabled={btn.disabled} style={{
                fontSize: 11, padding: "7px 14px",
                background: btn.danger && !btn.disabled ? T.errorBg : T.bgCard,
                border: `1px solid ${btn.danger && !btn.disabled ? T.error : T.borderSub}`,
                borderRadius: T.radiusMd,
                color: btn.disabled ? T.textMuted : btn.danger ? T.error : T.textSec,
                cursor: btn.disabled ? "default" : "pointer",
                fontFamily: T.fontBase,
              }}>{btn.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
