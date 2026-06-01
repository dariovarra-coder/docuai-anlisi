import { useState, useRef, useCallback } from "react";

const C = {
  bg: "#0F1117",
  surface: "#171B26",
  surfaceHover: "#1E2333",
  border: "#2A2F42",
  borderLight: "#353B52",
  gold: "#C9A84C",
  goldLight: "#E2C06A",
  goldDim: "#8A6E2E",
  text: "#F0EDE6",
  textMuted: "#8B8FA8",
  textDim: "#555A72",
  green: "#3DBE7A",
  orange: "#E8863A",
  red: "#E05252",
};

const STEPS = [
  {
    id: 1,
    title: "Visura Catastale",
    icon: "🏛️",
    description:
      "Carica la visura catastale storica dell'immobile. La visura storica è preferibile perché consente la ricostruzione completa dei passaggi di proprietà.",
    prompt: (nome) =>
      `Stai analizzando la VISURA CATASTALE dell'immobile "${nome}". Segui rigorosamente il Protocollo GTI® Passo 1:
1. Raccomanda SEMPRE la visura storica e spiega perché.
2. Ricostruisci cronologicamente TUTTI i passaggi di proprietà presenti. Crea una TABELLA CRONOLOGICA.
3. Verifica la coerenza tra intestazioni catastali attuali e ultimo titolo di provenienza.
4. Se presenti successioni: spiega che sono dichiarazioni fiscali, non atti notarili.
5. Individua e riordina TUTTE le diciture "VARIAZIONE" catastali cronologicamente con causale.
6. RED FLAG CRITICO: variazione catastale senza pratica edilizia correlata → WARNING ELEVATO.
7. Ricorda che i dati telematici catastali sono stati meccanizzati il 30/06/1987.`,
  },
  {
    id: 2,
    title: "Planimetria Catastale",
    icon: "📐",
    description:
      "Carica la planimetria catastale (possono essere più di una: immobile principale + pertinenze come cantina, box, soffictta, posto auto).",
    prompt: (nome) =>
      `Stai analizzando la PLANIMETRIA CATASTALE dell'immobile "${nome}". Segui il Protocollo GTI® Passo 2:
1. Analizza le informazioni presenti: interno, piano, altezza, identificativi catastali, pertinenze.
2. Verifica la coerenza con visura e provenienze.
3. Verifica se è presente la dicitura "ultima planimetria in atti".
4. Verifica se la planimetria è RASTERIZZATA. Spiega l'importanza per l'atto.
5. CHIEDI SEMPRE: "Lo stato dei luoghi è conforme alla planimetria catastale ed edilizia?"
6. Se non conforme: spiega necessità pratiche edilizie (CILA tardiva, SCIA in sanatoria).`,
  },
  {
    id: 3,
    title: "Atti di Provenienza",
    icon: "📜",
    description:
      "Carica l'atto di provenienza, eventuali atti precedenti, successioni, pratiche edilizie, condoni, agibilità, APE e certificazioni impianti.",
    prompt: (nome) =>
      `Stai analizzando gli ATTI DI PROVENIENZA dell'immobile "${nome}". Segui il Protocollo GTI® Passo 3:
1. Se SOLO successione come provenienza: spiega che è dichiarazione fiscale, consiglia atto precedente.
2. Analizza l'atto di compravendita: oggetto, dati catastali, quote, diritti reali, coerenza con visura.
3. Verifica presenza titoli edilizi nell'atto.
4. ANTE 67: Se antecedente al 01/09/1967: spiega commerciabilità e necessità ricostruzione urbanistica.
5. AGIBILITÀ: Distingui tra agibilità presente, abitabilità, domanda presentata, assenza.
6. AFFRANCAZIONE: Cerca riferimenti a Legge 865/1971, convenzioni PEEP, prezzo massimo di cessione.
7. Verifica servitù, limitazioni, pesi, ipoteche, vincoli.
8. APE: Verifica presenza. Se assente: obbligatoria dal 01/07/2009.

Poi GENERA IL REPORT FINALE COMPLETO con:
- Documenti analizzati e mancanti
- Ricostruzione cronologica
- Analisi catastale, urbanistica, provenienze, vincoli, commerciabilità
- ⚠️ RED FLAGS (se presenti)
- ✅ Consigli operativi
- 🎯 LIVELLO DI RISCHIO: [BASSO / MEDIO / ALTO / MOLTO ALTO]`,
  },
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function RiskBadge({ level }) {
  const map = {
    basso: { color: "#3DBE7A", label: "RISCHIO BASSO" },
    medio: { color: "#E8863A", label: "RISCHIO MEDIO" },
    alto: { color: "#E05252", label: "RISCHIO ALTO" },
    "molto alto": { color: "#C0392B", label: "RISCHIO MOLTO ALTO" },
  };
  const k = Object.keys(map).find((k) => level?.toLowerCase().includes(k));
  const d = map[k] || { color: C.textMuted, label: "RISCHIO N/D" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:d.color+"22", border:`1px solid ${d.color}55`, color:d.color, borderRadius:6, padding:"4px 12px", fontSize:12, fontWeight:700, letterSpacing:"0.08em" }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background:d.color, display:"inline-block" }} />
      {d.label}
    </span>
  );
}

