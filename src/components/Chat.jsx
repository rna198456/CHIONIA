import { useEffect, useRef, useState } from "react";
import { SUGGESTIONS, WELCOME_MESSAGE } from "../prompts/chionPrompt.js";
import { searchConcept } from "../utils/searchConcept.js";
import Message from "./Message.jsx";

export default function Chat({ model, modelState, onLoadModel }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAnswering]);

  async function answerQuestion(rawQuestion) {
    const question = rawQuestion.trim();
    if (!question || isAnswering) return;

    setMessages((current) => [...current, { role: "user", content: question }]);
    setInput("");
    setIsAnswering(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "46px";
    }

    const closedResult = searchConcept(question);
    let answer = closedResult.answer;

    if (model?.isReady && closedResult.source !== "filter") {
      try {
        answer = await model.generate({
          question,
          closedAnswer: closedResult.answer,
        });
      } catch (error) {
        answer =
          closedResult.answer +
          "\n\nNota técnica: el modelo local falló, así que mantengo la respuesta de la base cerrada.";
        console.error("[LocalModel]", error);
      }
    }

    setMessages((current) => [...current, { role: "assistant", content: answer }]);
    setIsAnswering(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    answerQuestion(input);
  }

  function handleInput(event) {
    setInput(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 144)}px`;
  }

  function resetChat() {
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    setIsAnswering(false);
  }

  const showSuggestions = messages.length === 1 && !isAnswering;
  const canLoadModel = !model?.isReady && modelState.status !== "loading";

  return (
    <main className="chat-layout">
      <header className="chat-header">
        <div className="chat-header-inner">
          <div className="chat-title">
            <strong>CHIONIA</strong>
            <span>
              Base cerrada de Michel Chion
              {model?.isReady ? ` · LLM local: ${model.model.label}` : " · sin streaming"}
            </span>
          </div>
          <div className="status-row">
            <span className="pill">
              {model?.isReady ? "LLM local activo" : "Base cerrada activa"}
            </span>
            {modelState.status === "loading" && (
              <span className="pill">Cargando {modelState.progress}%</span>
            )}
            {canLoadModel && (
              <button type="button" className="ghost-button" onClick={onLoadModel}>
                Cargar LLM
              </button>
            )}
            <button type="button" className="ghost-button" onClick={resetChat}>
              Reiniciar
            </button>
          </div>
        </div>
      </header>

      <section className="messages" aria-live="polite">
        {messages.map((message, index) => (
          <Message
            key={`${message.role}-${index}`}
            role={message.role}
            content={message.content}
          />
        ))}

        {isAnswering && <Message role="assistant" loading />}

        {showSuggestions && (
          <div className="suggestions" aria-label="Preguntas sugeridas">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => answerQuestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </section>

      <form className="composer-wrap" onSubmit={handleSubmit}>
        <div className="composer">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                answerQuestion(input);
              }
            }}
            placeholder="Preguntá por Chion, sonido cinematográfico o análisis de una película..."
            rows={1}
            disabled={isAnswering}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={!input.trim() || isAnswering}
          >
            Enviar
          </button>
        </div>
      </form>
    </main>
  );
}
