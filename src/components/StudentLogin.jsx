import { useState } from "react";
import { saveStudent } from "../utils/storage";
import { SHEETS_ENDPOINT, COMISIONES } from "../data/chionPrompt";
import { T } from "../utils/theme";
import Avatar from "./Avatar";

// ── Llama al Apps Script y puede LEER la respuesta ───────────────────────────
async function appsScriptPost(payload) {
  if (!SHEETS_ENDPOINT) {
    // Sin endpoint configurado → modo desarrollo (acceso libre)
    return { ok: true, data: { mock: true } };
  }
  try {
    const res = await fetch(SHEETS_ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function StudentLogin({ onReady }) {
  // step: "dni" → "createPin" | "enterPin" → "done"
  const [step,     setStep]     = useState("dni");
  const [dni,      setDni]      = useState("");
  const [pin,      setPin]      = useState("");
  const [pinConf,  setPinConf]  = useState("");
  const [student,  setStudent]  = useState(null); // datos del padrón
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // ── PASO 1: verificar DNI en el padrón ───────────────────────────────────
  const handleCheckDNI = async () => {
    const dniClean = dni.trim().replace(/\D/g, "");
    if (!dniClean || dniClean.length < 6) {
      setError("Ingresá un DNI válido (solo números, mínimo 6 dígitos).");
      return;
    }
    setLoading(true);
    setError("");

    const { ok, data, error: netErr } = await appsScriptPost({
      action: "check",
      dni:    dniClean,
    });

    setLoading(false);

    if (!ok) {
      // Error de red → modo permisivo para no bloquear al alumno
      setStudent({ dni: dniClean, nombre:"", apellido:"", comision:"" });
      setStep("createPin");
      return;
    }

    if (data.mock) {
      // Modo desarrollo sin Sheets
      setStudent({ dni: dniClean, nombre:"Test", apellido:"Usuario", comision: COMISIONES[0] });
      setStep("createPin");
      return;
    }

    if (!data.found) {
      setError("Tu DNI no figura en el padrón de la cátedra. Consultá con el docente.");
      return;
    }
    if (data.activo === false || String(data.activo).toLowerCase() === "no") {
      setError("Tu acceso está deshabilitado. Contactá al docente de tu comisión.");
      return;
    }

    setStudent({
      dni:      dniClean,
      apellido: data.apellido || "",
      nombre:   data.nombre   || "",
      comision: data.comision || "",
    });

    setStep(data.hasPin ? "enterPin" : "createPin");
  };

  // ── PASO 2a: crear PIN por primera vez ───────────────────────────────────
  const handleCreatePin = async () => {
    if (!/^\d{4,6}$/.test(pin)) {
      setError("El PIN debe tener entre 4 y 6 dígitos numéricos.");
      return;
    }
    if (pin !== pinConf) {
      setError("Los PINs no coinciden. Volvé a ingresarlos.");
      return;
    }
    setLoading(true);
    setError("");

    const { ok, data } = await appsScriptPost({
      action: "registrar",
      dni:    student.dni,
      pin,
    });

    setLoading(false);

    if (!ok || data?.success === false) {
      setError(data?.msg || "No se pudo registrar el PIN. Intentá de nuevo.");
      return;
    }

    const studentData = {
      ...student,
      displayName: `${student.apellido}, ${student.nombre}`.trim() || student.dni,
    };
    saveStudent(studentData);
    onReady(studentData);
  };

  // ── PASO 2b: verificar PIN ────────────────────────────────────────────────
  const handleVerifyPin = async () => {
    if (!/^\d{4,6}$/.test(pin)) {
      setError("Ingresá tu PIN (4 a 6 dígitos).");
      return;
    }
    setLoading(true);
    setError("");

    const { ok, data } = await appsScriptPost({
      action: "verificar",
      dni:    student.dni,
      pin,
    });

    setLoading(false);

    if (!ok) {
      // Error de red → permitir acceso con datos locales
      const studentData = {
        ...student,
        displayName: `${student.apellido}, ${student.nombre}`.trim() || student.dni,
      };
      saveStudent(studentData);
      onReady(studentData);
      return;
    }

    if (!data.allowed) {
      setError("PIN incorrecto. Si lo olvidaste, contactá al docente para que lo resetee.");
      return;
    }

    const studentData = {
      ...student,
      displayName: `${student.apellido}, ${student.nombre}`.trim() || student.dni,
    };
    saveStudent(studentData);
    onReady(studentData);
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const inputStyle = {
    width:"100%", background:T.bgInset,
    border:`1px solid ${T.borderMid}`,
    borderRadius:T.radiusMd, padding:"11px 14px",
    fontSize:14, color:T.textPrim, outline:"none",
    fontFamily:T.fontBase, boxSizing:"border-box",
    transition:T.transition,
    letterSpacing: "0.05em",
  };
  const onFocus = e => { e.target.style.borderColor=T.amber; e.target.style.boxShadow=`0 0 0 3px ${T.amberBg}`; };
  const onBlur  = e => { e.target.style.borderColor=T.borderMid; e.target.style.boxShadow="none"; };

  return (
    <div style={{
      minHeight:"100vh", background:T.bgBase, color:T.textPrim,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:T.fontBase, padding:24,
    }}>
      <div style={{ maxWidth:420, width:"100%" }}>

        {/* Encabezado */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
            <Avatar size={56} />
          </div>
          <h1 style={{ margin:"0 0 5px", fontSize:20, fontWeight:600, color:T.textPrim }}>
            Michel Chion
          </h1>
          <p style={{ margin:0, fontSize:12, color:T.textMuted }}>
            Cátedra Corti · Audiovisión
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:T.bgSurface, border:`1px solid ${T.borderSub}`,
          borderRadius:16, overflow:"hidden",
        }}>

          {/* Indicador de pasos */}
          <div style={{ display:"flex", borderBottom:`1px solid ${T.borderSub}` }}>
            {[
              { id:"dni",      n:"1", label:"Identificación" },
              { id:"enterPin", n:"2", label:"PIN de acceso"  },
            ].map((s, i) => {
              const done  = (s.id==="dni" && step!=="dni") || false;
              const active= s.id===step || (s.id==="enterPin" && step==="createPin");
              return (
                <div key={s.id} style={{
                  flex:1, padding:"12px 16px", display:"flex", alignItems:"center", gap:8,
                  borderRight: i===0 ? `1px solid ${T.borderSub}` : "none",
                  background: active ? T.amberBg : "transparent",
                }}>
                  <div style={{
                    width:22,height:22,borderRadius:"50%",flexShrink:0,
                    background: done?"#15803d" : active?T.amber : T.bgInset,
                    border:`1px solid ${done?"#15803d" : active?T.amber : T.borderSub}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,fontWeight:600,
                    color: done||active?"#fff" : T.textMuted,
                  }}>
                    {done?"✓":s.n}
                  </div>
                  <span style={{
                    fontSize:12,fontWeight:active?600:400,
                    color:active?T.amber:T.textMuted,
                  }}>{s.label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>

            {/* ── PASO 1: DNI ── */}
            {step === "dni" && (
              <>
                <div style={{ fontSize:13, color:T.textSec, lineHeight:1.6, marginBottom:2 }}>
                  Ingresá tu número de DNI para verificar si estás habilitado en la cátedra.
                </div>
                <div>
                  <label style={{ fontSize:12,fontWeight:500,color:T.textSec,display:"block",marginBottom:6 }}>
                    Número de DNI
                  </label>
                  <input
                    type="tel" value={dni} placeholder="30123456"
                    onChange={e=>{ setDni(e.target.value.replace(/\D/g,"")); setError(""); }}
                    onKeyDown={e=>{ if(e.key==="Enter") handleCheckDNI(); }}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                    maxLength={9}
                  />
                </div>
              </>
            )}

            {/* ── PASO 2a: Crear PIN ── */}
            {step === "createPin" && student && (
              <>
                <div style={{
                  padding:"10px 14px", borderRadius:T.radiusMd,
                  background:T.amberBg, border:`1px solid ${T.amberDim}`,
                }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.amber }}>
                    ¡Bienvenido{student.apellido ? `, ${student.apellido}!` : "!"}
                  </div>
                  {student.comision && (
                    <div style={{ fontSize:12, color:T.amberText, marginTop:2 }}>
                      {student.comision}
                    </div>
                  )}
                </div>
                <div style={{ fontSize:13, color:T.textSec, lineHeight:1.6 }}>
                  Es tu primera vez. Creá un PIN de <strong style={{color:T.textPrim}}>4 a 6 dígitos</strong> que vas a usar cada vez que accedas. Guardalo en un lugar seguro.
                </div>
                <div>
                  <label style={{ fontSize:12,fontWeight:500,color:T.textSec,display:"block",marginBottom:6 }}>
                    Nuevo PIN
                  </label>
                  <input
                    type="password" inputMode="numeric" value={pin}
                    placeholder="••••" maxLength={6}
                    onChange={e=>{ setPin(e.target.value.replace(/\D/g,"")); setError(""); }}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  />
                </div>
                <div>
                  <label style={{ fontSize:12,fontWeight:500,color:T.textSec,display:"block",marginBottom:6 }}>
                    Confirmar PIN
                  </label>
                  <input
                    type="password" inputMode="numeric" value={pinConf}
                    placeholder="••••" maxLength={6}
                    onChange={e=>{ setPinConf(e.target.value.replace(/\D/g,"")); setError(""); }}
                    onKeyDown={e=>{ if(e.key==="Enter") handleCreatePin(); }}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  />
                </div>
              </>
            )}

            {/* ── PASO 2b: Ingresar PIN ── */}
            {step === "enterPin" && student && (
              <>
                <div style={{
                  padding:"10px 14px", borderRadius:T.radiusMd,
                  background:T.amberBg, border:`1px solid ${T.amberDim}`,
                }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.amber }}>
                    Bienvenido{student.apellido ? `, ${student.apellido}` : ""}
                  </div>
                  {student.comision && (
                    <div style={{ fontSize:12, color:T.amberText, marginTop:2 }}>
                      {student.comision}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize:12,fontWeight:500,color:T.textSec,display:"block",marginBottom:6 }}>
                    Tu PIN de acceso
                  </label>
                  <input
                    type="password" inputMode="numeric" value={pin}
                    placeholder="••••" maxLength={6} autoFocus
                    onChange={e=>{ setPin(e.target.value.replace(/\D/g,"")); setError(""); }}
                    onKeyDown={e=>{ if(e.key==="Enter") handleVerifyPin(); }}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  />
                  <p style={{ fontSize:11,color:T.textMuted,marginTop:8 }}>
                    ¿Olvidaste tu PIN? Contactá al docente para que lo resetee.
                  </p>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div style={{
                padding:"10px 14px",borderRadius:T.radiusMd,
                background:T.errorBg,border:`1px solid ${T.error}`,
                fontSize:12,color:T.error,lineHeight:1.6,
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Botón */}
            <button
              onClick={
                step==="dni"       ? handleCheckDNI  :
                step==="createPin" ? handleCreatePin :
                                     handleVerifyPin
              }
              disabled={loading}
              style={{
                width:"100%", padding:"13px",
                background: loading ? T.bgInset : T.amber,
                color: loading ? T.textMuted : "#fff",
                border:"none",borderRadius:T.radiusMd,
                fontSize:14,fontWeight:600,
                cursor:loading?"default":"pointer",
                fontFamily:T.fontBase,transition:T.transition,
              }}
            >
              {loading ? "Verificando…" :
               step==="dni" ? "Verificar DNI →" :
               step==="createPin" ? "Crear PIN y acceder →" :
               "Acceder →"}
            </button>

          </div>
        </div>

        <p style={{ textAlign:"center",fontSize:11,color:T.textMuted,marginTop:16,lineHeight:1.6 }}>
          Tu PIN es personal e intransferible · Solo vos lo conocés
        </p>
      </div>
    </div>
  );
}
