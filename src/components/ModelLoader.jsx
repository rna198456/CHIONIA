import { useState, useEffect } from "react";
import { pipeline } from "@huggingface/transformers";
import { MODELS } from "../data/chionPrompt";
import Avatar from "./Avatar";

const C = {
  bg: "#0e0e0e", surface: "#161616", card: "#202020",
  border: "#2d2d2d", muted: "#666", text: "#e2e0d8",
  amber: "#c47c30", amberText: "#fde8c0",
  green: "#22c55e", red: "#ef4444",
};

async function detectDevice() {
  if (!("gpu" in navigator)) return "wasm";
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

export default function ModelLoader({ onReady }) {
  const [phase, setPhase] = useState("idle");
  const [device, setDevice] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setPhase("detecting");
    detectDevice().then((d) => { setDevice(d); setPhase("idle"); });
  }, []);

  const handleLoad = async () => {
    if (!device) return;
    const model = MODELS[device];
    setPhase("loading");
    setProgress(0);
    setCurrentFile("");

    try {
      const pipe = await pipeline("text-generation", model.id, {
        device,
        dtype: model.dtype,
        progress_callback: (info) => {
          if (info.status === "progress" && info.progress != null) {
            setProgress(Math.min(99, Math.round(info.progress)));
            if (info.file) setCurrentFile(info.file.split("/").pop() || info.file);
          }
          if (info.status === "done") { setProgress(100); setCurrentFile("Listo"); }
        },
      });
      onReady(pipe);
    } catch (err) {
      console.error("[Transformers.js]", err);
      setError(
        err.message?.includes("oom") || err.message?.includes("memory")
          ? "Sin memoria suficiente. Cerrá otras pestañas e intentá de nuevo."
          : err.message || "Error al cargar el modelo."
      );
      setPhase("error");
    }
  };

  const model = device ? MODELS[device] : null;
  const isWasm = device === "wasm";
  const isLoading = phase === "loading";

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif", padding: 24,
    }}>
      <div style={{
        maxWidth: 480, width: "100%", background: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Avatar size={72} />
        </div>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#f0ece0" }}>Michel Chion</h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: C.muted }}>Especialista en Audiovisión · IA local · $0</p>

        {device && !isLoading && phase !== "error" && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px",
            borderRadius: 20, marginBottom: 20,
            background: isWasm ? "#1a1a08" : "#081a08",
            border: `1px solid ${isWasm ? "#5a5a10" : "#10571a"}`,
          }}>
            <span style={{ fontSize: 13 }}>{isWasm ? "🖥" : "⚡"}</span>
            <span style={{ fontSize: 12, color: isWasm ? "#c8c848" : C.green }}>
              {isWasm ? "Modo CPU — funciona sin WebGPU ✓" : "Modo WebGPU — acelerado ✓"}
            </span>
          </div>
        )}

        {phase === "idle" && model && (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "14px 16px", marginBottom: 20, textAlign: "left",
          }}>
            <div style={{ fontSize: 10, color: C.amber, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              {model.label}
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, color: C.muted, lineHeight: 1.9 }}>
              <li><strong style={{ color: C.text }}>Descarga:</strong> {model.size} (solo la primera vez, queda en caché)</li>
              <li><strong style={{ color: C.text }}>Velocidad:</strong> {model.tokensPerSec}</li>
              <li><strong style={{ color: C.text }}>Ejecución:</strong> 100% en tu computadora — sin servidor</li>
              <li><strong style={{ color: C.text }}>Navegadores:</strong> Chrome, Edge y Firefox</li>
            </ul>
            {isWasm && (
              <div style={{
                marginTop: 12, padding: "10px 12px", borderRadius: 8,
                background: "#1a1a08", border: "1px solid #5a5a10",
                fontSize: 12, color: "#c8c848", lineHeight: 1.6,
              }}>
                ⏱ <strong>Modo CPU:</strong> cada respuesta tarda entre 15 y 60 segundos según el equipo. Es normal — el modelo corre en tu procesador sin GPU.
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div style={{ marginBottom: 24, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
                {progress < 100 ? (currentFile ? `↓ ${currentFile}` : "Preparando…") : "Inicializando…"}
              </span>
              <span style={{ color: C.amber, fontWeight: 700, flexShrink: 0 }}>{progress}%</span>
            </div>
            <div style={{ height: 8, background: C.card, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: `linear-gradient(90deg, #7a441a, ${C.amber})`,
                borderRadius: 4, transition: "width 0.4s ease",
                boxShadow: `0 0 8px ${C.amber}60`,
              }} />
            </div>
            <p style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 10 }}>
              Esta descarga se guarda en caché — la próxima vez carga en segundos
            </p>
          </div>
        )}

        {phase === "error" && (
          <div style={{
            background: "#450a0a", border: "1px solid #7f1d1d",
            borderRadius: 12, padding: "12px 16px", marginBottom: 20, textAlign: "left",
          }}>
            <div style={{ color: C.red, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Error al cargar</div>
            <div style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.6 }}>{error}</div>
          </div>
        )}

        <button
          onClick={phase === "error" ? () => setPhase("idle") : handleLoad}
          disabled={isLoading || phase === "detecting" || !device}
          style={{
            width: "100%", padding: "13px 24px",
            background: isLoading || !device ? C.card : `linear-gradient(135deg, #7a441a, ${C.amber})`,
            color: isLoading || !device ? C.muted : C.amberText,
            border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: isLoading || !device ? "default" : "pointer", fontFamily: "inherit",
          }}
        >
          {phase === "detecting" && "Detectando…"}
          {phase === "idle" && "Cargar modelo e iniciar"}
          {phase === "loading" && `Descargando… ${progress}%`}
          {phase === "error" && "Reintentar"}
        </button>

        <p style={{ margin: "16px 0 0", fontSize: 10, color: "#333", lineHeight: 1.6 }}>
          Basado en «La Audiovisión» (Paidós, 1993) · Simulación académica con IA local ·
          Las consultas se registran localmente con fines pedagógicos
        </p>
      </div>
    </div>
  );
}
