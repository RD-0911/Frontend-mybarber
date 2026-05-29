import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import './Login.css'
import logo from "../../assets/logo.svg";
import { API, apiFetch} from "../../utils/api"




// ── Canvas de partículas ─────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    let particlesArray = []
    const mouse = { x: null, y: null, radius: 0 }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      mouse.radius = (canvas.height / 80) * (canvas.width / 80)
      init()
    }

    class Particle {
      constructor(x, y, dx, dy, size) {
        this.x = x; this.y = y
        this.directionX = dx; this.directionY = dy
        this.size = size
      }
      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false)
        ctx.fillStyle = '#8E9EAB'
        ctx.fill()
      }
      update() {
        if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX
        if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY
        const dx = mouse.x - this.x, dy = mouse.y - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouse.radius + this.size) {
          if (mouse.x < this.x && this.x < canvas.width - this.size * 10) this.x += 3
          if (mouse.x > this.x && this.x > this.size * 10) this.x -= 3
          if (mouse.y < this.y && this.y < canvas.height - this.size * 10) this.y += 3
          if (mouse.y > this.y && this.y > this.size * 10) this.y -= 3
        }
        this.x += this.directionX
        this.y += this.directionY
        this.draw()
      }
    }

    function init() {
      particlesArray = []
      const n = (canvas.height * canvas.width) / 9000
      for (let i = 0; i < n * 2; i++) {
        const size = Math.random() * 3 + 1
        const x = Math.random() * (canvas.width - size * 4) + size * 2
        const y = Math.random() * (canvas.height - size * 4) + size * 2
        particlesArray.push(new Particle(x, y, Math.random() * 2 - 1, Math.random() * 2 - 1, size))
      }
    }

    function connect() {
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dist =
            (particlesArray[a].x - particlesArray[b].x) ** 2 +
            (particlesArray[a].y - particlesArray[b].y) ** 2
          if (dist < (canvas.width / 7) * (canvas.height / 7)) {
            const op = 1 - dist / 20000
            ctx.strokeStyle = `rgba(142,158,171,${op})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y)
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y)
            ctx.stroke()
          }
        }
      }
    }

    function animate() {
      animId = requestAnimationFrame(animate)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesArray.forEach(p => p.update())
      connect()
    }

    const onMouseMove = e => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onMouseOut  = ()  => { mouse.x = undefined; mouse.y = undefined }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseout',  onMouseOut)
    window.addEventListener('resize',    resize)
    resize()
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseout',  onMouseOut)
      window.removeEventListener('resize',    resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="lb-particle-canvas" />
}

// ── Input con ícono y error inline ───────────────────────────────
function InputGroup({ icon, error, ...props }) {
  const [showPass, setShowPass] = useState(false)
  const isPassword = props.type === 'password'
  const inputType  = isPassword ? (showPass ? 'text' : 'password') : props.type

  return (
    <div className="input-group">
      <i className={`fas ${icon} input-icon`} />
      <input className={error ? 'input-error' : ''} {...props} type={inputType} />
      {isPassword && (
        <button
          type="button"
          className="toggle-pass"
          onClick={() => setShowPass(v => !v)}
          tabIndex={-1}
        >
          <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
        </button>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

// ── Input de código — 6 cajas individuales ───────────────────────
function CodigoInput({ value, onChange }) {
  const inputs = useRef([])

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = (value + '      ').slice(0, 6).split('')
    arr[i] = val
    onChange(arr.join('').trimEnd())
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!value[i] && i > 0) {
        const arr = (value + '      ').slice(0, 6).split('')
        arr[i - 1] = ''
        onChange(arr.join('').trimEnd())
        inputs.current[i - 1]?.focus()
      }
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    e.preventDefault()
  }

  return (
    <div className="codigo-boxes">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          className="codigo-box"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  )
}

// ── Validaciones ─────────────────────────────────────────────────
const esEmail = v => /^[^\s@]+@[^\s@.]+\.[a-zA-Z]{2,}$/.test(v)
const esTel   = v => /^\d{10}$/.test(v)
const esTexto = v => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(v)
const esPass  = v => v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v)

function validarLogin({ correo, password }) {
  const e = {}
  if (!correo.trim())        e.correo   = 'El correo es obligatorio'
  else if (!esEmail(correo)) e.correo   = 'Formato de correo inválido'
  if (!password)             e.password = 'La contraseña es obligatoria'
  return e
}

function validarRegistro(d) {
  const e = {}
  if (!d.nombre.trim())                   e.nombre           = 'El nombre es obligatorio'
  else if (d.nombre.trim().length < 3)    e.nombre           = 'Mínimo 3 caracteres'
  if (!d.direccion.trim())                e.direccion        = 'La dirección es obligatoria'
  else if (d.direccion.trim().length < 5) e.direccion        = 'Mínimo 5 caracteres'
  if (!d.nombre_encargado.trim())         e.nombre_encargado = 'El nombre del encargado es obligatorio'
  else if (!esTexto(d.nombre_encargado))  e.nombre_encargado = 'Solo debe contener letras'
  if (!d.telefono.trim())                 e.telefono         = 'El teléfono es obligatorio'
  else if (!esTel(d.telefono.trim()))     e.telefono         = 'Exactamente 10 dígitos numéricos'
  if (!d.correo.trim())                   e.correo           = 'El correo es obligatorio'
  else if (!esEmail(d.correo.trim()))     e.correo           = 'Formato de correo inválido'
  if (!d.password)                        e.password         = 'La contraseña es obligatoria'
  else if (!esPass(d.password))           e.password         = 'Mínimo 8 caracteres con letras y números'
  return e
}

// ══════════════════════════════════════════════════════════════════
//  MODAL RECUPERACIÓN DE CONTRASEÑA
// ══════════════════════════════════════════════════════════════════
function ModalRecuperacion({ onClose }) {
  const [paso,       setPaso]       = useState('correo')
  const [correo,     setCorreo]     = useState('')
  const [codigo,     setCodigo]     = useState('')
  const [nuevaPass,  setNuevaPass]  = useState('')
  const [confirmar,  setConfirmar]  = useState('')
  const [loading,    setLoading]    = useState(false)
  const [msg,        setMsg]        = useState({ text: '', tipo: '' })
  const [errores,    setErrores]    = useState({})
  const [cuenta,     setCuenta]     = useState(0)
  const timerRef = useRef(null)

  const pasos    = ['correo', 'codigo', 'nueva']
  const pasoIdx  = pasos.indexOf(paso)

  const iniciarCuenta = () => {
    setCuenta(60)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCuenta(c => { if (c <= 1) { clearInterval(timerRef.current); return 0 } return c - 1 })
    }, 1000)
  }
  useEffect(() => () => clearInterval(timerRef.current), [])

  const limpiarMsg = () => setMsg({ text: '', tipo: '' })

  const handleEnviarCodigo = async (e) => {
    e.preventDefault()
    limpiarMsg()
    const err = {}
    if (!correo.trim())        err.correo = 'El correo es obligatorio'
    else if (!esEmail(correo)) err.correo = 'Formato de correo inválido'
    if (Object.keys(err).length) { setErrores(err); return }
    setErrores({})
    setLoading(true)
    try {
      //apiFetch
      const res  = await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ correo: correo.trim().toLowerCase() }),
    }, 'barberia')
      const data = await res.json()
      if (!res.ok) {
        setMsg({ text: data.error || 'Error al enviar el código', tipo: 'error' })
      } else {
        setMsg({ text: `Código enviado a ${correo}`, tipo: 'exito' })
        iniciarCuenta()
        setTimeout(() => { limpiarMsg(); setPaso('codigo') }, 1400)
      }
    } catch { setMsg({ text: ' No se pudo conectar con el servidor', tipo: 'error' }) }
    finally  { setLoading(false) }
  }

  const handleReenviar = async () => {
    if (cuenta > 0 || loading) return
    setLoading(true); limpiarMsg()
    try {
      const res  = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ correo: correo.trim().toLowerCase() }),
      }, 'barberia')
      const data = await res.json()
      if (!res.ok) setMsg({ text: data.error || 'Error al reenviar', tipo: 'error' })
      else { setMsg({ text: ' Nuevo código enviado', tipo: 'exito' }); setCodigo(''); iniciarCuenta(); setTimeout(limpiarMsg, 3000) }
    } catch { setMsg({ text: ' Error de conexión', tipo: 'error' }) }
    finally  { setLoading(false) }
  }

  const handleVerificarCodigo = async (e) => {
    e.preventDefault(); limpiarMsg()
    if (codigo.replace(/\s/g,'').length < 6) { setMsg({ text: 'Ingresa los 6 dígitos del código', tipo: 'error' }); return }
    setLoading(true)
    try {
      const res  = await apiFetch('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ correo: correo.trim().toLowerCase(), codigo: codigo.trim() }),
    }, 'barberia')
      const data = await res.json()
      if (!res.ok) setMsg({ text: data.error || 'Código incorrecto o expirado', tipo: 'error' })
      else { setMsg({ text: ' Código correcto', tipo: 'exito' }); setTimeout(() => { limpiarMsg(); setPaso('nueva') }, 800) }
    } catch { setMsg({ text: ' Error de conexión', tipo: 'error' }) }
    finally  { setLoading(false) }
  }

  const handleNuevaPass = async (e) => {
    e.preventDefault(); limpiarMsg()
    const err = {}
    if (!nuevaPass)              err.nueva     = 'La contraseña es obligatoria'
    else if (!esPass(nuevaPass)) err.nueva     = 'Mínimo 8 caracteres con letras y números'
    if (nuevaPass !== confirmar) err.confirmar = 'Las contraseñas no coinciden'
    if (Object.keys(err).length) { setErrores(err); return }
    setErrores({})
    setLoading(true)
    try {
      // const res  = await fetch(`${API}/auth/reset-password`, {
      //   method: 'POST', headers: { 'Content-Type': 'application/json' },
      //   body:   JSON.stringify({ correo: correo.trim().toLowerCase(), codigo: codigo.trim(), nuevaPassword: nuevaPass }),
      // })
      const res  = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ correo: correo.trim().toLowerCase(), codigo: codigo.trim(), nuevaPassword: nuevaPass }),
      }, 'barberia')
      const data = await res.json()
      if (!res.ok) setMsg({ text: data.error || 'Error al cambiar contraseña', tipo: 'error' })
      else { setMsg({ text: ' ¡Contraseña actualizada! Ya puedes iniciar sesión', tipo: 'exito' }); setTimeout(() => onClose(), 2500) }
    } catch { setMsg({ text: ' Error de conexión', tipo: 'error' }) }
    finally  { setLoading(false) }
  }

  const pasoLabels = ['Correo', 'Código', 'Contraseña']

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-brand">
            <i className="fas fa-cut modal-brand-icon" />
            <span className="modal-brand-text">MyBarber</span>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="modal-steps">
          {pasos.map((p, i) => (
            <div key={p} className="step-wrap">
              <div className={`step-dot ${paso === p ? 'active' : pasoIdx > i ? 'done' : ''}`}>
                {pasoIdx > i ? <i className="fas fa-check" /> : i + 1}
              </div>
              <span className={`step-label ${paso === p ? 'active' : ''}`}>{pasoLabels[i]}</span>
              {i < 2 && <div className={`step-line ${pasoIdx > i ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {msg.text && <div className={`form-msg ${msg.tipo}`} style={{ margin: '0 0 12px' }}>{msg.text}</div>}

        {paso === 'correo' && (
          <form onSubmit={handleEnviarCodigo} noValidate className="modal-form">
            <div className="modal-icon-wrap"><i className="fas fa-envelope modal-step-icon" /></div>
            <h2 className="modal-title">¿Olvidaste tu contraseña?</h2>
            <p className="modal-desc">Ingresa tu correo registrado y te enviaremos un código de 6 dígitos.</p>
            <InputGroup icon="fa-envelope" type="email" placeholder="Correo electrónico"
              value={correo} onChange={e => setCorreo(e.target.value)} error={errores.correo} />
            <button type="submit" className="modal-btn" disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin" /> Enviando...</> : 'Enviar código'}
            </button>
            <button type="button" className="modal-link" onClick={onClose}>← Volver al inicio de sesión</button>
          </form>
        )}

        {paso === 'codigo' && (
          <form onSubmit={handleVerificarCodigo} noValidate className="modal-form">
            <div className="modal-icon-wrap"><i className="fas fa-key modal-step-icon" /></div>
            <h2 className="modal-title">Ingresa el código</h2>
            <p className="modal-desc">Enviamos un código de 6 dígitos a <strong>{correo}</strong>. Revisa también tu bandeja de spam.</p>
            <CodigoInput value={codigo} onChange={setCodigo} />
            <button type="submit" className="modal-btn" disabled={loading || codigo.replace(/\s/g,'').length < 6}>
              {loading ? <><i className="fas fa-spinner fa-spin" /> Verificando...</> : 'Verificar código'}
            </button>
            <div className="reenviar-wrap">
              {cuenta > 0
                ? <span className="reenviar-cuenta">Reenviar código en <strong>{cuenta}s</strong></span>
                : <button type="button" className="modal-link" onClick={handleReenviar} disabled={loading}>↻ Reenviar código</button>
              }
            </div>
            <button type="button" className="modal-link secondary" onClick={() => { setPaso('correo'); setCodigo('') }}>← Cambiar correo</button>
          </form>
        )}

        {paso === 'nueva' && (
          <form onSubmit={handleNuevaPass} noValidate className="modal-form">
            <div className="modal-icon-wrap"><i className="fas fa-lock modal-step-icon" /></div>
            <h2 className="modal-title">Nueva contraseña</h2>
            <p className="modal-desc">Elige una contraseña segura de al menos 8 caracteres con letras y números.</p>
            <InputGroup icon="fa-lock" type="password" placeholder="Nueva contraseña"
              value={nuevaPass} onChange={e => setNuevaPass(e.target.value)} error={errores.nueva} />
            <InputGroup icon="fa-lock" type="password" placeholder="Confirmar contraseña"
              value={confirmar} onChange={e => setConfirmar(e.target.value)} error={errores.confirmar} />

            {nuevaPass.length > 0 && (() => {
              let fuerza = 0
              if (nuevaPass.length >= 8)  fuerza++
              if (/[a-zA-Z]/.test(nuevaPass) && /\d/.test(nuevaPass)) fuerza++
              if (nuevaPass.length >= 10) fuerza++
              if (/[^a-zA-Z0-9]/.test(nuevaPass)) fuerza++
              const labels = ['', 'Débil', 'Aceptable', 'Buena', 'Excelente']
              const colors = ['', '#e53935', '#f59e0b', '#4caf50', '#4a0080']
              return (
                <div className="pass-strength">
                  <div className="pass-bars">
                    {[1,2,3,4].map(n => (
                      <div key={n} className="pass-bar" style={{ background: n <= fuerza ? colors[fuerza] : '#e0e0e0' }} />
                    ))}
                  </div>
                  <span className="pass-label" style={{ color: colors[fuerza] }}>{labels[fuerza]}</span>
                </div>
              )
            })()}

            <button type="submit" className="modal-btn" disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : 'Guardar contraseña'}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  COMPONENTE LOGIN PRINCIPAL
// ══════════════════════════════════════════════════════════════════
//cambio onBarberoLogin
export default function Login({ onLogin, onBarberoLogin }) {
  const navigate = useNavigate()
  const [isSignUp,       setIsSignUp]       = useState(false)
  const [showRecuperar,  setShowRecuperar]  = useState(false)
  const [googleLoading,  setGoogleLoading]  = useState(false)

  // ── Login con Google (funciona en móvil y desktop) ──────────
  const loginConGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // tokenResponse.access_token existe — lo usamos para obtener info del usuario
      setGoogleLoading(true)
      setLoginMsg({ text: '', tipo: '' })
      try {
        // Obtener info del usuario con el access_token
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        }).then(r => r.json())

        const res = await fetch(`${API}/auth/google-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userInfo })
        })
        const data = await res.json()

        if (!res.ok) {
          setLoginMsg({ text: data.error || 'Error al iniciar sesión con Google', tipo: 'error' })
          return
        }

        if (data.needsRegistration) {
          navigate('/completar-registro', {
            state: { registroToken: data.registroToken, prefill: data.prefill }
          })
          return
        }

        if (data.tipo === 'barbero') {
          onBarberoLogin(data.barbero, data.token, data.refreshToken)
          return
        }

        sessionStorage.setItem('tieneContrasena', data.tieneContrasena ? '1' : '0')
        onLogin(data.barberia, data.token, data.refreshToken)
      } catch (e) {
        setLoginMsg({ text: 'No se pudo conectar con el servidor', tipo: 'error' })
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => {
      setLoginMsg({ text: 'No se pudo conectar con Google. Intenta de nuevo.', tipo: 'error' })
    },
    flow: 'implicit',
  })

  const [loginData,    setLoginData]    = useState({ correo: '', password: '' })
  const [loginErrors,  setLoginErrors]  = useState({})
  const [loginMsg,     setLoginMsg]     = useState({ text: '', tipo: '' })
  const [loginLoading, setLoginLoading] = useState(false)

  const [regData,    setRegData]    = useState({ nombre: '', direccion: '', nombre_encargado: '', telefono: '', correo: '', password: '' })
  const [regErrors,  setRegErrors]  = useState({})
  const [regMsg,     setRegMsg]     = useState({ text: '', tipo: '' })
  const [regLoading, setRegLoading] = useState(false)

  const switchPanel = (modo) => {
    setIsSignUp(modo)
    setLoginErrors({});  setLoginMsg({ text: '', tipo: '' })
    setRegErrors({});    setRegMsg({ text: '', tipo: '' })
  }
  //cambio...
  const handleLogin = async (e) => {
  e.preventDefault()
  setLoginMsg({ text: '', tipo: '' })
  const errores = validarLogin(loginData)
  if (Object.keys(errores).length > 0) { setLoginErrors(errores); return }
  setLoginErrors({})
  setLoginLoading(true)
  try {
    //Hacer la petición con apiFetch
   const res  = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo: loginData.correo.trim(), password: loginData.password }),
    }, 'barberia')
    const data = await res.json()
    if (!res.ok) {
      setLoginMsg({ text: data.error || 'Error al iniciar sesión', tipo: 'error' })
    } else if (data.tipo === 'barbero') {
      onBarberoLogin(data.barbero, data.token, data.refreshToken)
    } else {
      sessionStorage.setItem('tieneContrasena', '1')
      onLogin(data.barberia, data.token, data.refreshToken)
    }
  } catch {
    setLoginMsg({ text: 'No se pudo conectar con el servidor', tipo: 'error' })
  } finally {
    setLoginLoading(false)
  }
}

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegMsg({ text: '', tipo: '' })
    const errores = validarRegistro(regData)
    if (Object.keys(errores).length > 0) { setRegErrors(errores); return }
    setRegErrors({})
    setRegLoading(true)
    try {
      //Petición con apiFetch
      const res  = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
        nombre: regData.nombre.trim(), direccion: regData.direccion.trim(),
        nombre_encargado: regData.nombre_encargado.trim(), telefono: regData.telefono.trim(),
        correo: regData.correo.trim(), password: regData.password,
      }),
    }, 'barberia')
      const data = await res.json()
      if (!res.ok) {
        setRegMsg({ text: data.detalles ? data.detalles.join(' · ') : (data.error || 'Error al registrar'), tipo: 'error' })
      } else {
        setRegMsg({ text: '✅ ¡Cuenta creada exitosamente! Redirigiendo...', tipo: 'exito' })
        setRegData({ nombre: '', direccion: '', nombre_encargado: '', telefono: '', correo: '', password: '' })
        setTimeout(() => { setRegMsg({ text: '', tipo: '' }); switchPanel(false) }, 3000)
      }
    } catch { setRegMsg({ text: ' No se pudo conectar con el servidor', tipo: 'error' }) }
    finally  { setRegLoading(false) }
  }

  const setL = campo => e => setLoginData(p => ({ ...p, [campo]: e.target.value }))
  const setR = campo => e => {
    let val = e.target.value
    if (campo === 'telefono')         val = val.replace(/\D/g, '').slice(0, 10)
    if (campo === 'nombre_encargado') val = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
    setRegData(p => ({ ...p, [campo]: val }))
  }

  return (
    <>
      <ParticleCanvas />

      {showRecuperar && <ModalRecuperacion onClose={() => setShowRecuperar(false)} />}

      <div className="lb-bg-deco">
        <span className="lb-deco-icon" style={{ top:'8%',  left:'5%',  fontSize:80, animationDelay:'0s'  }}><i className="fas fa-cut"/></span>
        <span className="lb-deco-icon" style={{ top:'55%', left:'12%', fontSize:50, animationDelay:'3s'  }}><i className="fas fa-cut"/></span>
        <span className="lb-deco-icon" style={{ top:'20%', right:'6%', fontSize:80, animationDelay:'6s'  }}><i className="fas fa-scissors"/></span>
        <span className="lb-deco-icon" style={{ top:'70%', right:'10%',fontSize:60, animationDelay:'9s'  }}><i className="fas fa-cut"/></span>
        <span className="lb-deco-icon" style={{ top:'85%', left:'45%', fontSize:45, animationDelay:'12s' }}><i className="fas fa-cut"/></span>
      </div>

      <div className="login-page-wrapper">
        <div className={`auth-container${isSignUp ? ' right-panel-active' : ''}`}>

          <div className="form-container sign-up-container">
            <form onSubmit={handleRegister} noValidate>
              <div className="brand-mini"><i className="fas fa-cut brand-mini-icon"/><span className="brand-mini-text">MyBarber</span></div>
              <h1>Crear Cuenta</h1>
              <span className="form-subtext">Únete y registra tu barbería</span>
              {regMsg.text && <div className={`form-msg ${regMsg.tipo}`}>{regMsg.text}</div>}

              <div className="auth-divider"><span>Completa el formulario</span></div>

              <InputGroup icon="fa-store"          type="text"     placeholder="Nombre de la barbería"   value={regData.nombre}           onChange={setR('nombre')}           error={regErrors.nombre} />
              <InputGroup icon="fa-map-marker-alt" type="text"     placeholder="Dirección"               value={regData.direccion}        onChange={setR('direccion')}        error={regErrors.direccion} />
              <InputGroup icon="fa-id-card"        type="text"     placeholder="Nombre del encargado"    value={regData.nombre_encargado} onChange={setR('nombre_encargado')} error={regErrors.nombre_encargado} />
              <InputGroup icon="fa-phone"          type="tel"      placeholder="Teléfono (10 dígitos)"   value={regData.telefono}         onChange={setR('telefono')}         error={regErrors.telefono} />
              <InputGroup icon="fa-envelope"       type="email"    placeholder="Correo electrónico"      value={regData.correo}           onChange={setR('correo')}           error={regErrors.correo} />
              <InputGroup icon="fa-lock"           type="password" placeholder="Contraseña (mín. 8 car.)"value={regData.password}         onChange={setR('password')}         error={regErrors.password} />
              <button type="submit" style={{ marginTop: 14 }} disabled={regLoading}>{regLoading ? 'Registrando...' : 'Registrarse'}</button>
              {regLoading ? (
                <div className="login-cargando">
                  <div className="login-barra"><div className="login-barra-fill" /></div>
                  <span className="login-hint-text"><i className="fas fa-server" /> Creando tu cuenta...</span>
                </div>
              ) : (
                <span className="login-server-hint">
                  <i className="fas fa-bolt" /> Primera carga puede tardar unos segundos
                </span>
              )}
              <div className="mobile-switch">
                <span>¿Ya tienes cuenta?</span>
                <button type="button" onClick={() => switchPanel(false)}>Inicia sesión</button>
              </div>
            </form>
          </div>

          <div className="form-container sign-in-container">
            <form onSubmit={handleLogin} noValidate>
              <div className="brand-mini"><i className="fas fa-cut brand-mini-icon"/><span className="brand-mini-text">MyBarber</span></div>
              <h1>Bienvenido</h1>
              <span className="form-subtext">Inicia sesión en tu cuenta</span>
              {loginMsg.text && <div className={`form-msg ${loginMsg.tipo}`}>{loginMsg.text}</div>}

              {/* Botón Google — funciona en móvil y desktop */}
              <div className="social-btns">
                <div className="google-btn-wrap" onClick={() => !googleLoading && loginConGoogle()} style={{cursor: googleLoading ? 'default' : 'pointer'}}>
                  <div className="google-btn-fake">
                    {googleLoading
                      ? <i className="fas fa-spinner fa-spin" />
                      : <i className="fab fa-google" />
                    }
                  </div>
                </div>
              </div>
              <p className="social-tagline">Continuar con Google</p>
              <div className="auth-divider"><span>O usa tu cuenta</span></div>

              <div style={{ marginTop: 4, width: '100%' }}>
                <InputGroup icon="fa-envelope" type="email"    placeholder="Correo electrónico" value={loginData.correo}   onChange={setL('correo')}   error={loginErrors.correo} />
                <InputGroup icon="fa-lock"     type="password" placeholder="Contraseña"          value={loginData.password} onChange={setL('password')} error={loginErrors.password} />
              </div>
              <button type="button" className="lb-link" onClick={() => setShowRecuperar(true)}>
                ¿Olvidaste tu contraseña?
              </button>
              <button type="submit" disabled={loginLoading}>{loginLoading ? 'Entrando...' : 'Entrar'}</button>
              {loginLoading ? (
                <div className="login-cargando">
                  <div className="login-barra"><div className="login-barra-fill" /></div>
                  <span className="login-hint-text"><i className="fas fa-server" /> Conectando con el servidor...</span>
                </div>
              ) : (
                <span className="login-server-hint">
                  <i className="fas fa-bolt" /> Primera carga puede tardar unos segundos
                </span>
              )}
              <div className="mobile-switch">
                <span>¿No tienes cuenta?</span>
                <button type="button" onClick={() => switchPanel(true)}>Regístrate aquí</button>
              </div>
            </form>
          </div>

          <div className="overlay-container">
            <div className="overlay">
              <div className="overlay-panel overlay-left">
                <div className="overlay-logo">
                   <img src={logo} alt="Logo" className="logo-icon"/>
                  </div>
                <h1 className="white-text">¡De vuelta al estilo!</h1>
                <p>Inicia sesión y gestiona tus citas, historial y preferencias en tu barbería favorita.</p>
                <div className="overlay-divider"><span>✦</span></div>
                <button className="ghost" onClick={() => switchPanel(false)}>Iniciar Sesión</button>
              </div>
              <div className="overlay-panel overlay-right">
                <div className="overlay-logo">
                   <img src={logo} alt="Logo" className="logo-icon"/>
                  </div>
                <h1 className="brand-title">MyBarber</h1>
                <h1 className="white-text">¡Hola, amigo!</h1>
                <p>Ingresa tus datos y comienza tu viaje con nosotros</p>
                <button className="ghost" onClick={() => switchPanel(true)}>Registrarse</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}