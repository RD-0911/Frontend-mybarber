import { useState, useEffect, useRef } from "react"
import "./Citapublica.css"
import HeaderPublico from "../../components/HeaderPublico/HeaderPublico"
import FooterPublico from "../../components/FooterPublico/FooterPublico"

const API = import.meta.env.VITE_API_URL || "http://localhost:5000"

const DIAS_ES  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function generarHoras(inicio = "09:00", fin = "18:00", intervalo = 30) {
  const horas = []
  const [hi, mi] = inicio.split(":").map(Number)
  const [hf, mf] = fin.split(":").map(Number)
  let mins = hi * 60 + mi; const finMins = hf * 60 + mf
  while (mins < finMins) {
    horas.push(`${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`)
    mins += intervalo
  }
  return horas
}

function getNextDays(n = 21) {
  const days = []; const hoy = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(hoy); d.setDate(hoy.getDate() + i); days.push(d)
  }
  return days
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toFechaStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

function getExcepcion(horario, dia) {
  if (!horario.excepciones || !dia) return null
  return horario.excepciones.find(e => e.fecha === toFechaStr(dia)) || null
}

function durLabel(m) {
  if (!m) return ""
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60); const r = m % 60
  return r ? `${h}h ${r}min` : `${h}h`
}

function minutosBloqueo(min) { return Math.ceil(min / 60) * 60 }
//gol
// ── Validaciones ─────────────────────────────────────────────────
const soloLetras       = (v) => /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]*$/.test(v)
const soloNumeros      = (v) => /^[0-9]*$/.test(v)
const esFacebookValido = (v) => /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ@._\-\s]*$/.test(v)
const contieneHtml     = (v) => /<|>|script|javascript|onerror|onload/i.test(v)

