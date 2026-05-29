import { useState, useEffect, useRef } from "react"
import "./AdminLogin.css"
import { API } from "../../utils/api"

// ── Canvas de partículas ─────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId, particlesArray = []
    const mouse = { x: null, y: null, radius: 0 }
    const resize = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight
      mouse.radius = (canvas.height / 80) * (canvas.width / 80); init()
    }
    class Particle {
      constructor(x, y, dx, dy, size) { this.x=x; this.y=y; this.directionX=dx; this.directionY=dy; this.size=size }
      draw() { ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2,false); ctx.fillStyle='#8E9EAB'; ctx.fill() }
      update() {
        if(this.x>canvas.width||this.x<0) this.directionX=-this.directionX
        if(this.y>canvas.height||this.y<0) this.directionY=-this.directionY
        const dx=mouse.x-this.x, dy=mouse.y-this.y, dist=Math.sqrt(dx*dx+dy*dy)
        if(dist<mouse.radius+this.size){
          if(mouse.x<this.x&&this.x<canvas.width-this.size*10) this.x+=3
          if(mouse.x>this.x&&this.x>this.size*10) this.x-=3
          if(mouse.y<this.y&&this.y<canvas.height-this.size*10) this.y+=3
          if(mouse.y>this.y&&this.y>this.size*10) this.y-=3
        }
        this.x+=this.directionX; this.y+=this.directionY; this.draw()
      }
    }
    function init() {
      particlesArray=[]
      const n=(canvas.height*canvas.width)/9000
      for(let i=0;i<n*2;i++){
        const size=Math.random()*3+1
        particlesArray.push(new Particle(
          Math.random()*(canvas.width-size*4)+size*2,
          Math.random()*(canvas.height-size*4)+size*2,
          Math.random()*2-1, Math.random()*2-1, size
        ))
      }
    }
    function connect() {
      for(let a=0;a<particlesArray.length;a++) for(let b=a;b<particlesArray.length;b++){
        const dist=(particlesArray[a].x-particlesArray[b].x)**2+(particlesArray[a].y-particlesArray[b].y)**2
        if(dist<(canvas.width/7)*(canvas.height/7)){
          ctx.strokeStyle=`rgba(142,158,171,${1-dist/20000})`; ctx.lineWidth=1
          ctx.beginPath(); ctx.moveTo(particlesArray[a].x,particlesArray[a].y)
          ctx.lineTo(particlesArray[b].x,particlesArray[b].y); ctx.stroke()
        }
      }
    }
    function animate() { animId=requestAnimationFrame(animate); ctx.clearRect(0,0,canvas.width,canvas.height); particlesArray.forEach(p=>p.update()); connect() }
    const onMouseMove=e=>{mouse.x=e.clientX;mouse.y=e.clientY}
    const onMouseOut=()=>{mouse.x=undefined;mouse.y=undefined}
    window.addEventListener('mousemove',onMouseMove); window.addEventListener('mouseout',onMouseOut); window.addEventListener('resize',resize)
    resize(); animate()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('mousemove',onMouseMove); window.removeEventListener('mouseout',onMouseOut); window.removeEventListener('resize',resize) }
  }, [])
  return <canvas ref={canvasRef} className="al-particle-canvas" />
}

// Oculta el correo: mybarber564@gmail.com → ****@gmail.com
const ocultarCorreo = (correo) => {
  const [, dominio] = correo.split('@')
  return `****@${dominio}`
}

