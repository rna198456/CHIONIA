import { useState, useRef, useEffect, useCallback } from "react";
import Avatar from "./Avatar";
import LogPanel from "./LogPanel";
import { T } from "../utils/theme";
import {
  SYSTEM_PROMPT, MODE_PROMPTS, MODES, GENERATION_CONFIG,
  SUGGESTIONS, WELCOME_MESSAGE, GROQ_ENDPOINT, GROQ_MODELS,
} from "../data/chionPrompt";
import { logInteraction, clearApiKey } from "../utils/storage";
import { sendToRemoteLog } from "../utils/remoteLog";
import {
  isSpeechSupported, isSynthesisSupported,
  createRecognition, speakInSpanish, stopSpeaking,
} from "../utils/voice";

const MODEL_KEY    = "chion_model";
const getSaved = () => { try { return sessionStorage.getItem(MODEL_KEY) || null; } catch { return null; } };
const saveModel = m => { try { sessionStorage.setItem(MODEL_KEY, m); } catch {} };

// ── Hook responsive ───────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const h  = e => setMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return mobile;
}

// ── Thinking dots ─────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"2px 0" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width:7, height:7, borderRadius:"50%", background:T.amber,
          animation:"dot-bounce 1.2s ease-in-out infinite",
          animationDelay:`${i*0.18}s`,
        }} />
      ))}
    </div>
  );
}