// ── FormDatos ─────────────────────────────────────────────────────
function FormDatos({ form, setForm, onAtras, onSiguiente }) {
  const [tocados, setTocados] = useState({ nombre:false, primerAp:false, telefono:false, usuarioFacebook:false })
  const errores = {
    nombre:   !form.nombre.trim() ? "El nombre es obligatorio" : !soloLetras(form.nombre) ? "Solo letras" : form.nombre.trim().length < 2 ? "Mínimo 2 letras" : null,
    primerAp: !form.primerAp.trim() ? "El apellido es obligatorio" : !soloLetras(form.primerAp) ? "Solo letras" : form.primerAp.trim().length < 2 ? "Mínimo 2 letras" : null,
    telefono: !form.telefono.trim() ? "El teléfono es obligatorio" : !soloNumeros(form.telefono) ? "Solo números" : form.telefono.length !== 10 ? "Exactamente 10 dígitos" : null,
    usuarioFacebook: !form.usuarioFacebook.trim() ? "El usuario de Facebook es obligatorio" : form.usuarioFacebook.trim().length < 3 ? "Mínimo 3 caracteres" : contieneHtml(form.usuarioFacebook) ? "Caracteres no permitidos" : !esFacebookValido(form.usuarioFacebook) ? "Solo letras, números, puntos, guiones y @" : null,
  }
  const formValido = !errores.nombre && !errores.primerAp && !errores.telefono && !errores.usuarioFacebook
  function marcar(campo) { setTocados(t => ({ ...t, [campo]: true })) }

  return (
    <section className="cp-section">
      <h2 className="cp-section-title">Tus datos de contacto</h2>
      <div className="form-cliente">
        <div className="fc-group">
          <label><i className="fas fa-user" /> Nombre *</label>
          <input type="text" placeholder="Tu nombre" value={form.nombre} maxLength={40}
            onChange={e => { if (soloLetras(e.target.value)) setForm({...form, nombre:e.target.value}) }}
            onBlur={() => marcar("nombre")}
            className={tocados.nombre && errores.nombre ? "input-error" : tocados.nombre && !errores.nombre ? "input-ok" : ""} />
          {tocados.nombre && errores.nombre && <span className="fc-error"><i className="fas fa-exclamation-circle" /> {errores.nombre}</span>}
          {tocados.nombre && !errores.nombre && <span className="fc-ok"><i className="fas fa-check-circle" /> Correcto</span>}
        </div>
        <div className="fc-group">
          <label><i className="fas fa-user" /> Apellido *</label>
          <input type="text" placeholder="Tu apellido" value={form.primerAp} maxLength={40}
            onChange={e => { if (soloLetras(e.target.value)) setForm({...form, primerAp:e.target.value}) }}
            onBlur={() => marcar("primerAp")}
            className={tocados.primerAp && errores.primerAp ? "input-error" : tocados.primerAp && !errores.primerAp ? "input-ok" : ""} />
          {tocados.primerAp && errores.primerAp && <span className="fc-error"><i className="fas fa-exclamation-circle" /> {errores.primerAp}</span>}
          {tocados.primerAp && !errores.primerAp && <span className="fc-ok"><i className="fas fa-check-circle" /> Correcto</span>}
        </div>
        <div className="fc-group">
          <label><i className="fas fa-phone" /> Teléfono * <span className="fc-hint">10 dígitos</span></label>
          <div className="fc-tel-wrap">
            <span className="fc-lada">🇲🇽 +52</span>
            <input type="tel" inputMode="numeric" placeholder="3120000000" maxLength={10}
              value={form.telefono}
              onChange={e => setForm({...form, telefono: e.target.value.replace(/\D/g,"").slice(0,10)})}
              onBlur={() => marcar("telefono")}
              className={tocados.telefono && errores.telefono ? "input-error" : tocados.telefono && !errores.telefono ? "input-ok" : ""} />
          </div>
          <span className="fc-counter">{form.telefono.length}/10</span>
          {tocados.telefono && errores.telefono && <span className="fc-error"><i className="fas fa-exclamation-circle" /> {errores.telefono}</span>}
          {tocados.telefono && !errores.telefono && <span className="fc-ok"><i className="fas fa-check-circle" /> Correcto</span>}
        </div>
        <div className="fc-group">
          <label><i className="fab fa-facebook" /> Usuario de Facebook *</label>
          <input type="text" placeholder="@tunombre o tu.nombre" maxLength={60}
            value={form.usuarioFacebook} autoCapitalize="none" autoCorrect="off"
            onChange={e => { setForm({...form, usuarioFacebook: e.target.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ@._\-\s]/g,"")}); marcar("usuarioFacebook") }}
            onBlur={() => marcar("usuarioFacebook")}
            className={tocados.usuarioFacebook && errores.usuarioFacebook ? "input-error" : tocados.usuarioFacebook && !errores.usuarioFacebook ? "input-ok" : ""} />
          {tocados.usuarioFacebook && errores.usuarioFacebook && <span className="fc-error"><i className="fas fa-exclamation-circle" /> {errores.usuarioFacebook}</span>}
          {tocados.usuarioFacebook && !errores.usuarioFacebook && <span className="fc-ok"><i className="fas fa-check-circle" /> Correcto</span>}
        </div>
      </div>
      <div className="cp-nav">
        <button className="btn-atras" onClick={onAtras}><i className="fas fa-arrow-left" /> Atrás</button>
        <button className="btn-siguiente" onClick={() => { setTocados({nombre:true,primerAp:true,telefono:true,usuarioFacebook:true}); if (formValido) onSiguiente() }}>
          Revisar cita <i className="fas fa-arrow-right" />
        </button>
      </div>
    </section>
  )
}

// ── Banner Catálogo ───────────────────────────────────────────────
function BannerCatalogo({ barberiaId }) {
  const url = `${window.location.origin}/catalogo?barberia=${barberiaId}`
  return (
    <div className="cat-float-wrap" onClick={() => window.open(url, "_blank")}>
      <div className="cat-float">
        <div className="cat-float-shine" />
        <div className="cat-float-icon"><i className="fas fa-box-open" /></div>
        <div className="cat-float-text">
          <span className="cat-float-title">Catálogo</span>
          <span className="cat-float-sub">Ver productos</span>
        </div>
        <i className="fas fa-chevron-right cat-float-arrow" />
      </div>
    </div>
  )
}

