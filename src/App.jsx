import { useMemo, useState } from "react";
import Chat from "./components/Chat.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import { LocalModel } from "./llm/LocalModel.js";

const INITIAL_MODEL_STATE = {
  status: "idle",
  progress: 0,
  file: "",
  model: null,
  error: "",
};

export default function App() {
  const model = useMemo(() => new LocalModel(), []);
  const [hasEntered, setHasEntered] = useState(false);
  const [modelState, setModelState] = useState(INITIAL_MODEL_STATE);

  async function loadModel() {
    if (model.isReady || modelState.status === "loading") return;

    setModelState({ ...INITIAL_MODEL_STATE, status: "loading" });

    try {
      await model.load((progress) => {
        setModelState((current) => ({
          ...current,
          ...progress,
          error: "",
        }));
      });
      setHasEntered(true);
    } catch (error) {
      setModelState((current) => ({
        ...current,
        status: "error",
        error:
          "No se pudo cargar el modelo local. Podés seguir usando la base cerrada. Detalle: " +
          (error.message || String(error)),
      }));
    }
  }

  if (!hasEntered) {
    return (
      <div className="app-shell">
        <LoadingScreen
          modelState={modelState}
          onLoadModel={loadModel}
          onSkipModel={() => setHasEntered(true)}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Chat model={model} modelState={modelState} onLoadModel={loadModel} />
    </div>
  );
}
