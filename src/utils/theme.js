/**
 * theme.js — Sistema de diseño centralizado
 * Principios: minimalista, moderno, accesible (WCAG AA)
 */
export const T = {
  // ── Fondos ────────────────────────────────────────────────────────────────
  bgBase:    "#0f0f0f",   // fondo principal
  bgSurface: "#171717",   // header, footer, paneles
  bgCard:    "#222222",   // burbujas, cards
  bgInset:   "#2a2a2a",   // inputs, items internos

  // ── Bordes ────────────────────────────────────────────────────────────────
  borderSub: "#2e2e2e",   // bordes sutiles
  borderMid: "#3a3a3a",   // bordes medios
  borderStr: "#4a4a4a",   // bordes fuertes

  // ── Texto — todos pasan WCAG AA sobre bgCard ─────────────────────────────
  textPrim:  "#f0ece0",   // texto principal — 13.8:1 sobre bgCard
  textSec:   "#a8a49a",   // texto secundario — 5.1:1
  textMuted: "#6e6a62",   // texto desactivado — 3.1:1 (solo decorativo)

  // ── Acento ámbar ─────────────────────────────────────────────────────────
  amber:     "#d4843c",   // 4.8:1 sobre bgCard — pasa AA
  amberDim:  "#8a4a14",   // fondo de botón activo
  amberBg:   "#1c0e04",   // fondo sutil ámbar
  amberText: "#fde8c0",   // texto sobre fondo ámbar oscuro

  // ── Modos (colores accesibles sobre bgCard) ───────────────────────────────
  blue:      "#6ba3d6",   // 5.2:1
  blueBg:    "#0d1d30",
  blueBorder:"#1e3a5f",

  yellow:    "#c4941a",   // 4.6:1
  yellowBg:  "#1a1304",
  yellowBorder:"#3d2e00",

  green:     "#4a9e68",   // 4.7:1
  greenBg:   "#061410",
  greenBorder:"#0f3320",

  // ── Semánticos ────────────────────────────────────────────────────────────
  success:   "#4a9e68",
  error:     "#d4534a",
  errorBg:   "#1a0604",

  // ── Tipografía ────────────────────────────────────────────────────────────
  fontBase:  "'Inter', 'Helvetica Neue', system-ui, sans-serif",
  fontMono:  "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",

  // ── Radios ────────────────────────────────────────────────────────────────
  radiusSm:  "6px",
  radiusMd:  "10px",
  radiusLg:  "14px",
  radiusFull:"9999px",

  // ── Transiciones ─────────────────────────────────────────────────────────
  transition:"all 0.15s ease",
};

// Estilos de botón reutilizables
export const btnBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  border: "none",
  borderRadius: T.radiusMd,
  cursor: "pointer",
  fontFamily: T.fontBase,
  fontWeight: 500,
  transition: T.transition,
  minHeight: "36px",
  padding: "0 14px",
};
