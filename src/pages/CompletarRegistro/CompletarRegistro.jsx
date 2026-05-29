import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './CompletarRegistro.css'
import { API } from '../../utils/api'
import logo from '../../assets/logo.svg'

// ── Canvas de partículas (mismo del Login) ───────────────────────
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

  return <canvas ref={canvasRef} className="cr-particle-canvas" />
}

// ── Componente ────────────────────────────────────────────────────
export default function CompletarRegistro({ onLogin }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Lee desde location.state (desktop) o sessionStorage (móvil redirect)
  const registroToken = location.state?.registroToken
    || sessionStorage.getItem('registroToken')
  const prefill = location.state?.prefill
    || JSON.parse(sessionStorage.getItem('registroPrefill') || '{}')

  // Limpiar sessionStorage una vez leído
  useEffect(() => {
    sessionStorage.removeItem('registroToken')
    sessionStorage.removeItem('registroPrefill')
  }, [])

  const [form, setForm] = useState({
    nombre: '',
    direccion: '',
    nombre_encargado: prefill.nombre_encargado || '',
    telefono: '',
  })
  const [errors,  setErrors]  = useState({})
  const [msg,     setMsg]     = useState({ text: '', tipo: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!registroToken) navigate('/login', { replace: true })
  }, [registroToken, navigate])

  const setF = campo => e => {
    let val = e.target.value
    if (campo === 'telefono')         val = val.replace(/\D/g, '').slice(0, 10)
    if (campo === 'nombre_encargado') val = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
    setForm(p => ({ ...p, [campo]: val }))
  }

  const validar = () => {
    const e = {}
    if (!form.nombre.trim())            e.nombre = 'El nombre de la barbería es obligatorio'
    else if (form.nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres'
    if (!form.direccion.trim())         e.direccion = 'La dirección es obligatoria'
    if (!form.nombre_encargado.trim())  e.nombre_encargado = 'El nombre del encargado es obligatorio'
    if (!form.telefono.trim())          e.telefono = 'El teléfono es obligatorio'
    else if (!/^\d{10}$/.test(form.telefono.trim())) e.telefono = 'Debe tener 10 dígitos'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg({ text: '', tipo: '' })
    const errs = validar()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)

    try {
      const res = await fetch(`${API}/auth/google/complete-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registroToken, ...form }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMsg({ text: data.error || 'Error al crear la cuenta', tipo: 'error' })
        if (data.error?.toLowerCase().includes('expiró')) {
          setTimeout(() => navigate('/login', { replace: true }), 2500)
        }
        return
      }

      sessionStorage.setItem('tieneContrasena', '0')
      setMsg({ text: '✅ ¡Cuenta creada! Iniciando sesión...', tipo: 'exito' })
      setTimeout(() => onLogin(data.barberia, data.token, data.refreshToken), 1200)
    } catch {
      setMsg({ text: 'No se pudo conectar con el servidor', tipo: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!registroToken) return null

  return (
    <div className="cr-root">
      <ParticleCanvas />
      <div className="cr-card">
        <div className="cr-logo">
          <img src={logo} alt="MyBarber" />
        </div>
        <h1 className="cr-title">¡Un paso más!</h1>
        <p className="cr-subtitle">
          Completa los datos de tu barbería para finalizar el registro
        </p>

        <div className="cr-google-info">
          <i className="fab fa-google" />
          <span>Conectado como <strong>{prefill.correo}</strong></span>
        </div>

        {msg.text && <div className={`cr-msg ${msg.tipo}`}>{msg.text}</div>}

        <form onSubmit={handleSubmit} className="cr-form" noValidate>
          <div className="cr-field">
            <label><i className="fas fa-store" /> Nombre de la barbería</label>
            <input
              type="text"
              placeholder="Ej. Barbería El Buen Corte"
              value={form.nombre}
              onChange={setF('nombre')}
              className={errors.nombre ? 'err' : ''}
            />
            {errors.nombre && <span className="cr-err">{errors.nombre}</span>}
          </div>

          <div className="cr-field">
            <label><i className="fas fa-map-marker-alt" /> Dirección</label>
            <input
              type="text"
              placeholder="Calle, número, colonia, ciudad"
              value={form.direccion}
              onChange={setF('direccion')}
              className={errors.direccion ? 'err' : ''}
            />
            {errors.direccion && <span className="cr-err">{errors.direccion}</span>}
          </div>

          <div className="cr-field">
            <label><i className="fas fa-id-card" /> Nombre del encargado</label>
            <input
              type="text"
              placeholder="Tu nombre"
              value={form.nombre_encargado}
              onChange={setF('nombre_encargado')}
              className={errors.nombre_encargado ? 'err' : ''}
            />
            {errors.nombre_encargado && <span className="cr-err">{errors.nombre_encargado}</span>}
          </div>

          <div className="cr-field">
            <label><i className="fas fa-phone" /> Teléfono (10 dígitos)</label>
            <input
              type="tel"
              placeholder="3121234567"
              value={form.telefono}
              onChange={setF('telefono')}
              maxLength={10}
              className={errors.telefono ? 'err' : ''}
            />
            {errors.telefono && <span className="cr-err">{errors.telefono}</span>}
          </div>

          <button type="submit" className="cr-submit" disabled={loading}>
            {loading
              ? <><i className="fas fa-spinner fa-spin" /> Creando cuenta...</>
              : <><i className="fas fa-check" /> Crear cuenta</>}
          </button>

          <button
            type="button"
            className="cr-cancel"
            onClick={() => navigate('/login', { replace: true })}
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}