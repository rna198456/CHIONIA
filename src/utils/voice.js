// ─────────────────────────────────────────────────────────────────────────────
// voice.js — Entrada por micrófono (Web Speech API) + Salida TTS (Groq)
// ─────────────────────────────────────────────────────────────────────────────

// ── Limpia el texto antes de enviarlo al TTS ──────────────────────────────────
export function cleanForTTS(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")   // **negrita** → texto
    .replace(/\*(.*?)\*/g, "$1")        // *cursiva* → texto
    .replace(/━+/g, ".")                // separadores → pausa
    .replace(/[⚠✓✗📊🎬📖🔑⬇🗑]/g, "")  // íconos → nada
    .replace(/Paso \d+ de \d+ —/g, m => m.replace("—", ".")) // pasos
    .replace(/\n{2,}/g, ". ")           // párrafos → pausa
    .replace(/\n/g, " ")                // saltos → espacio
    .trim()
    .substring(0, 3000);                // límite Groq TTS
}

// ── Verifica soporte de Web Speech API ───────────────────────────────────────
export function isSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// ── Crea y configura el objeto SpeechRecognition ─────────────────────────────
export function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang              = "es-AR";   // español rioplatense
  r.continuous        = false;     // para en silencio automáticamente
  r.interimResults    = true;      // resultados mientras habla
  r.maxAlternatives   = 1;
  return r;
}

// ── Síntesis de voz con Groq TTS ─────────────────────────────────────────────
// Retorna el objeto Audio para poder interrumpirlo si es necesario
export async function speakWithGroq(text, apiKey, { onStart, onEnd, onError } = {}) {
  const cleaned = cleanForTTS(text);
  if (!cleaned) { onEnd?.(); return null; }

  onStart?.();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method:  "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model:           "playai-tts",
        input:           cleaned,
        voice:           "Fritz-PlayAI",   // voz masculina, clara y medida
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Si TTS falla, no interrumpir el flujo del chat — solo silencio
      console.warn("[TTS]", res.status, err?.error?.message);
      onEnd?.();
      return null;
    }

    const blob    = await res.blob();
    const url     = URL.createObjectURL(blob);
    const audio   = new Audio(url);

    audio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
    audio.onerror = () => { URL.revokeObjectURL(url); onEnd?.(); };

    await audio.play();
    return audio;                          // retornamos para poder hacer .pause()

  } catch (err) {
    console.warn("[TTS network error]", err);
    onEnd?.();
    return null;
  }
}