// ── Tarjeta servicio/paquete ──────────────────────────────────────
function ServicioCard({ s, seleccionado, onSelect }) {
  const [expandido, setExpandido] = useState(false)
  const esPaquete = s.tipo === "paquete"
  const bloqueo   = minutosBloqueo(s.hora_estimada)
  return (
    <div className={`servicio-card ${seleccionado?"selected":""} ${esPaquete?"paquete":""}`} onClick={() => onSelect(s)}>
      <div className="sc-icon"><i className={`fas ${esPaquete?"fa-box-open":"fa-cut"}`} /></div>
      <div className="sc-info">
        <div className="sc-nombre-row">
          <span className="sc-nombre">{s.descripcion}</span>
          {esPaquete && <span className="sc-tipo-badge">Paquete</span>}
        </div>
        <span className="sc-meta">
          <span className="sc-precio">${parseFloat(s.precio).toFixed(2)}</span>
          <span className="sc-dur"><i className="fas fa-clock" /> {durLabel(s.hora_estimada)}</span>
          {bloqueo !== s.hora_estimada && (
            <span className="sc-bloqueo"><i className="fas fa-lock" /> {durLabel(bloqueo)}</span>
          )}
        </span>
        {esPaquete && s.contenido && (
          <>
            <button className="btn-ver-incluye" onClick={e => { e.stopPropagation(); setExpandido(v=>!v) }}>
              <i className={`fas fa-chevron-${expandido?"up":"down"}`} />{expandido?" Ocultar":" Ver qué incluye"}
            </button>
            {expandido && (
              <div className="sc-contenido" onClick={e => e.stopPropagation()}>
                {s.contenido.split("\n").filter(Boolean).map((line,i) => (
                  <span key={i} className="sc-contenido-item"><i className="fas fa-check-circle" /> {line}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {seleccionado && <div className="sc-check"><i className="fas fa-check" /></div>}
    </div>
  )
}

// ── Tarjeta barbero ───────────────────────────────────────────────
function BarberoCard({ b, seleccionado, onSelect }) {
  const iniciales = b.nombre.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()
  return (
    <button
      className={`barbero-option-card ${seleccionado?"selected":""}`}
      onClick={() => onSelect(b)}
    >
      <div className="boc-avatar">
        {b.foto
          ? <img src={b.foto} alt={b.nombre} />
          : <span>{iniciales}</span>
        }
      </div>
      <span className="boc-nombre">{b.nombre}</span>
      {seleccionado && <div className="boc-check"><i className="fas fa-check" /></div>}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────
export default function CitaPublica() {
  const params      = new URLSearchParams(window.location.search)
  const id_barberia = params.get("barberia")

  const [barberia,  setBarberia]  = useState(null)
  const [servicios, setServicios] = useState([])
  const [barberos,  setBarberos]  = useState([])
  const [horario,   setHorario]   = useState({ diasLaborales:[1,2,3,4,5,6], horaInicio:"09:00", horaFin:"18:00", intervaloMinutos:30, excepciones:[] })
  const [cargando,  setCargando]  = useState(true)
  const [error404,  setError404]  = useState(false)

  const [paso,     setPaso]     = useState(0)
  const [exito,    setExito]    = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errMsg,   setErrMsg]   = useState("")

  const [horasOcupadas, setHorasOcupadas] = useState(new Set())
  const [cargandoHoras, setCargandoHoras] = useState(false)

  const dias = getNextDays(21)

  const [servicioSel, setServicioSel] = useState(null)
  const [barberoSel,  setBarberoSel]  = useState(null)  // null = sin preferencia
  const [diaSel,      setDiaSel]      = useState(null)
  const [horaSel,     setHoraSel]     = useState(null)
  const [form, setForm] = useState({ nombre:"", primerAp:"", telefono:"", usuarioFacebook:"" })

  const scrollRef  = useRef(null)
  const hayBarberos = barberos.length > 0

  // ── Pasos dinámicos ──────────────────────────────────────────
  // Si hay barberos: [Servicio, ¿Con quién?, Fecha, Hora, Datos, Confirmar]
  // Si no:           [Servicio, Fecha, Hora, Datos, Confirmar]
  const pasoLabels = hayBarberos
    ? ["Servicio", "¿Con quién?", "Fecha", "Hora", "Tus datos", "Confirmar"]
    : ["Servicio", "Fecha", "Hora", "Tus datos", "Confirmar"]

  // Índices reales de cada paso según si hay barberos
  const P = {
    SERVICIO:  0,
    BARBERO:   hayBarberos ? 1 : -1,
    FECHA:     hayBarberos ? 2 : 1,
    HORA:      hayBarberos ? 3 : 2,
    DATOS:     hayBarberos ? 4 : 3,
    CONFIRMAR: hayBarberos ? 5 : 4,
  }

  // ── Carga inicial ────────────────────────────────────────────
  useEffect(() => {
    if (!id_barberia) { setError404(true); setCargando(false); return }
    Promise.all([
      fetch(`${API}/public/barberia/${id_barberia}`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API}/public/servicios/${id_barberia}`).then(r => r.json()),
      fetch(`${API}/public/barberos/${id_barberia}`).then(r => r.json()).catch(() => []),
      fetch(`${API}/barberia/${id_barberia}/horario`).then(r => r.json()).catch(() => null),
    ]).then(([b, s, barbs, h]) => {
      setBarberia(b)
      setServicios(Array.isArray(s) ? s : [])
      setBarberos(Array.isArray(barbs) ? barbs : [])
      if (h && h.horaInicio) setHorario({ ...h, excepciones: h.excepciones || [] })
    }).catch(() => setError404(true))
      .finally(() => setCargando(false))
  }, [id_barberia])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [paso])

  // ── Cargar disponibilidad según barbero seleccionado ─────────
  useEffect(() => {
    if (!diaSel || !id_barberia) return
    setCargandoHoras(true); setHoraSel(null); setHorasOcupadas(new Set())

    // Si hay barberos, pasa el id del barbero seleccionado (o ninguno para "sin preferencia")
    const params = new URLSearchParams({ fecha: toFechaStr(diaSel) })
    if (hayBarberos && barberoSel?.id) params.set("id_barbero", barberoSel.id)

    fetch(`${API}/public/disponibilidad/${id_barberia}?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const ocupadasSet = new Set()
        const intervalo   = horario.intervaloMinutos || 30

        // Inicio y fin del día seleccionado (en hora local del navegador)
        const inicioDia = new Date(diaSel); inicioDia.setHours(0, 0, 0, 0)
        const finDia    = new Date(diaSel); finDia.setHours(23, 59, 59, 999)

        data.forEach(c => {
          const inicio = new Date(c.fechaInicio)
          const fin    = c.fechaFin
            ? new Date(c.fechaFin)
            : new Date(inicio.getTime() + minutosBloqueo(c.hora_estimada || 60) * 60000)

          // Recortar el intervalo al rango del día seleccionado
          const inicioEfectivo = inicio < inicioDia ? inicioDia : inicio
          const finEfectivo    = fin > finDia ? finDia : fin
          if (inicioEfectivo >= finEfectivo) return // no se superpone con el día

          let t = new Date(inicioEfectivo)
          while (t < finEfectivo) {
            ocupadasSet.add(`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`)
            t = new Date(t.getTime() + intervalo * 60000)
          }
        })
        setHorasOcupadas(ocupadasSet)
      })
      .catch(() => {})
      .finally(() => setCargandoHoras(false))
  }, [diaSel, id_barberia, barberoSel])

  async function confirmarCita() {
    if (!form.nombre || !form.primerAp || !form.telefono || !form.usuarioFacebook) {
      setErrMsg("Por favor completa todos los campos obligatorios."); return
    }
    setEnviando(true); setErrMsg("")
    try {
      const fechaInicio = new Date(`${toFechaStr(diaSel)}T${horaSel}:00`)
      const body = {
        id_barberia, id_servicio: servicioSel.id,
        fechaInicio: fechaInicio.toISOString(),
        nombre: form.nombre.trim(), primerAp: form.primerAp.trim(),
        telefono: form.telefono.trim(),
        usuarioFacebook: form.usuarioFacebook.trim() || null,
      }
      // Pasar barbero si fue elegido explícitamente
      if (hayBarberos && barberoSel?.id) body.id_barbero = barberoSel.id

      const res = await fetch(`${API}/public/citas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear la cita")
      setExito(true)
    } catch (e) {
      // Error 429 — límite de citas alcanzado: mensaje especial más visible
      if (e.message.toLowerCase().includes("límite") || e.message.toLowerCase().includes("limite") || e.message.toLowerCase().includes("5 citas")) {
        setErrMsg("⛔ " + e.message)
      } else {
        setErrMsg(e.message)
      }
      if (e.message.toLowerCase().includes("ocupado") || e.message.toLowerCase().includes("barbero")) {
        setPaso(P.HORA); setCargandoHoras(true)
        const params = new URLSearchParams({ fecha: toFechaStr(diaSel) })
        if (hayBarberos && barberoSel?.id) params.set("id_barbero", barberoSel.id)
        fetch(`${API}/public/disponibilidad/${id_barberia}?${params.toString()}`)
          .then(r => r.json()).then(data => {
            if (!Array.isArray(data)) return
            const set = new Set(); const intervalo = horario.intervaloMinutos || 30
            data.forEach(c => {
              const inicio = new Date(c.fechaInicio)
              const fin = c.fechaFin ? new Date(c.fechaFin) : new Date(inicio.getTime() + minutosBloqueo(c.hora_estimada||60)*60000)
              let t = new Date(inicio)
              while (t < fin) {
                set.add(`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`)
                t = new Date(t.getTime() + intervalo * 60000)
              }
            })
            setHorasOcupadas(set)
          }).finally(() => setCargandoHoras(false))
      }
    }
    setEnviando(false)
  }

  const excepcionDiaSel    = getExcepcion(horario, diaSel)
  const horaInicioEfectiva = excepcionDiaSel && !excepcionDiaSel.cerrado ? excepcionDiaSel.horaInicio : horario.horaInicio
  const horaFinEfectiva    = excepcionDiaSel && !excepcionDiaSel.cerrado ? excepcionDiaSel.horaFin    : horario.horaFin
  const HORAS              = excepcionDiaSel?.cerrado ? [] : generarHoras(horaInicioEfectiva, horaFinEfectiva, horario.intervaloMinutos)
  const ahora              = new Date()
  const horasDisponibles   = HORAS.filter(h => {
    // 1. El slot de inicio no puede estar ocupado
    if (horasOcupadas.has(h)) return false

    // 2. Para hoy: no mostrar horas ya pasadas
    if (diaSel && isSameDay(diaSel, ahora)) {
      const [hh, mm] = h.split(":").map(Number)
      if ((hh*60+mm) <= (ahora.getHours()*60+ahora.getMinutes())) return false
    }

    // 3. Verificar que no haya otra cita ocupando los slots del servicio
    //    El horario de cierre NO limita — el barbero puede terminar después si es necesario
    if (servicioSel?.hora_estimada) {
      const bloqueoMin = minutosBloqueo(servicioSel.hora_estimada)
      const intervalo  = horario.intervaloMinutos || 30
      const [hh, mm]   = h.split(":").map(Number)
      let minutosCheck = intervalo
      while (minutosCheck < bloqueoMin) {
        const totalMin = hh * 60 + mm + minutosCheck
        const slotStr  = `${String(Math.floor(totalMin/60)).padStart(2,"0")}:${String(totalMin%60).padStart(2,"0")}`
        if (horasOcupadas.has(slotStr)) return false // hay otra cita en ese bloque
        minutosCheck += intervalo
      }
    }

    return true
  })

  const soloServicios = servicios.filter(s => s.tipo !== "paquete")
  const soloPaquetes  = servicios.filter(s => s.tipo === "paquete")

  if (cargando) return <div className="cp-loading"><div className="cp-spinner" /><p>Cargando información...</p></div>
  if (error404) return (
    <div className="cp-error">
      <i className="fas fa-store-slash" />
      <h2>Barbería no encontrada</h2>
      <p>El enlace puede ser incorrecto o la barbería ya no está disponible.</p>
    </div>
  )

  if (exito) {
    const esPaquete  = servicioSel?.tipo === "paquete"
    const fechaTexto = `${DIAS_ES[diaSel.getDay()]} ${diaSel.getDate()} de ${MESES_ES[diaSel.getMonth()]}`

    return (
      <div className="cp-root">
        <div className="cp-grain" />
        <HeaderPublico barberia={barberia} badge="Reserva tu cita" badgeIcon="fa-calendar-check" />
        <div className="cp-exito">
          <BannerCatalogo barberiaId={id_barberia} />
          <div className="exito-card">
            <div className="exito-icon-wrap"><i className="fas fa-check" /></div>
            <h2>¡Cita reservada!</h2>
            <p className="exito-sub">Te esperamos en <strong>{barberia.nombre}</strong></p>
            <div className="exito-resumen">
              <div className="er-item">
                <i className={`fas ${esPaquete?"fa-box-open":"fa-cut"}`} />
                <span>{servicioSel.descripcion}{esPaquete&&" (Paquete)"}</span>
              </div>
              {barberoSel && (
                <div className="er-item"><i className="fas fa-user-circle" /><span>{barberoSel.nombre}</span></div>
              )}
              <div className="er-item"><i className="fas fa-calendar" /><span>{fechaTexto}</span></div>
              <div className="er-item"><i className="fas fa-clock" /><span>{horaSel} hrs</span></div>
              <div className="er-item"><i className="fas fa-dollar-sign" /><span>${parseFloat(servicioSel.precio).toFixed(2)}</span></div>
            </div>
            <p className="exito-nota"><i className="fas fa-clock" /> Tu cita está <strong>pendiente de confirmación</strong> hasta que el negocio la apruebe.</p>
          </div>
        </div>
        <FooterPublico telefono={barberia.telefono} nombre={barberia.nombre} />
      </div>
    )
  }

  return (
    <div className="cp-root" ref={scrollRef}>
      <div className="cp-grain" />
      <HeaderPublico barberia={barberia} badge="Reserva tu cita" badgeIcon="fa-calendar-check" />

      {/* Progress */}
      <div className="cp-progress">
        {pasoLabels.map((lbl, i) => (
          <div key={i} className={`cp-step ${i < paso?"done":""} ${i === paso?"active":""}`}>
            <div className="cp-step-dot">
              {i < paso ? <i className="fas fa-check" /> : <span>{i+1}</span>}
            </div>
            <span className="cp-step-lbl">{lbl}</span>
          </div>
        ))}
        <div className="cp-progress-bar">
          <div className="cp-progress-fill" style={{ width: `${(paso / (pasoLabels.length-1)) * 100}%` }} />
        </div>
      </div>

      <main className="cp-main">

        {/* PASO 0 — Servicio */}
        {paso === P.SERVICIO && (
          <section className="cp-section">
            <h2 className="cp-section-title">¿Qué deseas?</h2>
            {soloServicios.length > 0 && (
              <>
                {soloPaquetes.length > 0 && <p className="cp-grupo-label"><i className="fas fa-cut" /> Servicios</p>}
                <div className="servicios-grid">
                  {soloServicios.map(s => <ServicioCard key={s.id} s={s} seleccionado={servicioSel?.id===s.id} onSelect={setServicioSel} />)}
                </div>
              </>
            )}
            {soloPaquetes.length > 0 && (
              <>
                <p className="cp-grupo-label paquete"><i className="fas fa-box-open" /> Paquetes</p>
                <div className="servicios-grid">
                  {soloPaquetes.map(s => <ServicioCard key={s.id} s={s} seleccionado={servicioSel?.id===s.id} onSelect={setServicioSel} />)}
                </div>
              </>
            )}
            <div className="cp-nav">
              <button className="btn-siguiente" disabled={!servicioSel}
                onClick={() => setPaso(hayBarberos ? P.BARBERO : P.FECHA)}>
                Siguiente <i className="fas fa-arrow-right" />
              </button>
            </div>
          </section>
        )}

        {/* PASO BARBERO — ¿Con quién? (solo si hay barberos) */}
        {hayBarberos && paso === P.BARBERO && (
          <section className="cp-section">
            <h2 className="cp-section-title">¿Con quién quieres tu cita?</h2>
            <p className="cp-section-sub">Elige un barbero o selecciona sin preferencia</p>

            <div className="barberos-opciones-grid">
              {barberos.map(b => (
                <BarberoCard key={b.id} b={b}
                  seleccionado={barberoSel?.id === b.id}
                  onSelect={setBarberoSel} />
              ))}
            </div>

            <div className="cp-nav">
              <button className="btn-atras" onClick={() => setPaso(P.SERVICIO)}>
                <i className="fas fa-arrow-left" /> Atrás
              </button>
              <button className="btn-siguiente" disabled={!barberoSel} onClick={() => setPaso(P.FECHA)}>
                Siguiente <i className="fas fa-arrow-right" />
              </button>
            </div>
          </section>
        )}

        {/* PASO FECHA */}
        {paso === P.FECHA && (
          <section className="cp-section">
            <h2 className="cp-section-title">¿Qué día prefieres?</h2>
            <p className="cp-section-sub">Solo se muestran los días en que atendemos</p>
            {barberoSel && (
              <div className="cp-barbero-sel-aviso">
                <i className="fas fa-user-circle" /> Cita con <strong>{barberoSel.nombre}</strong>
              </div>
            )}
            <div className="dias-grid">
              {dias.map((d, i) => {
                const esHoy      = isSameDay(d, new Date())
                const selec      = diaSel && isSameDay(d, diaSel)
                const cerrado    = !horario.diasLaborales.includes(d.getDay())
                const excepcion  = getExcepcion(horario, d)
                const esCerrado  = (cerrado && !excepcion) || excepcion?.cerrado
                const esEspecial = !esCerrado && excepcion
                return (
                  <button key={i}
                    className={`dia-card ${selec?"selected":""} ${esCerrado?"cerrado":""} ${esEspecial?"especial":""}`}
                    onClick={() => !esCerrado && setDiaSel(d)} disabled={esCerrado}>
                    <span className="dc-mes">{MESES_ES[d.getMonth()].slice(0,3)}</span>
                    <span className="dc-num">{d.getDate()}</span>
                    <span className="dc-dia">{DIAS_ES[d.getDay()]}</span>
                    {esHoy && !esCerrado && <span className="dc-hoy">Hoy</span>}
                    {esCerrado && <span className="dc-cerrado">{excepcion?.motivo||"Cerrado"}</span>}
                    {esEspecial && <span className="dc-especial"><i className="fas fa-star" /></span>}
                  </button>
                )
              })}
            </div>
            <div className="cp-nav">
              <button className="btn-atras" onClick={() => setPaso(hayBarberos ? P.BARBERO : P.SERVICIO)}>
                <i className="fas fa-arrow-left" /> Atrás
              </button>
              <button className="btn-siguiente" disabled={!diaSel} onClick={() => setPaso(P.HORA)}>
                Siguiente <i className="fas fa-arrow-right" />
              </button>
            </div>
          </section>
        )}

        {/* PASO HORA */}
        {paso === P.HORA && (
          <section className="cp-section">
            <h2 className="cp-section-title">
              Horarios disponibles
              {diaSel && <span className="cp-fecha-sel"> — {DIAS_ES[diaSel.getDay()]} {diaSel.getDate()} de {MESES_ES[diaSel.getMonth()]}</span>}
            </h2>

            {barberoSel && (
              <div className="cp-barbero-sel-aviso">
                <i className="fas fa-user-circle" /> Horarios de <strong>{barberoSel.nombre}</strong>
              </div>
            )}

            {servicioSel?.tipo === "paquete" && (
              <div className="cp-bloqueo-aviso">
                <i className="fas fa-box-open" />
                <span>
                  <strong>{servicioSel.descripcion}</strong> dura {durLabel(servicioSel.hora_estimada)} y bloquea{" "}
                  <strong>{durLabel(minutosBloqueo(servicioSel.hora_estimada))}</strong> en la agenda.
                </span>
              </div>
            )}

            {excepcionDiaSel && !excepcionDiaSel.cerrado && (
              <div className="excepcion-aviso">
                <i className="fas fa-clock" />
                <span><strong>Horario especial{excepcionDiaSel.motivo?` — ${excepcionDiaSel.motivo}`:""}: </strong>
                  {excepcionDiaSel.horaInicio} a {excepcionDiaSel.horaFin}</span>
              </div>
            )}

            {cargandoHoras ? (
              <div className="horas-cargando"><div className="cp-spinner small" /><span>Verificando disponibilidad...</span></div>
            ) : (
              <>
                {horasDisponibles.length > 0 ? (
                  <>
                    <p className="cp-section-sub">
                      <i className="fas fa-check-circle" style={{color:"#10b981"}} />
                      {" "}{horasDisponibles.length} horario{horasDisponibles.length!==1?"s":""} disponible{horasDisponibles.length!==1?"s":""}
                    </p>
                    <div className="horas-grid">
                      {HORAS.map(h => {
                        const ocupada = horasOcupadas.has(h)
                        let pasada = false
                        if (diaSel && isSameDay(diaSel, ahora)) {
                          const [hh, mm] = h.split(":").map(Number)
                          pasada = (hh*60+mm) <= (ahora.getHours()*60+ahora.getMinutes())
                        }
                        const noDisponible = ocupada || pasada
                        return (
                          <button key={h}
                            className={`hora-btn ${horaSel===h?"selected":""} ${noDisponible?"ocupada":""}`}
                            onClick={() => !noDisponible && setHoraSel(h)} disabled={noDisponible}
                            title={ocupada?"No disponible":pasada?"Ya pasó":"Seleccionar"}>
                            {noDisponible
                              ? <><i className={`fas ${pasada?"fa-clock":"fa-lock"}`} /> {h}</>
                              : <><i className="fas fa-clock" /> {h}</>}
                          </button>
                        )
                      })}
                    </div>
                    <div className="horas-leyenda">
                      <span className="hl-item disponible"><span className="hl-dot" />Disponible</span>
                      <span className="hl-item ocupado"><span className="hl-dot" /><i className="fas fa-lock" style={{fontSize:10}} /> Ocupado</span>
                      {horaSel && <span className="hl-item seleccionado"><span className="hl-dot" />Seleccionado: {horaSel}</span>}
                    </div>
                  </>
                ) : (
                  <div className="horas-sin-disponibilidad">
                    <i className="fas fa-calendar-times" />
                    <p>No hay horarios disponibles para este día{barberoSel?` con ${barberoSel.nombre}`:""}.</p>
                    <p className="hsd-sub">Por favor selecciona otra fecha{barberoSel?" u otro barbero":""}.</p>
                    <button className="btn-atras inline" onClick={() => { setPaso(P.FECHA); setDiaSel(null) }}>
                      <i className="fas fa-calendar-alt" /> Elegir otra fecha
                    </button>
                    {barberoSel && (
                      <button className="btn-atras inline" style={{marginTop:8}} onClick={() => { setPaso(P.BARBERO); setDiaSel(null) }}>
                        <i className="fas fa-users" /> Cambiar barbero
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="cp-nav">
              <button className="btn-atras" onClick={() => setPaso(P.FECHA)}>
                <i className="fas fa-arrow-left" /> Atrás
              </button>
              <button className="btn-siguiente" disabled={!horaSel || cargandoHoras} onClick={() => setPaso(P.DATOS)}>
                Siguiente <i className="fas fa-arrow-right" />
              </button>
            </div>
          </section>
        )}

        {/* PASO DATOS */}
        {paso === P.DATOS && (
          <FormDatos form={form} setForm={setForm}
            onAtras={() => setPaso(P.HORA)}
            onSiguiente={() => { setErrMsg(""); setPaso(P.CONFIRMAR) }} />
        )}

        {/* PASO CONFIRMAR */}
        {paso === P.CONFIRMAR && (
          <section className="cp-section">
            <h2 className="cp-section-title">Confirma tu cita</h2>
            <div className="resumen-cita">
              <div className="rc-barberia"><i className="fas fa-store" /> {barberia.nombre}</div>
              <div className="rc-items">
                <div className="rc-item">
                  <span className="rc-label"><i className={`fas ${servicioSel?.tipo==="paquete"?"fa-box-open":"fa-cut"}`} /> {servicioSel?.tipo==="paquete"?"Paquete":"Servicio"}</span>
                  <span className="rc-val">{servicioSel?.descripcion}</span>
                </div>
                {hayBarberos && (
                  <div className="rc-item">
                    <span className="rc-label"><i className="fas fa-user-circle" /> Barbero</span>
                    <span className="rc-val">{barberoSel ? barberoSel.nombre : "Sin preferencia (asignación automática)"}</span>
                  </div>
                )}
                <div className="rc-item">
                  <span className="rc-label"><i className="fas fa-calendar" /> Fecha</span>
                  <span className="rc-val">{diaSel && `${DIAS_ES[diaSel.getDay()]} ${diaSel.getDate()} de ${MESES_ES[diaSel.getMonth()]}`}</span>
                </div>
                <div className="rc-item">
                  <span className="rc-label"><i className="fas fa-clock" /> Hora</span>
                  <span className="rc-val">{horaSel} hrs</span>
                </div>
                <div className="rc-item">
                  <span className="rc-label"><i className="fas fa-hourglass-half" /> Duración</span>
                  <span className="rc-val">{durLabel(servicioSel?.hora_estimada)}</span>
                </div>
                <div className="rc-item precio">
                  <span className="rc-label"><i className="fas fa-dollar-sign" /> Total</span>
                  <span className="rc-val">${parseFloat(servicioSel?.precio||0).toFixed(2)}</span>
                </div>
              </div>
              <div className="rc-cliente">
                <p><i className="fas fa-user" /> {form.nombre} {form.primerAp}</p>
                <p><i className="fas fa-phone" /> {form.telefono}</p>
                {form.usuarioFacebook && <p><i className="fab fa-facebook" /> {form.usuarioFacebook}</p>}
              </div>
            </div>

            {errMsg && (
              <div className={`cp-err-msg ${errMsg.startsWith("⛔") ? "cp-err-rate-limit" : ""}`}>
                {!errMsg.startsWith("⛔") && <i className="fas fa-exclamation-circle" />}
                {" "}{errMsg}
              </div>
            )}

            <div className="cp-nav">
              <button className="btn-atras" onClick={() => setPaso(P.DATOS)}><i className="fas fa-arrow-left" /> Modificar</button>
              <button className="btn-confirmar" onClick={confirmarCita} disabled={enviando}>
                {enviando
                  ? <><i className="fas fa-spinner fa-spin" /> Reservando...</>
                  : <><i className="fas fa-calendar-check" /> Confirmar reserva</>}
              </button>
            </div>
          </section>
        )}
      </main>

      {paso === P.SERVICIO && <BannerCatalogo barberiaId={id_barberia} />}
      <FooterPublico telefono={barberia.telefono} nombre={barberia.nombre} />
    </div>
  )
}