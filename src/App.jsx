import { useState, useRef } from "react";
import ModelLoader from "./components/ModelLoader";
import ChatInterface from "./components/ChatInterface";

/**
 * PROBLEMA RESUELTO:
 * pipeline() de Transformers.js retorna una instancia de `Callable extends Function`.
 * typeof pipeline_instance === "function" → true.
 * React detecta eso y llama pipeline(estadoAnterior) como si fuera un setter.
 * Eso dispara "Input must be a string..." y deja el estado en undefined.
 *
 * SOLUCIÓN:
 * Usar useRef() para guardar el pipeline — los refs nunca interpretan funciones
 * como actualizadores. Un useState booleano controla el re-render.
 */
export default function App() {
  const engineRef = useRef(null);          // ← ref, no state
  const [ready, setReady] = useState(false);

  const handleReady = (pipe) => {
    engineRef.current = pipe;              // guarda el pipeline sin que React lo llame
    setReady(true);                        // dispara el re-render
  };

  return ready
    ? <ChatInterface engine={engineRef.current} />
    : <ModelLoader onReady={handleReady} />;
}
