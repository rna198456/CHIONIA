import { useState } from "react";
import { loadApiKey } from "./utils/storage";
import ApiKeySetup from "./components/ApiKeySetup";
import ChatInterface from "./components/ChatInterface";

/**
 * App comprueba si ya hay una API key guardada en localStorage.
 * - Si hay key → va directo al chat
 * - Si no hay  → muestra la pantalla de onboarding (ApiKeySetup)
 */
export default function App() {
  const [apiKey, setApiKey] = useState(() => loadApiKey());

  if (!apiKey) {
    return <ApiKeySetup onReady={setApiKey} />;
  }

  return (
    <ChatInterface
      apiKey={apiKey}
      onLogout={() => setApiKey("")}
    />
  );
}