// ── Groq chat ─────────────────────────────────────────────────────────────────
async function callGroq(apiKey, messages) {
  const saved  = getSaved();
  const models = saved ? [saved, ...GROQ_MODELS.filter(m=>m!==saved)] : GROQ_MODELS;
  for (const model of models) {
    const res = await fetch(GROQ_ENDPOINT, {
      method:"POST",
      headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body: JSON.stringify({ model, messages,
        temperature:GENERATION_CONFIG.temperature, max_tokens:GENERATION_CONFIG.max_tokens,
        top_p:GENERATION_CONFIG.top_p, stream:false }),
    });
    if (res.status===404) continue;
    const data = await res.json().catch(()=>({}));
    if (!res.ok) {
      const msg = data?.error?.message||"";
      if (res.status===401) throw new Error("API key inválida. Usá el botón 🔑 para cambiarla.");
      if (res.status===429) throw new Error("Límite de requests. Esperá un minuto.");
      throw new Error(`Error ${res.status}: ${msg||"Error de la API."}`);
    }
    saveModel(model);
    const reply = data?.choices?.[0]?.message?.content??"";
    if (!reply) throw new Error("Respuesta vacía. Intentá de nuevo.");
    return { reply, model };
  }
  throw new Error("Ningún modelo disponible. Verificá tu key en console.groq.com");
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ChatInterface({ apiKey, student, onLogout, onLogoutStudent }) {
  const isMobile = useIsMobile();
  const DEFAULT_MODE = MODES[0];

  const [activeMode,  setActiveMode]  = useState(DEFAULT_MODE);
  const [messages,    setMessages]    = useState([WELCOME_MESSAGE]);
  const [input,       setInput]       = useState("");
  const [generating,  setGenerating]  = useState(false);
  const [showPanel,   setShowPanel]   = useState(false);
  const [activeModel, setActiveModel] = useState(getSaved()||"");

  const [voiceMode,   setVoiceMode]   = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [voiceError,  setVoiceError]  = useState("");

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const abortRef    = useRef(false);
  const recognRef   = useRef(null);

  const speechOk    = isSpeechSupported();
  const synthOk     = isSynthesisSupported();

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);
  useEffect(() => () => { recognRef.current?.stop(); stopSpeaking(); }, []);

  // ── Exportar ─────────────────────────────────────────────────────────────
  const exportConversation = () => {
    const lines = [
      "CHIONIA — Conversación con Michel Chion",
      `Fecha: ${new Date().toLocaleString("es-AR")}`,
      `Modo: ${activeMode.label}`, "─".repeat(60),"",
      ...messages.map(m=>`[${m.role==="user"?"ALUMNO":"MICHEL CHION"}]\n${m.content}\n`),
    ];
    const blob = new Blob([lines.join("\n")],{type:"text/plain;charset=utf-8"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`chion-conversacion-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Detener audio ─────────────────────────────────────────────────────────
  const stopAudio = () => { stopSpeaking(); setIsSpeaking(false); };

  // ── TTS español ───────────────────────────────────────────────────────────
  const speak = useCallback(async (text) => {
    if (!voiceMode || !synthOk) return;
    stopSpeaking();
    await speakInSpanish(text, {
      onStart: () => setIsSpeaking(true),
      onEnd:   () => setIsSpeaking(false),
    });
  }, [voiceMode, synthOk]);

  // ── Enviar mensaje ────────────────────────────────────────────────────────
  const send = useCallback(async (override) => {
    const txt = (override ?? input).trim();
    if (!txt || generating) return;
    stopAudio();
    setTranscript("");
    const userMsg = {role:"user",content:txt};
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput(""); if (textareaRef.current) textareaRef.current.style.height="46px";
    setGenerating(true); abortRef.current=false;
    setMessages(p=>[...p,{role:"assistant",content:""}]);
    try {
      const sys  = SYSTEM_PROMPT+(MODE_PROMPTS[activeMode.id]||"");
      const hist = updated.slice(1).slice(-10).map(({role,content})=>({
        role:role==="model"?"assistant":role, content,
      }));
      const {reply,model} = await callGroq(apiKey,[{role:"system",content:sys},...hist]);
      if (model!==activeModel) setActiveModel(model);
      if (!abortRef.current) {
        setMessages(p=>{const n=[...p];n[n.length-1]={role:"assistant",content:reply};return n;});
        logInteraction(txt,reply); sendToRemoteLog(txt,reply,model);
        speak(reply);
      }
    } catch(err) {
      if (!abortRef.current)
        setMessages(p=>{const n=[...p];n[n.length-1]={role:"assistant",content:`⚠ ${err.message}`};return n;});
    } finally { setGenerating(false); }
  }, [input,generating,messages,activeMode,apiKey,activeModel,speak]);

  // ── Micrófono toggle ──────────────────────────────────────────────────────
  const toggleMic = () => {
    if (isListening) { recognRef.current?.stop(); setIsListening(false); return; }
    setVoiceError("");
    const r = createRecognition();
    if (!r) { setVoiceError("Tu navegador no soporta reconocimiento de voz."); return; }
    let final = "";
    r.onresult = e => {
      let interim="";
      for (let i=e.resultIndex;i<e.results.length;i++) {
        if (e.results[i].isFinal) final+=e.results[i][0].transcript;
        else interim+=e.results[i][0].transcript;
      }
      setTranscript(final+interim);
    };
    r.onend = () => { setIsListening(false); if (final.trim()) { setTranscript(""); send(final.trim()); } };
    r.onerror = e => {
      setIsListening(false);
      if (e.error!=="aborted") setVoiceError(
        e.error==="not-allowed"?"Permiso de micrófono denegado. Habilitalo en el navegador.":
        `Error: ${e.error}`
      );
    };
    recognRef.current=r; r.start(); setIsListening(true);
  };

  // ── Cambio de modo ────────────────────────────────────────────────────────
  const handleModeChange = mode => {
    if (mode.id===activeMode.id) return;
    stopAudio(); recognRef.current?.stop(); setIsListening(false); setTranscript("");
    setActiveMode(mode); setInput(""); abortRef.current=true; setGenerating(false);
    const w = {
      consulta:    WELCOME_MESSAGE,
      analisis:    {role:"assistant",content:"Decime qué película y qué escena estás mirando. Cuanto más describís, más preciso puedo ser."},
      socratico:   {role:"assistant",content:"Bien. Aviso: no voy a darte respuestas directas. Voy a preguntarte.\n\n¿Sobre qué concepto o escena querés trabajar?"},
      ocultadores: {role:"assistant",content:"Vamos a analizar una escena juntos, siguiendo el método del capítulo 10.\n\nPaso 1 de 6 — ¿Qué película y qué escena vas a analizar?"},
    };
    setMessages([w[mode.id]||WELCOME_MESSAGE]);
    if (textareaRef.current) textareaRef.current.style.height="46px";
  };

  const toggleVoiceMode = () => {
    if (voiceMode) { stopAudio(); recognRef.current?.stop(); setIsListening(false); setTranscript(""); }
    setVoiceMode(v=>!v); setVoiceError("");
  };

  const reset = () => {
    stopAudio(); recognRef.current?.stop(); setIsListening(false); setTranscript("");
    abortRef.current=true; setGenerating(false); handleModeChange(activeMode);
  };

  const handleLogout = () => {
    if (!confirm("¿Eliminar tu API key?")) return;
    clearApiKey(); try{sessionStorage.removeItem(MODEL_KEY);}catch{} onLogout();
  };

  const handleChange = e => {
    setInput(e.target.value);
    const ta=e.target; ta.style.height="auto";
    ta.style.height=Math.min(ta.scrollHeight,120)+"px";
  };

  const placeholders = {
    consulta:"Preguntale a Chion sobre su obra…",
    analisis:"Describí la película y la escena…",
    socratico:"Escribí lo que querés explorar…",
    ocultadores:"Respondé para continuar…",
  };
  const showSuggestions = messages.length===1 && !generating && activeMode.id==="consulta";

  // ── Botones del header ─────────────────────────────────────────────────────
  const headerBtns = [
    {label:"Exportar", icon:"⬇", onClick:exportConversation, title:"Descargar conversación"},
    {label:"Registro", icon:"📊", onClick:()=>setShowPanel(true), title:"Registro de sesión"},
    {label:"Reiniciar",icon:"↺", onClick:reset, title:"Nueva conversación"},
  ];

  return (
    <div style={{
      minHeight:"100vh", background:T.bgBase, color:T.textPrim,
      display:"flex", flexDirection:"column", fontFamily:T.fontBase,
    }}>

      {/* ── HEADER ── */}
      <header style={{
        background:T.bgSurface, borderBottom:`1px solid ${T.borderSub}`,
        padding:"0 16px", height:56,
        display:"flex", alignItems:"center", gap:10,
        position:"sticky", top:0, zIndex:30, flexShrink:0,
      }}>
        <Avatar size={32} />

        {/* Título — se acorta en mobile */}
        <div style={{flex:1, minWidth:0, overflow:"hidden"}}>
          <div style={{fontSize:14,fontWeight:600,color:T.textPrim,letterSpacing:"-0.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            Michel Chion
          </div>
          {!isMobile && (
            <div style={{fontSize:11,color:T.textMuted,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {activeModel||"Groq AI"} · {activeMode.label}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div style={{display:"flex",gap:isMobile?4:6,alignItems:"center",flexShrink:0}}>

          {/* Indicador online — solo desktop */}
          {!isMobile && (
            <div style={{display:"flex",alignItems:"center",gap:4,marginRight:4}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",display:"block"}}/>
              <span style={{fontSize:11,color:T.textMuted}}>En línea</span>
            </div>
          )}

          {/* Toggle voz */}
          {speechOk && (
            <button onClick={toggleVoiceMode} title={voiceMode?"Volver a texto":"Activar voz"} style={{
              display:"flex",alignItems:"center",gap:isMobile?0:5,
              padding:isMobile?"0 9px":"0 12px", height:34, borderRadius:T.radiusMd,
              border:`1px solid ${voiceMode?T.amber:T.borderSub}`,
              background:voiceMode?T.amberBg:T.bgCard,
              color:voiceMode?T.amber:T.textSec,
              fontSize:isMobile?16:12, fontWeight:voiceMode?600:400,
              cursor:"pointer",fontFamily:T.fontBase,transition:T.transition,minWidth:34,
            }}>
              <span>🎙</span>
              {!isMobile && <span>{voiceMode?"Voz activa":"Voz"}</span>}
            </button>
          )}

          {/* Botones secundarios */}
          {headerBtns.map((btn,i)=>(
            <button key={i} onClick={btn.onClick} title={btn.title} style={{
              display:"flex",alignItems:"center",justifyContent:"center",gap:isMobile?0:5,
              padding:isMobile?"0 9px":"0 12px", height:34, minWidth:34,
              borderRadius:T.radiusMd, border:`1px solid ${T.borderSub}`,
              background:T.bgCard, color:T.textSec,
              fontSize:isMobile?15:12, fontWeight:500,
              cursor:"pointer",fontFamily:T.fontBase,transition:T.transition,
              whiteSpace:"nowrap",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.borderStr;e.currentTarget.style.color=T.textPrim;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.borderSub;e.currentTarget.style.color=T.textSec;}}>
              <span>{btn.icon}</span>
              {!isMobile && <span>{btn.label}</span>}
            </button>
          ))}

          <button onClick={handleLogout} title="Cambiar API key" style={{
            padding:"0 8px",height:34,border:`1px solid ${T.borderSub}`,
            background:"transparent",borderRadius:T.radiusMd,
            color:T.textMuted,fontSize:14,cursor:"pointer",minWidth:34,
          }}>🔑</button>
          {onLogoutStudent && (
            <button onClick={() => { if(confirm("¿Cerrar tu sesión? Tendrás que ingresar tu DNI y PIN de nuevo.")) onLogoutStudent(); }}
            title="Cerrar sesión" style={{
              padding:"0 8px",height:34,border:`1px solid ${T.borderSub}`,
              background:"transparent",borderRadius:T.radiusMd,
              color:T.textMuted,fontSize:13,cursor:"pointer",minWidth:34,
            }}>⏻</button>
          )}
        </div>
      </header>

      {showPanel && <LogPanel onClose={()=>setShowPanel(false)}/>}

      {/* ── BARRA DE MODOS — sticky debajo del header ── */}
      <div style={{
        background:T.bgSurface, borderBottom:`1px solid ${T.borderSub}`,
        padding:"0 12px", height:44,
        display:"flex", alignItems:"center", gap:isMobile?2:4,
        overflowX:"auto", flexShrink:0,
        position:"sticky", top:56, zIndex:20,
        // Ocultar scrollbar pero mantener scroll
        scrollbarWidth:"none", msOverflowStyle:"none",
      }}>
        {MODES.map(mode=>{
          const isActive=activeMode.id===mode.id;
          return (
            <button key={mode.id} onClick={()=>handleModeChange(mode)} title={mode.desc} style={{
              display:"flex",alignItems:"center",
              padding:isMobile?"0 10px":"0 14px",
              height:30, minHeight:30,
              borderRadius:T.radiusFull, whiteSpace:"nowrap", flexShrink:0,
              fontSize:isMobile?11:12, fontWeight:isActive?600:400,
              fontFamily:T.fontBase, cursor:"pointer",
              border:`1px solid ${isActive?mode.border:"transparent"}`,
              background:isActive?mode.bg:"transparent",
              color:isActive?mode.color:T.textSec, transition:T.transition,
            }}
            onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background=T.bgCard;e.currentTarget.style.color=T.textPrim;}}}
            onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.textSec;}}}>
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* ── MENSAJES ── */}
      <div style={{flex:1,overflowY:"auto",padding:isMobile?"16px 12px 0":"20px 20px 0"}}>
        <div style={{maxWidth:720,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>

          {activeMode.id!=="consulta" && (
            <div style={{
              alignSelf:"center",padding:"5px 14px",borderRadius:T.radiusFull,
              border:`1px solid ${activeMode.border}`,background:activeMode.bg,
              fontSize:11,color:activeMode.color,fontWeight:500,
            }}>{activeMode.label}</div>
          )}

          {messages.map((m,i)=>{
            const isUser=m.role==="user";
            const isLoad=m.content===""&&generating&&i===messages.length-1;
            return (
              <div key={i} style={{
                display:"flex",gap:8,
                justifyContent:isUser?"flex-end":"flex-start",
                alignItems:"flex-start",
              }}>
                {!isUser && <Avatar size={isMobile?24:28}/>}
                <div style={{
                  maxWidth:isMobile?"88%":"76%",
                  padding:isLoad?"14px 16px":"11px 15px",
                  borderRadius:isUser?"14px 4px 14px 14px":"4px 14px 14px 14px",
                  fontSize:isMobile?13.5:14, lineHeight:1.7, whiteSpace:"pre-wrap",
                  background:isUser?T.amberDim:T.bgCard,
                  color:isUser?T.amberText:T.textPrim,
                  border:!isUser?`1px solid ${T.borderSub}`:"none",
                }}>
                  {isLoad?<ThinkingDots/>:m.content}
                </div>
              </div>
            );
          })}

          {showSuggestions && (
            <div style={{marginTop:8}}>
              <p style={{fontSize:11,color:T.textMuted,textAlign:"center",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                Preguntas sugeridas
              </p>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
                {SUGGESTIONS.map((s,i)=>(
                  <button key={i} onClick={()=>send(s)} style={{
                    textAlign:"left",fontSize:12,lineHeight:1.55,
                    background:T.bgCard,border:`1px solid ${T.borderSub}`,
                    borderRadius:T.radiusMd,padding:isMobile?"10px 12px":"10px 14px",
                    color:T.textSec,cursor:"pointer",fontFamily:T.fontBase,
                    minHeight:44, transition:T.transition,
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.amber;e.currentTarget.style.color=T.textPrim;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.borderSub;e.currentTarget.style.color=T.textSec;}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} style={{height:16}}/>
        </div>
      </div>

      {/* ── ÁREA DE INPUT — sticky en el fondo ── */}
      <div style={{
        background:T.bgSurface, borderTop:`1px solid ${T.borderSub}`,
        padding:isMobile?"10px 12px 12px":"14px 20px 16px",
        position:"sticky", bottom:0, zIndex:20, flexShrink:0,
      }}>
        <div style={{maxWidth:720,margin:"0 auto"}}>

          {/* MODO TEXTO */}
          {!voiceMode && (
            <div style={{
              display:"flex",gap:8,alignItems:"flex-end",
              background:T.bgCard,border:`1px solid ${T.borderMid}`,
              borderRadius:14,padding:"8px 8px 8px 14px",transition:T.transition,
            }}
            onFocusCapture={e=>e.currentTarget.style.borderColor=T.amber}
            onBlurCapture={e=>e.currentTarget.style.borderColor=T.borderMid}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleChange}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                placeholder={placeholders[activeMode.id]}
                rows={1}
                style={{
                  flex:1,background:"transparent",border:"none",outline:"none",
                  fontSize:isMobile?14:14,color:T.textPrim,resize:"none",
                  minHeight:26,maxHeight:120,lineHeight:1.6,
                  fontFamily:T.fontBase,padding:0,
                }}
              />
              <button onClick={()=>send()} disabled={!input.trim()||generating} style={{
                width:38,height:38,borderRadius:10,border:"none",
                background:input.trim()&&!generating?T.amber:T.bgInset,
                color:input.trim()&&!generating?"#fff":T.textMuted,
                cursor:input.trim()&&!generating?"pointer":"default",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:18,flexShrink:0,transition:T.transition,
              }}>
                {generating?"…":"↑"}
              </button>
            </div>
          )}

          {/* MODO VOZ */}
          {voiceMode && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
              {transcript && (
                <div style={{
                  width:"100%",padding:"10px 16px",borderRadius:T.radiusMd,
                  background:T.bgCard,border:`1px solid ${T.borderSub}`,
                  fontSize:13,color:T.textSec,fontStyle:"italic",textAlign:"center",
                }}>
                  {transcript}
                </div>
              )}
              {voiceError && <div style={{fontSize:12,color:T.error,textAlign:"center"}}>⚠ {voiceError}</div>}

              {isSpeaking ? (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",alignItems:"flex-end",gap:4,height:32}}>
                    {[0,1,2,3,4,5,6].map(i=>(
                      <div key={i} style={{
                        width:4,borderRadius:3,background:T.amber,minHeight:4,
                        animation:"voice-wave 0.7s ease-in-out infinite alternate",
                        animationDelay:`${i*0.09}s`,
                      }}/>
                    ))}
                  </div>
                  <span style={{fontSize:12,color:T.textSec}}>Chion está hablando…</span>
                  <button onClick={stopAudio} style={{
                    padding:"7px 18px",borderRadius:T.radiusMd,
                    border:`1px solid ${T.borderSub}`,background:T.bgCard,
                    color:T.textSec,fontSize:12,cursor:"pointer",fontFamily:T.fontBase,minHeight:36,
                  }}>⏹ Detener</button>
                </div>
              ) : generating ? (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                  <ThinkingDots/>
                  <span style={{fontSize:12,color:T.textMuted}}>Generando respuesta…</span>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                  <button onClick={toggleMic} style={{
                    width:68,height:68,borderRadius:"50%",border:"none",
                    background:isListening
                      ?"radial-gradient(circle,#c03020,#8a1a0a)"
                      :`radial-gradient(circle,${T.amber},${T.amberDim})`,
                    cursor:"pointer",fontSize:26,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    boxShadow:isListening
                      ?"0 0 0 8px rgba(192,48,32,0.2),0 0 0 16px rgba(192,48,32,0.07)"
                      :`0 0 0 6px ${T.amberBg}`,
                    transition:"all 0.2s",
                    animation:isListening?"mic-pulse 1.2s ease-in-out infinite":"none",
                  }}>
                    {isListening?"⏹":"🎙"}
                  </button>
                  <span style={{fontSize:12,color:T.textSec}}>
                    {isListening?"Escuchando… click para enviar":"Click para hablar"}
                  </span>
                </div>
              )}
            </div>
          )}

          <p style={{textAlign:"center",fontSize:10,color:T.textMuted,marginTop:8}}>
            «La Audiovisión» (Paidós, 1993) · Consultas registradas localmente
          </p>
        </div>
      </div>

      <style>{`
        @keyframes dot-bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes mic-pulse  { 0%,100%{box-shadow:0 0 0 6px rgba(192,48,32,0.15),0 0 0 12px rgba(192,48,32,0.05)} 50%{box-shadow:0 0 0 12px rgba(192,48,32,0.2),0 0 0 24px rgba(192,48,32,0.08)} }
        @keyframes voice-wave { from{height:4px} to{height:28px} }
        textarea::placeholder{color:${T.textMuted};}
        div[style*="scrollbar-width"]::-webkit-scrollbar{display:none;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${T.borderMid};border-radius:4px;}
      `}</style>
    </div>
  );
}