// ── Componente principal ─────────────────────────────────────────
export default function AdminLogin({ onLogin }) {
  // paso: 'credenciales' | 'codigo'
  const [paso,      setPaso]      = useState("credenciales")
  const [correo,    setCorreo]    = useState("")
  const [password,  setPassword]  = useState("")
  const [verPass,   setVerPass]   = useState(false)
  const [codigo,    setCodigo]    = useState("")
  const [error,     setError]     = useState("")
  const [msg,       setMsg]       = useState("")
  const [loading,   setLoading]   = useState(false)
  const [countdown, setCountdown] = useState(0)
  const codigoRef = useRef(null)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  useEffect(() => {
    if (paso === "codigo") setTimeout(() => codigoRef.current?.focus(), 100)
  }, [paso])

  // ── Paso 1: verificar credenciales y enviar código ──────────────
  async function handleCredenciales(e) {
    e.preventDefault()
    if (!correo || !password) { setError("Completa todos los campos"); return }
    setLoading(true); setError(""); setMsg("")
    try {
      const r = await fetch(`${API}/admin/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim(), password })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Error al verificar")
      setMsg(`Código enviado a ${ocultarCorreo(correo)}`)
      setPaso("codigo")
      setCountdown(60)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // ── Paso 2: verificar código OTP ────────────────────────────────
  async function handleCodigo(e) {
    e.preventDefault()
    if (!codigo || codigo.length !== 6) { setError("Ingresa el código de 6 dígitos"); return }
    setLoading(true); setError("")
    try {
      const r = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim(), codigo: codigo.trim() })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Código inválido")
      sessionStorage.setItem("adminToken", d.token)
      sessionStorage.setItem("adminData",  JSON.stringify(d.admin))
      onLogin(d.admin, d.token)
    } catch (e) {
      setError(e.message); setCodigo("")
    }
    setLoading(false)
  }

  // ── Reenviar código ─────────────────────────────────────────────
  async function handleReenviar() {
    if (countdown > 0) return
    setLoading(true); setError(""); setMsg("")
    try {
      const r = await fetch(`${API}/admin/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim(), password })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setMsg("Nuevo código enviado"); setCountdown(60); setCodigo("")
    } catch {
      setError("Error al reenviar. Intenta de nuevo.")
    }
    setLoading(false)
  }

  return (
    <>
      <ParticleCanvas />
      <div className="al-root">
        <div className="al-card">
          <div className="al-header">
            <div className="al-logo">
              <img src="/logo.svg" alt="MyBarber" className="al-logo-img" />
            </div>
            <h1 className="al-title">Panel Admin</h1>
            <p className="al-sub">MyBarber — Acceso restringido</p>
          </div>

          {/* ── Indicador de pasos ── */}
          <div className="al-steps">
            <div className={`al-step ${paso === 'credenciales' ? 'active' : 'done'}`}>
              <div className="al-step-num">{paso === 'credenciales' ? '1' : <i className="fas fa-check"/>}</div>
              <span>Credenciales</span>
            </div>
            <div className="al-step-line" />
            <div className={`al-step ${paso === 'codigo' ? 'active' : ''}`}>
              <div className="al-step-num">2</div>
              <span>Verificación</span>
            </div>
          </div>

          {/* ── PASO 1: correo + contraseña ── */}
          {paso === "credenciales" && (
            <form className="al-form" onSubmit={handleCredenciales}>
              <div className="al-field">
                <label><i className="fas fa-envelope" /> Correo</label>
                <input
                  type="email"
                  placeholder="admin@correo.com"
                  value={correo}
                  onChange={e => setCorreo(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              <div className="al-field">
                <label><i className="fas fa-lock" /> Contraseña</label>
                <div className="al-pass-wrap">
                  <input
                    type={verPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button type="button" className="al-eye" onClick={() => setVerPass(!verPass)}>
                    <i className={`fas ${verPass ? "fa-eye-slash" : "fa-eye"}`} />
                  </button>
                </div>
              </div>

              {error && <div className="al-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

              <button className="al-btn" type="submit" disabled={loading}>
                {loading
                  ? <><i className="fas fa-spinner fa-spin" /> Verificando...</>
                  : <><i className="fas fa-arrow-right" /> Continuar</>
                }
              </button>
              <p className="al-hint">
                <i className="fas fa-shield-alt" /> Verificación en dos pasos activada
              </p>
            </form>
          )}

          {/* ── PASO 2: código OTP ── */}
          {paso === "codigo" && (
            <form className="al-form" onSubmit={handleCodigo}>
              {msg && <div className="al-success"><i className="fas fa-check-circle" /> {msg}</div>}
              <div className="al-otp-info">
                <i className="fas fa-envelope-open-text al-otp-icon" />
                <p>Ingresa el código enviado a <strong>{ocultarCorreo(correo)}</strong></p>
                <span className="al-otp-exp">⏱ Expira en 5 minutos</span>
              </div>
              <div className="al-field">
                <label><i className="fas fa-key" /> Código de verificación</label>
                <input
                  ref={codigoRef}
                  type="text"
                  placeholder="000000"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="al-otp-input"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  disabled={loading}
                />
              </div>

              {error && <div className="al-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

              <button className="al-btn" type="submit" disabled={loading || codigo.length !== 6}>
                {loading
                  ? <><i className="fas fa-spinner fa-spin" /> Verificando...</>
                  : <><i className="fas fa-unlock-alt" /> Ingresar al panel</>
                }
              </button>

              <div className="al-resend-row">
                <button type="button" className="al-resend-btn" onClick={handleReenviar} disabled={countdown > 0 || loading}>
                  {countdown > 0
                    ? <><i className="fas fa-clock" /> Reenviar en {countdown}s</>
                    : <><i className="fas fa-redo" /> Reenviar código</>
                  }
                </button>
                <button type="button" className="al-back-btn" onClick={() => { setPaso("credenciales"); setError(""); setMsg(""); setCodigo("") }}>
                  <i className="fas fa-arrow-left" /> Volver
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}