function Spinner() {
  return <div style={{ width:18, height:18, border:`2px solid ${C.border}`, borderTop:`2px solid ${C.gold}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", display:"inline-block" }} />;
}

function DropZone({ files, onFiles }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handle = (newFiles) => {
    const arr = Array.from(newFiles).filter(f => f.type==="application/pdf" || f.type.startsWith("image/") || f.name.endsWith(".pdf"));
    if (arr.length) onFiles([...files, ...arr]);
  };
  return (
    <div>
      <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files)}}
        onClick={()=>ref.current.click()}
        style={{ border:`2px dashed ${drag?C.gold:C.border}`, borderRadius:10, padding:"28px 20px", textAlign:"center", cursor:"pointer", background:drag?C.gold+"0A":C.surface, transition:"all 0.2s" }}>
        <div style={{fontSize:28,marginBottom:8}}>📎</div>
        <div style={{color:C.text,fontSize:14,fontWeight:600}}>Carica documenti</div>
        <div style={{color:C.textMuted,fontSize:12,marginTop:4}}>Trascina qui o clicca · PDF, JPG, PNG</div>
        <input ref={ref} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" style={{display:"none"}} onChange={e=>handle(e.target.files)} />
      </div>
      {files.length>0 && (
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
          {files.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surfaceHover,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px"}}>
              <span style={{color:C.text,fontSize:13}}>📄 {f.name}</span>
              <button onClick={e=>{e.stopPropagation();onFiles(files.filter((_,j)=>j!==i))}} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:16}}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [analyses, setAnalyses] = useState([]);
  const [newForm, setNewForm] = useState({ nome: "", descrizione: "" });
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepFiles, setStepFiles] = useState([[], [], []]);
  const [stepResults, setStepResults] = useState([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  const handleLogin = (e) => {
    e && e.preventDefault();
    if (!loginForm.email || !loginForm.password) { setLoginError("Inserisci email e password."); return; }
    setUser({ email: loginForm.email });
    setScreen("home");
    setLoginError("");
  };

  const createAnalysis = () => {
    if (!newForm.nome.trim()) return;
    const a = { id: Date.now(), nome: newForm.nome, descrizione: newForm.descrizione, data: new Date().toLocaleDateString("it-IT"), stato: "In corso" };
    setAnalyses(prev => [a, ...prev]);
    setCurrentAnalysis(a);
    setCurrentStep(0);
    setStepFiles([[], [], []]);
    setStepResults([null, null, null]);
    setFinalReport(null);
    setScreen("analysis");
  };

  const analyzeStep = useCallback(async () => {
    const step = STEPS[currentStep];
    const files = stepFiles[currentStep];
    if (!files.length) return;
    setLoading(true);
    try {
      const parts = [];
      for (const f of files) {
        const b64 = await fileToBase64(f);
        const mimeType = f.type || (f.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
        parts.push({ data: b64, mimeType });
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts, prompt: step.prompt(currentAnalysis.nome) }),
      });
      const data = await res.json();
      const text = data.text || data.error || "Errore sconosciuto.";
      setStepResults(prev => { const n=[...prev]; n[currentStep]=text; return n; });
      if (currentStep === 2) {
        setFinalReport(text);
        setAnalyses(prev => prev.map(a => a.id===currentAnalysis.id ? {...a, stato:"Completata"} : a));
        setScreen("report");
      }
    } catch (err) {
      setStepResults(prev => { const n=[...prev]; n[currentStep]="Errore: "+err.message; return n; });
    }
    setLoading(false);
  }, [currentStep, stepFiles, currentAnalysis]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif;}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    .fade{animation:fadeIn 0.4s ease both}
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-track{background:${C.bg}}
    ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
    input,textarea{font-family:'DM Sans',sans-serif;}
    a{color:${C.gold}}
  `;

  const inputStyle = { width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:14, outline:"none", fontFamily:"'DM Sans',sans-serif" };
  const labelStyle = { display:"block", color:C.textMuted, fontSize:11, marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" };
  const btnGold = { background:`linear-gradient(135deg,${C.goldDim},${C.gold})`, border:"none", borderRadius:8, padding:"12px 22px", color:"#0F1117", fontSize:14, fontWeight:700, cursor:"pointer" };
  const btnGhost = { background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"11px 18px", color:C.textMuted, fontSize:13, cursor:"pointer" };

  // LOGIN
  if (screen === "login") return (
    <>
      <style>{css}</style>
      <div className="fade" style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:`radial-gradient(ellipse at 60% 30%,${C.goldDim}18 0%,transparent 60%),${C.bg}`, padding:20 }}>
        <div style={{ width:"100%", maxWidth:420 }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:64, height:64, borderRadius:16, background:`linear-gradient(135deg,${C.goldDim},${C.gold})`, marginBottom:16, fontSize:28 }}>🏠</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:700, color:C.text }}>GTI® Analisi</div>
            <div style={{ color:C.textMuted, fontSize:13, marginTop:4 }}>Analisi documentale immobiliare</div>
          </div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:32 }}>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:24 }}>Accedi</div>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div><label style={labelStyle}>Email</label><input type="email" value={loginForm.email} onChange={e=>setLoginForm(f=>({...f,email:e.target.value}))} placeholder="tua@email.it" style={inputStyle} /></div>
              <div><label style={labelStyle}>Password</label><input type="password" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={inputStyle} /></div>
              {loginError && <div style={{ color:C.red, fontSize:13, background:C.red+"15", border:`1px solid ${C.red}33`, borderRadius:8, padding:"8px 12px" }}>{loginError}</div>}
              <button onClick={handleLogin} style={{ ...btnGold, width:"100%", marginTop:4 }}>Accedi →</button>
            </div>
          </div>
          <div style={{ textAlign:"center", color:C.textDim, fontSize:11, marginTop:20 }}>Protocollo GTI® · Studio Tecnico Varrà</div>
        </div>
      </div>
    </>
  );

  // HOME
  if (screen === "home") return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:"100vh", background:`radial-gradient(ellipse at 80% 10%,${C.goldDim}12 0%,transparent 50%),${C.bg}` }}>
        <div style={{ borderBottom:`1px solid ${C.border}`, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", background:C.surface+"CC", backdropFilter:"blur(8px)", position:"sticky", top:0, zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{fontSize:22}}>🏠</span>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:700, color:C.gold }}>GTI® Analisi</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ color:C.textMuted, fontSize:13 }}>{user?.email}</span>
            <button onClick={()=>setScreen("login")} style={btnGhost}>Esci</button>
          </div>
        </div>
        <div style={{ maxWidth:800, margin:"0 auto", padding:"40px 24px" }}>
          <div className="fade">
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:700, lineHeight:1.2, marginBottom:10 }}>Analisi Documentale<br /><span style={{color:C.gold}}>Immobiliare</span></h1>
            <p style={{ color:C.textMuted, fontSize:14, lineHeight:1.7, marginBottom:32 }}>Carica la documentazione e ottieni un'analisi professionale con rischi, criticità e consigli operativi.</p>
            <button onClick={()=>setScreen("new")} style={{ ...btnGold, display:"inline-flex", alignItems:"center", gap:10, marginBottom:48 }}>
              <span style={{fontSize:18}}>+</span> Inizia Analisi Immobile
            </button>
            {analyses.length > 0 && (
              <div>
                <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:16 }}>Analisi recenti</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {analyses.map(a => (
                    <div key={a.id} onClick={()=>{ setCurrentAnalysis(a); a.stato==="Completata"&&finalReport ? setScreen("report") : setScreen("analysis"); }}
                      style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:15 }}>{a.nome}</div>
                        {a.descrizione && <div style={{ color:C.textMuted, fontSize:12, marginTop:2 }}>{a.descrizione}</div>}
                        <div style={{ color:C.textDim, fontSize:11, marginTop:4 }}>{a.data}</div>
                      </div>
                      <span style={{ fontSize:12, fontWeight:600, color:a.stato==="Completata"?C.green:C.orange, background:(a.stato==="Completata"?C.green:C.orange)+"18", border:`1px solid ${(a.stato==="Completata"?C.green:C.orange)}44`, borderRadius:6, padding:"3px 10px" }}>{a.stato}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // NEW
  if (screen === "new") return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div className="fade" style={{ width:"100%", maxWidth:480 }}>
          <button onClick={()=>setScreen("home")} style={{ background:"none", border:"none", color:C.textMuted, fontSize:13, cursor:"pointer", marginBottom:24 }}>← Torna alla home</button>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:32 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, marginBottom:8 }}>Nuova Analisi</div>
            <div style={{ color:C.textMuted, fontSize:13, marginBottom:28, lineHeight:1.6 }}>Inserisci le informazioni di base per questa analisi.</div>
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              <div><label style={labelStyle}>Nome Analisi *</label><input type="text" value={newForm.nome} onChange={e=>setNewForm(f=>({...f,nome:e.target.value}))} placeholder="es. Appartamento Via Roma 12, Milano" style={inputStyle} /></div>
              <div><label style={labelStyle}>Descrizione (Facoltativa)</label><textarea value={newForm.descrizione} onChange={e=>setNewForm(f=>({...f,descrizione:e.target.value}))} placeholder="Note aggiuntive, tipo di operazione, ecc." rows={3} style={{...inputStyle,resize:"vertical"}} /></div>
              <button onClick={createAnalysis} disabled={!newForm.nome.trim()} style={{ ...btnGold, width:"100%", opacity:newForm.nome.trim()?1:0.4, cursor:newForm.nome.trim()?"pointer":"not-allowed" }}>Inizia Analisi →</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ANALYSIS
  if (screen === "analysis") {
    const step = STEPS[currentStep];
    const result = stepResults[currentStep];
    return (
      <>
        <style>{css}</style>
        <div style={{ minHeight:"100vh", background:C.bg }}>
          <div style={{ borderBottom:`1px solid ${C.border}`, padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", background:C.surface+"CC", backdropFilter:"blur(8px)", position:"sticky", top:0, zIndex:10 }}>
            <button onClick={()=>setScreen("home")} style={{ background:"none", border:"none", color:C.textMuted, fontSize:13, cursor:"pointer" }}>← Home</button>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:C.gold, fontWeight:600 }}>{currentAnalysis?.nome}</div>
            <div style={{width:60}} />
          </div>
          <div style={{ maxWidth:700, margin:"0 auto", padding:"32px 24px 0" }}>
            {/* stepper */}
            <div style={{ display:"flex", alignItems:"center", marginBottom:40 }}>
              {STEPS.map((s,i) => (
                <div key={s.id} style={{ display:"flex", alignItems:"center", flex:i<2?1:0 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:i===currentStep?16:14, background:i<currentStep?C.green:i===currentStep?`linear-gradient(135deg,${C.goldDim},${C.gold})`:C.border, color:i<=currentStep?"#0F1117":C.textDim, fontWeight:700, border:i===currentStep?`2px solid ${C.gold}`:"none", boxShadow:i===currentStep?`0 0 0 4px ${C.gold}22`:"none", transition:"all 0.3s", flexShrink:0 }}>
                      {i<currentStep?"✓":s.icon}
                    </div>
                    <span style={{ fontSize:10, color:i===currentStep?C.gold:C.textDim, fontWeight:i===currentStep?600:400, textAlign:"center", whiteSpace:"nowrap" }}>{s.title}</span>
                  </div>
                  {i<2 && <div style={{ flex:1, height:2, background:i<currentStep?C.green:C.border, margin:"0 8px", marginBottom:22, transition:"background 0.3s" }} />}
                </div>
              ))}
            </div>
            <div className="fade" key={currentStep}>
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                  <span style={{fontSize:24}}>{step.icon}</span>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700 }}>Passo {currentStep+1} — {step.title}</div>
                </div>
                <p style={{ color:C.textMuted, fontSize:13, lineHeight:1.7, marginBottom:24 }}>{step.description}</p>
                <DropZone files={stepFiles[currentStep]} onFiles={f=>setStepFiles(prev=>{const n=[...prev];n[currentStep]=f;return n;})} />
                <div style={{ display:"flex", gap:12, marginTop:24, flexWrap:"wrap" }}>
                  {!result && (
                    <button onClick={analyzeStep} disabled={!stepFiles[currentStep].length||loading}
                      style={{ ...btnGold, display:"flex", alignItems:"center", gap:8, opacity:stepFiles[currentStep].length&&!loading?1:0.4, cursor:stepFiles[currentStep].length&&!loading?"pointer":"not-allowed" }}>
                      {loading ? <><Spinner /> Analisi in corso…</> : <>🔍 Analizza Passo {currentStep+1}</>}
                    </button>
                  )}
                  {result && currentStep < 2 && (
                    <button onClick={()=>setCurrentStep(s=>s+1)} style={{ ...btnGold, display:"flex", alignItems:"center", gap:8 }}>
                      Prosegui al Passo {currentStep+2} →
                    </button>
                  )}
                  {currentStep > 0 && !loading && <button onClick={()=>setCurrentStep(s=>s-1)} style={btnGhost}>← Indietro</button>}
                </div>
              </div>
              {result && (
                <div className="fade" style={{ background:C.surface, border:`1px solid ${C.green}33`, borderRadius:16, padding:24, marginBottom:20 }}>
                  <div style={{ color:C.green, fontSize:13, fontWeight:600, marginBottom:16 }}>✓ Analisi Passo {currentStep+1} completata</div>
                  <div style={{ color:C.textMuted, fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap", maxHeight:300, overflowY:"auto" }}>{result}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // REPORT
  if (screen === "report") {
    const riskMatch = finalReport?.match(/rischio\s+(basso|medio|alto|molto alto)/i);
    const riskLevel = riskMatch?.[1];
    return (
      <>
        <style>{css}</style>
        <div style={{ minHeight:"100vh", background:`radial-gradient(ellipse at 50% 0%,${C.goldDim}15 0%,transparent 50%),${C.bg}` }}>
          <div style={{ borderBottom:`1px solid ${C.border}`, padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", background:C.surface+"CC", backdropFilter:"blur(8px)", position:"sticky", top:0, zIndex:10 }}>
            <button onClick={()=>setScreen("home")} style={{ background:"none", border:"none", color:C.textMuted, fontSize:13, cursor:"pointer" }}>← Home</button>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:C.gold, fontWeight:600 }}>Report Finale</div>
            <div style={{width:60}} />
          </div>
          <div style={{ maxWidth:760, margin:"0 auto", padding:"40px 24px" }}>
            <div className="fade">
              <div style={{ background:`linear-gradient(135deg,${C.surface},${C.surfaceHover})`, border:`1px solid ${C.border}`, borderRadius:16, padding:28, marginBottom:20, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
                <div>
                  <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Analisi Documentale Immobiliare</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:700, marginBottom:8 }}>{currentAnalysis?.nome}</div>
                  {currentAnalysis?.descrizione && <div style={{ color:C.textMuted, fontSize:13, marginBottom:12 }}>{currentAnalysis.descrizione}</div>}
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                    {riskLevel && <RiskBadge level={riskLevel} />}
                    <span style={{ color:C.textDim, fontSize:11 }}>Protocollo GTI® · {currentAnalysis?.data}</span>
                  </div>
                </div>
                <div style={{fontSize:40}}>🏠</div>
              </div>
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:32, marginBottom:20 }}>
                <div style={{ color:C.text, fontSize:14, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{finalReport}</div>
              </div>
              <div style={{ background:`linear-gradient(135deg,${C.goldDim}18,${C.gold}0A)`, border:`1px solid ${C.gold}44`, borderRadius:16, padding:24, marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                  <div style={{fontSize:28,flexShrink:0}}>🏗️</div>
                  <div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:C.gold, marginBottom:6 }}>Studio Tecnico Varrà</div>
                    <div style={{ color:C.textMuted, fontSize:13, lineHeight:1.7, marginBottom:14 }}>Per la verifica definitiva della conformità catastale ed urbanistico-edilizia, affidati ad un tecnico abilitato.</div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      <a href="https://www.studiotecnicovarra.it/consulenza/" target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, background:`linear-gradient(135deg,${C.goldDim},${C.gold})`, borderRadius:8, padding:"9px 18px", color:"#0F1117", fontSize:13, fontWeight:700, textDecoration:"none" }}>📅 Prenota Consulenza</a>
                      <a href="tel:3516088771" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"none", border:`1px solid ${C.gold}55`, borderRadius:8, padding:"9px 18px", color:C.gold, fontSize:13, fontWeight:600, textDecoration:"none" }}>📞 351 608 8771</a>
                    </div>
                    <div style={{ color:C.textDim, fontSize:11, marginTop:10 }}>Via Ugo Ojetti 427, 00137 Roma</div>
                  </div>
                </div>
              </div>
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:18, marginBottom:32 }}>
                <div style={{ color:C.textDim, fontSize:11, lineHeight:1.7 }}>
                  <strong style={{color:C.textMuted}}>⚠️ Disclaimer:</strong> L'analisi ha natura informativa e documentale preliminare. Non sostituisce la verifica di un Geometra, Architetto, Ingegnere, Notaio o Avvocato. Protocollo GTI®.
                </div>
              </div>
              <button onClick={()=>{setCurrentStep(0);setStepFiles([[],[],[]]);setStepResults([null,null,null]);setFinalReport(null);setScreen("home");}} style={btnGhost}>← Torna alla Home</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
}
