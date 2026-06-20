import { useState, useEffect } from "react";
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { MODEL_ID } from "../data/chionPrompt";
import Avatar from "./Avatar";

const C = {
  bg: "#0e0e0e",
  surface: "#161616",
  card: "#202020",
  border: "#2d2d2d",
  muted: "#666",
  text: "#e2e0d8",
  amber: "#c47c30",
  amberLight: "#fde8c0",
  green: "#22c55e",
  red: "#ef4444",
};

// Calcula tamaño aproximado según el modelo
const MODEL_SIZES = {
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": "~0.9 GB",
  "Qwen2.5-3B-Instruct-q4f16_1-MLC": "~1.9 GB",
  "Phi-3.5-mini-instruct-q4f16_1-MLC": "~2.2 GB",
  "Llama-3.2-3B-Instruct-q4f16_1-MLC": "~1.7 GB",
};

export default function ModelLoader({ onReady }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | error
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [webgpuOk, setWebgpuOk] = useState(null); // null = checking

  // Verifica soporte de WebGPU al montar
  useEffect(() => {
    const check = async () => {
      if (!("gpu" in navigator)) {
        setWebgpuOk(false);
        return;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        setWebgpuOk(!!adapter);
      } catch {
        setWebgpuOk(false);
      }
    };
    check();
  }, []);

  const handleLoad = async () => {
    setPhase("loading");
    setProgress(0);
    setStatusText("Iniciando…");

    try {
      const engine = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report) => {
          const pct = Math.round((report.progress || 0) * 100);
          setProgress(pct);
          // Simplify verbose status text for students
          const raw = report.text || "";
          if (raw.includes("Fetching") || raw.includes("fetch")) {
            setStatusText(`Descargando modelo… ${pct}%`);
          } else if (raw.includes("Loading") || raw.includes("load")) {
            setStatusText(`Cargando en GPU… ${pct}%`);
          } else if (raw.includes("Init") || raw.includes("init")) {
            setStatusText(`Inicializando… ${pct}%`);
          } else {
            setStatusText(raw || `Cargando… ${pct}%`);
          }
        },
      });

      onReady(engine);
    } catch (err) {
      console.error("[WebLLM]", err);
      setError(
        err.message?.includes("WebGPU")
          ? "Tu navegador no tiene WebGPU habilitado. Usá Chrome o Edge versión 113+."
          : err.message || "Error al inicializar el modelo."
      );
      setPhase("error");
    }
  };

  const modelSize = MODEL_SIZES[MODEL_ID] || "~2 GB";
  const isLoading = phase === "loading";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 32,
          textAlign: "center",
        }}
      >
        {/* Avatar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Avatar size={72} />
        </div>

        <h1
          style={{
            margin: "0 0 4px",
            fontSize: 22,
            fontWeight: 700,
            color: "#f0ece0",
            letterSpacing: "0.01em",
          }}
        >
          Michel Chion
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: C.muted }}>
          Especialista en Audiovisión · Modelo local · Costo $0
        </p>

        {/* WebGPU check */}
        {webgpuOk === false && (
          <div
            style={{
              background: "#450a0a",
              border: `1px solid #7f1d1d`,
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            <div style={{ color: C.red, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              ⚠ WebGPU no disponible
            </div>
            <div style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.6 }}>
              Este bot requiere WebGPU. Usá <strong>Chrome</strong> o{" "}
              <strong>Edge</strong> versión 113 o superior en computadora de
              escritorio. No funciona en Firefox ni iOS.
            </div>
          </div>
        )}

        {/* Info sobre la primera carga */}
        {phase === "idle" && (
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 24,
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: C.amber,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              Modelo: {MODEL_ID}
            </div>
            <ul
              style={{
                margin: 0,
                padding: "0 0 0 16px",
                fontSize: 12,
                color: C.muted,
                lineHeight: 1.8,
              }}
            >
              <li>
                <strong style={{ color: C.text }}>Primera carga:</strong> descarga{" "}
                {modelSize} desde HuggingFace CDN
              </li>
              <li>
                <strong style={{ color: C.text }}>Cargas siguientes:</strong> desde caché
                del navegador (instantáneo)
              </li>
              <li>
                <strong style={{ color: C.text }}>Se ejecuta 100% localmente</strong>{" "}
                — sin servidores, sin API, sin costo
              </li>
              <li>
                <strong style={{ color: C.text }}>Requiere:</strong> Chrome/Edge 113+,
                ~4 GB RAM libres
              </li>
            </ul>
          </div>
        )}

        {/* Barra de progreso */}
        {isLoading && (
          <div style={{ marginBottom: 24, textAlign: "left" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                fontSize: 12,
              }}
            >
              <span style={{ color: C.muted }}>{statusText}</span>
              <span style={{ color: C.amber, fontWeight: 600 }}>{progress}%</span>
            </div>
            <div
              style={{
                height: 8,
                background: C.card,
                borderRadius: 4,
                overflow: "hidden",
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, #7a441a, ${C.amber})`,
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                  boxShadow: `0 0 8px ${C.amber}60`,
                }}
              />
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 11,
                color: "#444",
                textAlign: "center",
              }}
            >
              {progress < 100
                ? "La descarga se guarda en caché. No vas a volver a esperar esto."
                : "Inicializando GPU…"}
            </div>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div
            style={{
              background: "#450a0a",
              border: `1px solid #7f1d1d`,
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            <div style={{ color: C.red, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              Error al cargar el modelo
            </div>
            <div style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.6 }}>
              {error}
            </div>
          </div>
        )}

        {/* Botón */}
        <button
          onClick={phase === "error" ? () => setPhase("idle") : handleLoad}
          disabled={isLoading || webgpuOk === false}
          style={{
            width: "100%",
            padding: "13px 24px",
            background:
              isLoading || webgpuOk === false
                ? C.card
                : `linear-gradient(135deg, #7a441a, ${C.amber})`,
            color:
              isLoading || webgpuOk === false ? C.muted : C.amberLight,
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor:
              isLoading || webgpuOk === false ? "default" : "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.02em",
          }}
        >
          {isLoading
            ? `Cargando… ${progress}%`
            : phase === "error"
            ? "Reintentar"
            : "Cargar modelo e iniciar"}
        </button>

        <p
          style={{
            margin: "16px 0 0",
            fontSize: 10,
            color: "#333",
            lineHeight: 1.6,
          }}
        >
          Basado en «La Audiovisión» (Paidós, 1993) · Simulación académica con IA local ·
          Las consultas quedan registradas localmente con fines pedagógicos
        </p>
      </div>
    </div>
  );
}
