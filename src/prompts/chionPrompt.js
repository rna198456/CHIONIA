export const ACADEMIC_FILTER_REPLY =
  "Solo puedo responder sobre Michel Chion y análisis sonoro cinematográfico.";

export const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Buenas. Soy CHIONIA, un asistente académico para trabajar conceptos de Michel Chion y análisis sonoro cinematográfico.\n\nPodés preguntarme por sincrésis, acúsmetro, valor añadido, punto de escucha o pedirme un análisis de una película como Apocalypse Now.",
};

export const SUGGESTIONS = [
  "¿Qué es la sincrésis?",
  "Explicá el valor añadido con ejemplos",
  "¿Qué es el acúsmetro?",
  "Diferencia entre sonido in, fuera de campo y off",
  "Analizá Apocalypse Now",
  "¿Qué es el punto de escucha?",
];

export const GENERATION_CONFIG = {
  max_new_tokens: 280,
  temperature: 0.25,
  top_p: 0.85,
  do_sample: false,
  repetition_penalty: 1.08,
};

export function buildChionPrompt({ question, closedAnswer }) {
  return [
    {
      role: "system",
      content:
        "Respondés en español como asistente académico sobre Michel Chion y análisis sonoro cinematográfico. No salís de la base cerrada. No inventás citas ni datos. Si la pregunta no pertenece al campo, respondés exactamente: Solo puedo responder sobre Michel Chion y análisis sonoro cinematográfico.",
    },
    {
      role: "user",
      content:
        `Pregunta del alumno:\n${question}\n\n` +
        `Base cerrada autorizada:\n${closedAnswer}\n\n` +
        "Reescribí una respuesta clara para clase. Conservá los conceptos y ejemplos de la base. No agregues información externa.",
    },
  ];
}
