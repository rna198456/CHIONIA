import { useState } from "react";
import ModelLoader from "./components/ModelLoader";
import ChatInterface from "./components/ChatInterface";

/**
 * App gestiona una sola pieza de estado: el engine de WebLLM.
 * - engine === null  → pantalla de carga del modelo (ModelLoader)
 * - engine !== null  → interfaz de chat (ChatInterface)
 *
 * El engine se crea una sola vez y se pasa como prop a ChatInterface.
 * No se recrea entre conversaciones (solo se reinicia el historial).
 */
export default function App() {
  const [engine, setEngine] = useState(null);

  return engine ? (
    <ChatInterface engine={engine} />
  ) : (
    <ModelLoader onReady={setEngine} />
  );
}
