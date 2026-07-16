// ─────────────────────────────────────────────────────────────────────────────
// remoteLog.js — Registro docente en Google Sheets
//
// Cada interacción de cada alumno se envía silenciosamente a un Google Sheet
// privado del docente. Los alumnos no ven esta información.
//
// Si SHEETS_ENDPOINT está vacío (no configurado), esta función no hace nada.
// Fallo silencioso: si la red falla, el chat sigue funcionando igual.
// ─────────────────────────────────────────────────────────────────────────────

import { SHEETS_ENDPOINT } from "../data/chionPrompt.js";
import { getSessionId } from "./storage.js";

export async function sendToRemoteLog(question, response, model) {
  if (!SHEETS_ENDPOINT) return; // no configurado — skip silencioso

  const payload = {
    ts:    new Date().toISOString(),
    sid:   getSessionId(),
    q:     question,
    r:     (response || "").substring(0, 500),
    model: model || "",
  };

  try {
    // mode: "no-cors" + Content-Type: "text/plain" → request simple, sin preflight
    // El Apps Script recibe e.postData.contents como string JSON
    await fetch(SHEETS_ENDPOINT, {
      method:  "POST",
      mode:    "no-cors",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(payload),
    });
  } catch {
    // Fallo de red → ignorar. El registro local siempre funciona.
  }
}
