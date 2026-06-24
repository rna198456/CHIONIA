import { MODEL_CANDIDATES } from "../llm/LocalModel.js";

export default function LoadingScreen({
  modelState,
  onLoadModel,
  onSkipModel,
}) {
  const isLoading = modelState.status === "loading";
  const primaryModel = MODEL_CANDIDATES[0];

  return (
    <main className="loading-screen">
      <section className="screen intro-panel" aria-label="Inicio de CHIONIA">
        <div className="brand-block">
          <p className="eyebrow">Michel Chion · Audiovisión</p>
          <h1>Asistente académico para escuchar cine</h1>
          <p className="lede">
            CHIONIA responde solo sobre Michel Chion y análisis sonoro. Primero
            consulta una base cerrada de conceptos y películas; si querés, suma
            un modelo local liviano para redactar con más fluidez.
          </p>
          <div className="feature-row" aria-label="Objetivos técnicos">
            <span className="pill">8 GB RAM</span>
            <span className="pill">CPU/WASM</span>
            <span className="pill">Chrome</span>
            <span className="pill">GitHub Pages</span>
            <span className="pill">Sin WebGPU obligatorio</span>
          </div>
        </div>

        <aside className="load-panel">
          <div>
            <p className="eyebrow">Modo recomendado</p>
            <h2>Base cerrada primero</h2>
            <p className="muted">
              Funciona al instante y evita alucinaciones. El modelo opcional
              intenta cargar {primaryModel.label} ({primaryModel.size}) en CPU.
            </p>
          </div>

          {isLoading && (
            <div>
              <div className="status-row">
                <span className="pill">{modelState.model?.label}</span>
                <span className="pill">{modelState.progress}%</span>
              </div>
              <p className="muted">{modelState.file || "Preparando descarga..."}</p>
              <div className="progress-track" aria-label="Progreso de carga">
                <div
                  className="progress-bar"
                  style={{ width: `${modelState.progress}%` }}
                />
              </div>
            </div>
          )}

          {modelState.error && <div className="error-box">{modelState.error}</div>}

          <div className="load-actions">
            <button
              type="button"
              className="primary-button"
              onClick={onSkipModel}
              disabled={isLoading}
            >
              Entrar con base cerrada
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onLoadModel}
              disabled={isLoading}
            >
              {isLoading ? "Cargando modelo..." : "Cargar LLM local"}
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
