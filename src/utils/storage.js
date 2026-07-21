// ─────────────────────────────────────────────────────────────────────────────
// storage.js — Persistencia local (API key, alumno, log)
// ─────────────────────────────────────────────────────────────────────────────

const KEY_API     = "chion_api_key";
const KEY_STUDENT = "chion_student";        // datos del alumno verificado
const KEY_LOG     = "chion_log";
const KEY_SID     = "chion_sid";
const MAX_ENTRIES = 1000;
const VERIFY_TTL  = 24 * 60 * 60 * 1000;   // 24h — revalida el acceso una vez por día

// ── API Key ───────────────────────────────────────────────────────────────────
export const saveApiKey  = k => { try { localStorage.setItem(KEY_API, k.trim()); } catch {} };
export const loadApiKey  = ()  => { try { return localStorage.getItem(KEY_API) || ""; } catch { return ""; } };
export const clearApiKey = ()  => { try { localStorage.removeItem(KEY_API); } catch {} };

// ── Alumno verificado ─────────────────────────────────────────────────────────
export function saveStudent(data) {
  try {
    localStorage.setItem(KEY_STUDENT, JSON.stringify({
      ...data,
      verifiedAt: Date.now(),
    }));
  } catch {}
}

export function loadStudent() {
  try {
    const raw = localStorage.getItem(KEY_STUDENT);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Revalida después de 24h
    if (Date.now() - (data.verifiedAt || 0) > VERIFY_TTL) return null;
    return data;
  } catch { return null; }
}

export function clearStudent() {
  try { localStorage.removeItem(KEY_STUDENT); } catch {}
}

// ── ID de sesión (persiste por pestaña) ──────────────────────────────────────
export function getSessionId() {
  let sid = sessionStorage.getItem(KEY_SID);
  if (!sid) {
    sid = Math.random().toString(36).substring(2, 6).toUpperCase();
    sessionStorage.setItem(KEY_SID, sid);
  }
  return sid;
}

// ── Log local ─────────────────────────────────────────────────────────────────
export function getLog() {
  try { return JSON.parse(localStorage.getItem(KEY_LOG) || "[]"); } catch { return []; }
}

export function logInteraction(question, response) {
  try {
    const entries = getLog();
    entries.unshift({
      ts:  new Date().toISOString(),
      sid: getSessionId(),
      q:   question,
      r:   (response || "").substring(0, 150),
    });
    localStorage.setItem(KEY_LOG, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {}
}

export function clearLog() {
  try { localStorage.removeItem(KEY_LOG); } catch {}
}

export function exportCSV(entries) {
  const rows = [
    ["Fecha","Hora","Sesión","Pregunta","Respuesta (inicio)"],
    ...entries.map(e => {
      const d = new Date(e.ts);
      return [
        d.toLocaleDateString("es-AR"),
        d.toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" }),
        e.sid,
        `"${(e.q||"").replace(/"/g,"'")} "`,
        `"${(e.r||"").replace(/"/g,"'")} "`,
      ];
    }),
  ];
  const csv  = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `chion-log-${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}
