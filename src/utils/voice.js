// ─────────────────────────────────────────────────────────────────────────────
// voice.js — Entrada: Web Speech API · Salida: SpeechSynthesis (español, gratis)
// ─────────────────────────────────────────────────────────────────────────────

// ── Limpia el texto para TTS ──────────────────────────────────────────────────
export function cleanForTTS(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/━+/g, ". ")
    .replace(/[⚠✓✗📊🎬📖🔑⬇🗑]/g, "")
    .replace(/Paso (\d+) de (\d+) —/g, "Paso $1 de $2.")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .substring(0, 1200); // ~60 segundos de audio
}

// ── Soporte ───────────────────────────────────────────────────────────────────
export const isSpeechSupported   = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);
export const isSynthesisSupported = () => "speechSynthesis" in window;

// ── Obtiene la mejor voz en español disponible ────────────────────────────────
function getBestSpanishVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const priorities = [
    // 1. Voces locales en español rioplatense / latinoamericano
    v => v.lang === "es-AR" && v.localService,
    v => v.lang === "es-MX" && v.localService,
    v => v.lang === "es-419" && v.localService,
    // 2. Google español (excelente calidad en Chrome/Android)
    v => v.lang.startsWith("es") && v.name.toLowerCase().includes("google"),
    // 3. Microsoft español (buena calidad en Edge/Windows)
    v => v.lang.startsWith("es") && v.name.toLowerCase().includes("microsoft"),
    // 4. Cualquier voz en español local
    v => v.lang.startsWith("es") && v.localService,
    // 5. Cualquier voz en español
    v => v.lang.startsWith("es"),
  ];

  for (const test of priorities) {
    const found = voices.find(test);
    if (found) return found;
  }
  return null;
}

// ── Espera a que las voces estén cargadas (Chrome las carga async) ────────────
export function waitForVoices(timeout = 2000) {
  return new Promise(resolve => {
    if (window.speechSynthesis.getVoices().length > 0) { resolve(); return; }
    const onChanged = () => { window.speechSynthesis.removeEventListener("voiceschanged", onChanged); resolve(); };
    window.speechSynthesis.addEventListener("voiceschanged", onChanged);
    setTimeout(resolve, timeout); // fallback
  });
}

// ── Síntesis de voz en español (SpeechSynthesis) ─────────────────────────────
export async function speakInSpanish(text, { onStart, onEnd } = {}) {
  if (!isSynthesisSupported()) { onEnd?.(); return null; }

  const synth = window.speechSynthesis;
  synth.cancel(); // detener cualquier audio anterior

  await waitForVoices();

  const cleaned = cleanForTTS(text);
  if (!cleaned) { onEnd?.(); return null; }

  const utterance    = new SpeechSynthesisUtterance(cleaned);
  utterance.lang     = "es";
  utterance.rate     = 0.92;   // levemente más lento que default — más claro
  utterance.pitch    = 1.0;
  utterance.volume   = 1.0;

  const voice = getBestSpanishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang  = voice.lang; // usar el lang exacto de la voz
  }

  utterance.onstart  = () => onStart?.();
  utterance.onend    = () => onEnd?.();
  utterance.onerror  = (e) => {
    if (e.error !== "interrupted" && e.error !== "canceled") onEnd?.();
  };

  synth.speak(utterance);
  return synth; // retornamos para poder llamar synth.cancel()
}

// ── Detiene la síntesis ───────────────────────────────────────────────────────
export function stopSpeaking() {
  if (isSynthesisSupported()) window.speechSynthesis.cancel();
}

// ── Crea el reconocedor de voz ────────────────────────────────────────────────
export function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r          = new SR();
  r.lang           = "es-AR";
  r.continuous     = false;
  r.interimResults = true;
  r.maxAlternatives = 1;
  return r;
}
