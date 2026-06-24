import { CONCEPT_ORDER, CONCEPTS } from "../data/concepts.js";
import { FILM_ANALYSES, FILMS } from "../data/films.js";
import { ACADEMIC_FILTER_REPLY } from "../prompts/chionPrompt.js";
import { classifyQuestion } from "./classifier.js";

function formatConcept(key) {
  const concept = CONCEPTS[key];
  const examples = concept.examples.map((example) => `- ${example}`).join("\n");
  const films = (FILMS[key] || [])
    .map((film) => `- ${film.title} (${film.director}): ${film.note}`)
    .join("\n");

  return [
    concept.title,
    concept.summary,
    "",
    concept.explanation,
    "",
    "Uso en clase",
    concept.classroomUse,
    "",
    "Ejemplos",
    examples,
    films ? "\nPelículas posibles\n" + films : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatFilmAnalysis(key) {
  const film = FILM_ANALYSES[key];
  const sections = film.sections
    .map((section) => `${section.title}\n${section.body}`)
    .join("\n\n");

  return [
    `${film.title} (${film.director}, ${film.year})`,
    "Lectura desde Michel Chion y análisis sonoro.",
    "",
    sections,
  ].join("\n");
}

function formatGeneralAnswer() {
  const concepts = CONCEPT_ORDER.slice(0, 7)
    .map((key) => `- ${CONCEPTS[key].title}: ${CONCEPTS[key].summary}`)
    .join("\n");

  return [
    "Puedo trabajar la pregunta desde la audiovisión de Michel Chion.",
    "",
    "Ejes útiles para empezar:",
    concepts,
    "",
    "Si querés analizar una escena, conviene ordenar primero qué sonidos son in, fuera de campo u off; después observar valor añadido, punto de escucha y posibles sonidos internos.",
  ].join("\n");
}

export function searchConcept(question) {
  const classification = classifyQuestion(question);

  if (classification.intent === "outOfScope") {
    return {
      classification,
      answer: ACADEMIC_FILTER_REPLY,
      source: "filter",
    };
  }

  if (classification.intent === "filmAnalysis") {
    const filmKey = classification.filmKeys[0];
    return {
      classification,
      answer: formatFilmAnalysis(filmKey),
      source: "film",
    };
  }

  if (classification.intent === "concept") {
    return {
      classification,
      answer: classification.conceptKeys.map(formatConcept).join("\n\n"),
      source: "concept",
    };
  }

  return {
    classification,
    answer: formatGeneralAnswer(),
    source: "general",
  };
}
