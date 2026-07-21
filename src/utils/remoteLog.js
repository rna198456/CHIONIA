// ─────────────────────────────────────────────────────────────────────────────
// remoteLog.js — Envía cada interacción al Google Sheets del docente
// Incluye datos del alumno (nombre, comisión) para trazabilidad completa
// ─────────────────────────────────────────────────────────────────────────────
import { SHEETS_ENDPOINT } from "../data/chionPrompt.js";
import { getSessionId } from "./storage.js";

export async function sendToRemoteLog(question, response, model, student) {
  if (!SHEETS_ENDPOINT) return;

  const payload = {
    action:   "log",
    ts:       new Date().toISOString(),
    sid:      getSessionId(),
    // Datos del alumno identificado
    dni:      student?.dni      || "",
    nombre:   student?.nombre   || "",
    apellido: student?.apellido || "",
    comision: student?.comision || "",
    // Interacción
    q:        question,
    r:        (response || "").substring(0, 500),
    model:    model || "",
  };

  try {
    await fetch(SHEETS_ENDPOINT, {
      method:  "POST",
      mode:    "no-cors",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(payload),
    });
  } catch {
    // Fallo silencioso — el chat nunca se interrumpe por un error de log
  }
}
