import { useState } from "react";
import { loadApiKey, loadStudent } from "./utils/storage";
import StudentLogin from "./components/StudentLogin";
import ApiKeySetup  from "./components/ApiKeySetup";
import ChatInterface from "./components/ChatInterface";

/**
 * Flujo de acceso:
 * 1. ¿Hay datos de alumno verificados? → si no → StudentLogin
 * 2. ¿Hay API key de Groq?             → si no → ApiKeySetup
 * 3. Todo OK                           → ChatInterface
 */
export default function App() {
  const [student, setStudent] = useState(() => loadStudent());
  const [apiKey,  setApiKey]  = useState(() => loadApiKey());

  if (!student) {
    return <StudentLogin onReady={setStudent} />;
  }

  if (!apiKey) {
    return <ApiKeySetup onReady={setApiKey} />;
  }

  return (
    <ChatInterface
      apiKey={apiKey}
      student={student}
      onLogout={() => setApiKey("")}
      onLogoutStudent={() => { setStudent(null); setApiKey(""); }}
    />
  );
}
