// ─────────────────────────────────────────────────────────────────────────────
// Sistema de registro con localStorage
// Reemplaza la API window.storage (exclusiva de artifacts de claude.ai)
// ─────────────────────────────────────────────────────────────────────────────

const LOG_KEY = "chion_log";
const SESSION_KEY = "chion_sid";
const MAX_ENTRIES = 1000; // ~200 KB aprox.

/** Obtiene o crea el ID de sesión (persiste por pestaña, no entre recargas) */
export function getSessionId() {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = Math.random().toString(36).substring(2, 6).toUpperCase();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

/** Recupera todas las entradas del log (más reciente primero) */
export function getLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Registra una interacción.
 * @param {string} question  - Pregunta del alumno
 * @param {string} response  - Respuesta completa del bot
 */
export function logInteraction(question, response) {
  try {
    const entries = getLog();
    entries.unshift({
      ts: new Date().toISOString(),
      sid: getSessionId(),
      q: question,
      r: (response || "").substring(0, 150),
    });
    localStorage.setItem(
      LOG_KEY,
      JSON.stringify(entries.slice(0, MAX_ENTRIES))
    );
  } catch {
    /* fallo silencioso – el log nunca interrumpe la conversación */
  }
}

/** Elimina todo el registro */
export function clearLog() {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {
    /* silent */
  }
}

/** Exporta el log como CSV y dispara la descarga */
export function exportCSV(entries) {
  const rows = [
    ["Fecha", "Hora", "Sesión", "Pregunta", "Respuesta (inicio)"],
    ...entries.map((e) => {
      const d = new Date(e.ts);
      return [
        d.toLocaleDateString("es-AR"),
        d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        e.sid,
        `"${(e.q || "").replace(/"/g, "'")}"`,
        `"${(e.r || "").replace(/"/g, "'")}"`,
      ];
    }),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chion-bot-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
