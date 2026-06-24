import { CONCEPTS } from "../data/concepts.js";
import { FILM_ANALYSES, FILMS } from "../data/films.js";

const ACADEMIC_TERMS = [
  "chion",
  "audiovision",
  "audiovisión",
  "sonido",
  "sonoro",
  "banda sonora",
  "cine",
  "cinematografico",
  "cinematográfico",
  "pelicula",
  "película",
  "film",
  "escena",
  "escucha",
  "imagen",
  "montaje",
  "diegetico",
  "diegético",
  "doblaje",
  "foley",
  "musica",
  "música",
];

const ANALYSIS_TERMS = [
  "analiza",
  "analizame",
  "analizar",
  "analisis",
  "analisis",
  "lectura",
  "aplica",
  "aplicame",
  "trabaja",
];

export function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAlias(text, aliases) {
  return aliases.some((alias) => text.includes(normalizeText(alias)));
}

export function getConceptMatches(question) {
  const text = normalizeText(question);
  return Object.entries(CONCEPTS)
    .filter(([, concept]) => includesAlias(text, [concept.title, ...concept.aliases]))
    .map(([key]) => key);
}

export function getFilmMatches(question) {
  const text = normalizeText(question);
  return Object.entries(FILM_ANALYSES)
    .filter(([, film]) => includesAlias(text, [film.title, ...film.aliases]))
    .map(([key]) => key);
}

export function classifyQuestion(question) {
  const text = normalizeText(question);
  const conceptKeys = getConceptMatches(question);
  const filmKeys = getFilmMatches(question);
  const filmConceptKeys = Object.keys(FILMS).filter((key) => text.includes(normalizeText(key)));
  const hasAcademicTerm = ACADEMIC_TERMS.some((term) => text.includes(normalizeText(term)));
  const wantsAnalysis = ANALYSIS_TERMS.some((term) => text.includes(term));
  const inScope =
    conceptKeys.length > 0 ||
    filmKeys.length > 0 ||
    filmConceptKeys.length > 0 ||
    hasAcademicTerm;

  if (!inScope) {
    return {
      intent: "outOfScope",
      conceptKeys: [],
      filmKeys: [],
    };
  }

  if (filmKeys.length > 0 && wantsAnalysis) {
    return {
      intent: "filmAnalysis",
      conceptKeys,
      filmKeys,
    };
  }

  if (conceptKeys.length > 0) {
    return {
      intent: "concept",
      conceptKeys,
      filmKeys,
    };
  }

  if (filmKeys.length > 0) {
    return {
      intent: "filmAnalysis",
      conceptKeys,
      filmKeys,
    };
  }

  return {
    intent: "general",
    conceptKeys,
    filmKeys,
  };
}
