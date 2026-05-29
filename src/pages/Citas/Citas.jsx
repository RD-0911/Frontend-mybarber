import { useState, useEffect, useCallback, Fragment, useRef } from "react"
import "./Citas.css"
import { API, authHeaders } from "../../utils/api"

const DIAS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function generarHoras(inicio = "09:00", fin = "18:00", intervalo = 30) {
  const horas = []
  const [hi, mi] = inicio.split(":").map(Number)
  const [hf, mf] = fin.split(":").map(Number)
  let mins = hi * 60 + mi
  const finMins = hf * 60 + mf
  while (mins < finMins) {
    horas.push(`${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`)
    mins += intervalo
  }
  return horas
}

function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  const monday = new Date(d)
  monday.setDate(d.getDate() - d.getDay() + 1)
  return Array.from({ length: 6 }, (_, i) => {
    const dd = new Date(monday); dd.setDate(monday.getDate() + i); return dd
  })
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatFecha(d) {
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
}

function durLabel(m) {
  if (!m) return ""
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60); const r = m % 60
  return r ? `${h}h ${r}min` : `${h}h`
}

function minutosBloqueo(min) { return Math.ceil(min / 60) * 60 }

// ── Búsqueda de cliente ───────────────────────────────────────────
function ClienteSearch({ barberiaId, value, onChange }) {
  const [query, setQuery]         = useState("")
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando]   = useState(false)
  const [mostrar, setMostrar]     = useState(false)
  const timerRef = useRef(null)
  const wrapRef  = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMostrar(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleInput(e) {
    const q = e.target.value; setQuery(q); onChange(null)
    clearTimeout(timerRef.current)
    if (q.trim().length < 2) { setResultados([]); setMostrar(false); return }
    setBuscando(true)
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/barberia/${barberiaId}/clientes/buscar?q=${encodeURIComponent(q)}`,
          { headers: authHeaders() })
        const data = await r.json()
        setResultados(Array.isArray(data) ? data : []); setMostrar(true)
      } catch (_) { setResultados([]) }
      setBuscando(false)
    }, 300)
  }

  function seleccionar(cliente) {
    setQuery(`${cliente.nombre} ${cliente.primerAp}`)
    setResultados([]); setMostrar(false); onChange(cliente)
  }

  return (
    <div className="cliente-search-wrap" ref={wrapRef}>
      <div className="cliente-search-input-row">
        <input type="text" className="cliente-search-input"
          placeholder="Escribe el nombre del cliente..."
          value={query} onChange={handleInput} autoComplete="off" />
        {buscando && <i className="fas fa-spinner fa-spin cs-spin" />}
        {value   && <i className="fas fa-check-circle cs-ok" />}
      </div>
      {mostrar && resultados.length > 0 && (
        <ul className="cliente-dropdown">
          {resultados.map(c => (
            <li key={c.id} onMouseDown={() => seleccionar(c)}>
              <i className="fas fa-user" />
              <span className="cd-nombre">{c.nombre} {c.primerAp}</span>
              {c.telefono && <span className="cd-tel">{c.telefono}</span>}
            </li>
          ))}
        </ul>
      )}
      {mostrar && resultados.length === 0 && query.length >= 2 && !buscando && (
        <div className="cliente-no-results">
          <i className="fas fa-user-slash" /> Sin resultados para "{query}"
        </div>
      )}
    </div>
  )
}

export default function Citas({ barberia }) {
  const [citas,     setCitas]     = useState([])
  const [servicios, setServicios] = useState([])
  const [barberos,  setBarberos]  = useState([])
  const [bloqueos,  setBloqueos]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [baseDate,  setBaseDate]  = useState(new Date())
  const [vistaMode, setVistaMode] = useState("semana")
  const [modalOpen, setModalOpen] = useState(false)
  const [linkCopiado,   setLinkCopiado]   = useState(false)
  const [filtroEstado,  setFiltroEstado]  = useState("pendiente")
  const [filtroBarbero, setFiltroBarbero] = useState("todos")
  const [filtroPeriodo, setFiltroPeriodo] = useState("todo")
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 10
  const [horario, setHorario] = useState({ diasLaborales:[1,2,3,4,5,6], horaInicio:"09:00", horaFin:"18:00", intervaloMinutos:30 })

  const [form,      setForm]      = useState({ clienteObj: null, id_servicio: "", fechaInicio: "", hora: "", id_barbero: "" })
  const [formError, setFormError] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [citaDetalle, setCitaDetalle] = useState(null)

  const baseUrl     = window.location.origin
  const linkPublico = `${baseUrl}/cita?barberia=${barberia?.id}`
  const HORAS       = generarHoras(horario.horaInicio, horario.horaFin, horario.intervaloMinutos)

  const serviciosSolos = servicios.filter(s => s.tipo !== "paquete")
  const paquetes       = servicios.filter(s => s.tipo === "paquete")
  const hayBarberos    = barberos.length > 0

  // Carga completa — solo al montar (servicios/barberos/horario no cambian frecuente)
  const cargarTodo = useCallback(async () => {
    setLoading(true)
    try {
      const [rCitas, rServicios, rBarberos, rHorario, rBloqueos] = await Promise.all([
        fetch(`${API}/public/citas-barberia/${barberia.id}`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/public/servicios/${barberia.id}`).then(r => r.json()),
        fetch(`${API}/public/barberos/${barberia.id}`).then(r => r.json()),
        fetch(`${API}/barberia/${barberia.id}/horario`).then(r => r.json()).catch(() => null),
        fetch(`${API}/barberia/bloqueos`, { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      ])
      setCitas(Array.isArray(rCitas) ? rCitas : [])
      setServicios(Array.isArray(rServicios) ? rServicios : [])
      setBarberos(Array.isArray(rBarberos) ? rBarberos : [])
      setBloqueos(Array.isArray(rBloqueos) ? rBloqueos : [])
      if (rHorario && rHorario.horaInicio) setHorario(rHorario)
    } catch (_) { setCitas([]); setServicios([]) }
    setLoading(false)
  }, [barberia?.id])

  // Polling ligero — solo actualiza citas cada 30s
  const cargarCitas = useCallback(async () => {
    try {
      const r = await fetch(`${API}/public/citas-barberia/${barberia.id}`, { headers: authHeaders() })
      const data = await r.json()
      if (Array.isArray(data)) setCitas(data)
    } catch (_) {}
  }, [barberia?.id])

  // Alias para compatibilidad con botones que llaman a cargarDatos tras guardar
  const cargarDatos = cargarTodo

  useEffect(() => {
    if (!barberia?.id) return
    cargarTodo()                                    // carga completa al entrar
    const intervalo = setInterval(cargarCitas, 30000) // solo citas en el polling
    return () => clearInterval(intervalo)
  }, [barberia?.id, cargarTodo, cargarCitas])

  const semana = getWeekDates(baseDate)

  function citasDelSlot(dia, hora) {
    return citas.filter(c => {
      const f  = new Date(c.fechaInicio)
      const hh = `${String(f.getHours()).padStart(2,"0")}:${String(f.getMinutes()).padStart(2,"0")}`
      return isSameDay(f, dia) && hh === hora &&
        (filtroBarbero === "todos" || String(c.id_barbero) === String(filtroBarbero))
    })
  }

  function estaOcupado(dia, hora) {
    const [hh, mm] = hora.split(":").map(Number)
    const slotInicio = new Date(dia); slotInicio.setHours(hh, mm, 0, 0)
    const slotFin    = new Date(slotInicio.getTime() + horario.intervaloMinutos * 60000)

    return citas.some(c => {
      if (c.estado === "cancelada") return false
      if (filtroBarbero !== "todos" && String(c.id_barbero) !== String(filtroBarbero)) return false
      const inicio = new Date(c.fechaInicio)
      if (!isSameDay(inicio, dia)) return false
      const fin = c.fechaFin
        ? new Date(c.fechaFin)
        : new Date(inicio.getTime() + minutosBloqueo(c.hora_estimada || 60) * 60000)
      return inicio < slotFin && fin > slotInicio
    })
  }

  // Detecta si un slot tiene bloqueo visible con el filtro actual
  // - Si hay barbero filtrado: devuelve su bloqueo si lo tiene
  // - Si filtro es "todos": solo marca bloqueado si TODOS los barberos tienen bloqueo
  //   (si hay al menos uno libre, el slot sigue siendo agendable)
  function bloqueoDelSlot(dia, hora) {
    const [hh, mm] = hora.split(":").map(Number)
    const slotInicio = new Date(dia); slotInicio.setHours(hh, mm, 0, 0)
    const slotFin    = new Date(slotInicio.getTime() + horario.intervaloMinutos * 60000)

    if (filtroBarbero !== "todos") {
      return bloqueos.find(b => {
        if (String(b.id_barbero) !== String(filtroBarbero)) return false
        const ini = new Date(b.fecha_inicio)
        const fin = new Date(b.fecha_fin)
        return ini < slotFin && fin > slotInicio
      }) || null
    }

    // Filtro "Todos": solo cuenta como bloqueo si TODOS los barberos activos lo tienen
    if (!hayBarberos) return null
    const bloqueadosEnSlot = new Set()
    bloqueos.forEach(b => {
      const ini = new Date(b.fecha_inicio)
      const fin = new Date(b.fecha_fin)
      if (ini < slotFin && fin > slotInicio) bloqueadosEnSlot.add(String(b.id_barbero))
    })
    const todosBloqueados = barberos.every(b => bloqueadosEnSlot.has(String(b.id)))
    if (!todosBloqueados) return null
    // Devolver el primer bloqueo como representativo
    return bloqueos.find(b => {
      const ini = new Date(b.fecha_inicio)
      const fin = new Date(b.fecha_fin)
      return ini < slotFin && fin > slotInicio
    }) || null
  }

  // Verifica si un barbero ESPECÍFICO está bloqueado en un horario dado
  function barberoBloqueadoEn(idBarbero, fechaStr, hora) {
    if (!fechaStr || !hora || !idBarbero) return null
    const [hh, mm] = hora.split(":").map(Number)
    const inicio = new Date(`${fechaStr}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00`)
    const fin    = new Date(inicio.getTime() + (horario.intervaloMinutos || 30) * 60000)
    return bloqueos.find(b => {
      if (String(b.id_barbero) !== String(idBarbero)) return false
      const ini = new Date(b.fecha_inicio)
      const finB = new Date(b.fecha_fin)
      return ini < fin && finB > inicio
    }) || null
  }

  // Horas ocupadas para el select del modal — filtra por barbero seleccionado
  function horasOcupadasEnFecha(fechaStr, idBarbero) {
    if (!fechaStr) return new Set()
    const ocupadas = new Set()
    citas
      .filter(c => {
        if (c.estado === "cancelada") return false
        const f = new Date(c.fechaInicio)
        const d = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}-${String(f.getDate()).padStart(2,"0")}`
        if (d !== fechaStr) return false
        // Si hay barberos y se eligió uno específico, solo bloquear sus citas
        if (hayBarberos && idBarbero) return String(c.id_barbero) === String(idBarbero)
        // Sin barberos — bloquear todo
        return true
      })
      .forEach(c => {
        const inicio = new Date(c.fechaInicio)
        const fin = c.fechaFin
          ? new Date(c.fechaFin)
          : new Date(inicio.getTime() + minutosBloqueo(c.hora_estimada || 60) * 60000)
        let t = new Date(inicio)
        while (t < fin) {
          ocupadas.add(`${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`)
          t = new Date(t.getTime() + horario.intervaloMinutos * 60000)
        }
      })
    return ocupadas
  }

  function abrirModalNuevo() {
    const hoy = new Date()
    const fechaStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`
    setForm({ clienteObj: null, id_servicio: "", fechaInicio: fechaStr, hora: "", id_barbero: "" })
    setFormError(""); setModalOpen(true)
  }

  function abrirNuevaCita(dia, hora) {
    if (estaOcupado(dia, hora)) return
    const fechaStr = `${dia.getFullYear()}-${String(dia.getMonth()+1).padStart(2,"0")}-${String(dia.getDate()).padStart(2,"0")}`
    setForm({ clienteObj: null, id_servicio: "", fechaInicio: fechaStr, hora, id_barbero: "" })
    setFormError(""); setModalOpen(true)
  }

  async function guardarCita() {
    if (!form.clienteObj || !form.id_servicio || !form.fechaInicio || !form.hora) {
      setFormError("Completa todos los campos obligatorios"); return
    }
    // Verificar bloqueo de barbero seleccionado
    if (form.id_barbero && barberoBloqueadoEn(form.id_barbero, form.fechaInicio, form.hora)) {
      setFormError("Este barbero tiene bloqueado ese horario. Elige otro barbero o cambia la hora."); return
    }
    setGuardando(true)
    try {
      const servicio    = servicios.find(s => s.id == form.id_servicio)
      const fechaInicio = new Date(`${form.fechaInicio}T${form.hora}:00`)
      const bloqueo     = minutosBloqueo(servicio?.hora_estimada || 30)
      const fechaFin    = new Date(fechaInicio.getTime() + bloqueo * 60000)

      const body = {
        id_barberia:  barberia.id,
        id_cliente:   form.clienteObj.id,
        id_servicio:  form.id_servicio,
        fechaInicio:  fechaInicio.toISOString(),
        fechaFin:     fechaFin.toISOString(),
      }
      if (hayBarberos && form.id_barbero) body.id_barbero = form.id_barbero

      const res = await fetch(`${API}/public/citas`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar")
      setModalOpen(false); cargarDatos()
    } catch (e) { setFormError(e.message) }
    setGuardando(false)
  }

  async function cambiarEstado(id, estado) {
    await fetch(`${API}/public/citas/${id}/estado`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify({ estado })
    })
    cargarDatos()
    if (citaDetalle?.telefono && ["confirmada","cancelada"].includes(estado))
      abrirWhatsApp(citaDetalle, estado)
    setCitaDetalle(null)
  }

  function abrirWhatsApp(cita, estado) {
    const tel = cita.telefono?.replace(/\D/g, "")
    if (!tel) return
    const nombre   = cita.cliente_nombre || "Cliente"
    const servicio = cita.servicio_desc  || "el servicio"
    const fecha    = new Date(cita.fechaInicio)
    const fechaStr = fecha.toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" })
    const horaStr  = `${String(fecha.getHours()).padStart(2,"0")}:${String(fecha.getMinutes()).padStart(2,"0")}`
    const mensajes = {
      confirmada: `Hola ${nombre}! 👋\nTu cita ha sido *CONFIRMADA* ✅\n\n✂️ *Servicio:* ${servicio}\n📅 *Fecha:* ${fechaStr}\n🕐 *Hora:* ${horaStr} hrs\n\n¡Te esperamos! 😊`,
      cancelada:  `Hola ${nombre} 👋\nTu cita ha sido *CANCELADA* ❌\n\n✂️ *Servicio:* ${servicio}\n📅 *Fecha:* ${fechaStr}\n🕐 *Hora:* ${horaStr} hrs\n\nPuedes agendar una nueva cita cuando gustes 🙏`,
    }
    if (mensajes[estado]) window.open(`https://wa.me/52${tel}?text=${encodeURIComponent(mensajes[estado])}`, "_blank")
  }

  function copiarLink() {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(linkPublico)
        .then(() => { setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000) })
    }
  }

  const estadoColor = { pendiente:"#f59e0b", confirmada:"#10b981", cancelada:"#ef4444", completada:"#6366f1" }
  const citasHoy        = citas.filter(c => isSameDay(new Date(c.fechaInicio), new Date()))
  const citasPendientes = citas.filter(c => c.estado === "pendiente")
  const servicioSelObj  = servicios.find(s => s.id == form.id_servicio)
  const ocupadasEnForm  = horasOcupadasEnFecha(form.fechaInicio, form.id_barbero)

  return (
    <div className="citas-root">

      {/* ── Top bar ── */}
      <div className="citas-topbar">
        <div className="citas-topbar-left">
          <h1 className="citas-title"><i className="fas fa-calendar-alt" /> Gestión de Citas</h1>
          <div className="citas-stats">
            <div className="stat-chip"><span className="stat-n">{citasHoy.length}</span><span className="stat-l">Hoy</span></div>
            <div className="stat-chip pending"><span className="stat-n">{citasPendientes.length}</span><span className="stat-l">Pendientes</span></div>
            <div className="stat-chip total"><span className="stat-n">{citas.length}</span><span className="stat-l">Total</span></div>
          </div>
        </div>
        <div className="citas-topbar-right">
          <div className="link-facebook">
            <i className="fab fa-facebook" />
            <span className="link-label">Link para Facebook:</span>
            <span className="link-url">{linkPublico}</span>
            <button className={`btn-copiar ${linkCopiado ? "copiado" : ""}`} onClick={copiarLink}>
              <i className={`fas ${linkCopiado ? "fa-check" : "fa-copy"}`} />
              {linkCopiado ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <div className="topbar-actions">
            <div className="vista-toggle">
              <button className={vistaMode==="semana"?"active":""} onClick={()=>setVistaMode("semana")}>
                <i className="fas fa-th" /> Semana
              </button>
              <button className={vistaMode==="lista"?"active":""} onClick={()=>setVistaMode("lista")}>
                <i className="fas fa-list" /> Lista
              </button>
            </div>
            <button className="btn-nueva-cita" onClick={abrirModalNuevo}>
              <i className="fas fa-plus" /> Nueva cita
            </button>
          </div>
        </div>
      </div>

      {/* ── Filtro por barbero ── */}
      {hayBarberos && (
        <div className="barbero-filtro-bar">
          <span className="bf-label"><i className="fas fa-users" /> Ver agenda de:</span>
          <div className="bf-btns">
            <button className={filtroBarbero === "todos" ? "active" : ""}
              onClick={() => setFiltroBarbero("todos")}>
              Todos
            </button>
            {barberos.map(b => (
              <button key={b.id}
                className={String(filtroBarbero) === String(b.id) ? "active" : ""}
                onClick={() => setFiltroBarbero(String(b.id))}>
                {b.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Vista Semana ── */}
      {vistaMode === "semana" && (
        <div className="semana-wrap">
          <div className="semana-nav">
            <button onClick={()=>{ const d=new Date(baseDate); d.setDate(d.getDate()-7); setBaseDate(d) }}>
              <i className="fas fa-chevron-left" />
            </button>
            <span className="semana-rango">{formatFecha(semana[0])} — {formatFecha(semana[5])}</span>
            <button onClick={()=>{ const d=new Date(baseDate); d.setDate(d.getDate()+7); setBaseDate(d) }}>
              <i className="fas fa-chevron-right" />
            </button>
            <button className="btn-hoy" onClick={()=>setBaseDate(new Date())}>Hoy</button>
          </div>

          <div className="calendario-grid">
            <div className="cal-corner" />
            {semana.map((dia, i) => {
              const esHoy = isSameDay(dia, new Date())
              return (
                <div key={i} className={`cal-dia-header ${esHoy?"hoy":""}`}>
                  <span className="cal-dia-nombre">{DIAS[dia.getDay()]}</span>
                  <span className="cal-dia-num">{dia.getDate()}</span>
                  {esHoy && <span className="hoy-badge">Hoy</span>}
                </div>
              )
            })}

            {HORAS.map(hora => (
              <Fragment key={`row-${hora}`}>
                <div className="cal-hora-label">{hora}</div>
                {semana.map((dia, di) => {
                  const slotCitas = citasDelSlot(dia, hora)
                  const esPasado  = dia < new Date() && !isSameDay(dia, new Date())
                  const ocupado   = slotCitas.length > 0 || estaOcupado(dia, hora)
                  const bloqueoAgenda = bloqueoDelSlot(dia, hora) // bloqueo del barbero (vacaciones, etc.)
                  const esBloqueoDur  = ocupado && slotCitas.length === 0 && !bloqueoAgenda // bloqueo por duración de otra cita
                  const esBloqueado   = !!bloqueoAgenda
                  const clickeable    = !esPasado && !ocupado && !esBloqueado
                  return (
                    <div key={`${hora}-${di}`}
                      className={`cal-slot ${esPasado?"pasado":""} ${ocupado?"ocupado":""} ${esBloqueoDur?"bloqueo":""} ${esBloqueado?"bloqueo-agenda":""}`}
                      onClick={() => clickeable && abrirNuevaCita(dia, hora)}
                      title={
                        esBloqueado
                          ? `🚫 ${bloqueoAgenda.barbero_nombre} bloqueó este horario${bloqueoAgenda.motivo ? ": " + bloqueoAgenda.motivo : ""}`
                          : esBloqueoDur ? "Bloqueado por duración"
                          : ocupado ? "Ocupado"
                          : esPasado ? "Fecha pasada"
                          : "Clic para agendar"
                      }>
                      {esBloqueado && slotCitas.length === 0 && (
                        <div className="slot-bloqueo-agenda">
                          <i className="fas fa-ban" />
                          <span className="slot-bloq-nombre">{bloqueoAgenda.barbero_nombre}</span>
                          {bloqueoAgenda.motivo && <span className="slot-bloq-motivo">{bloqueoAgenda.motivo}</span>}
                        </div>
                      )}
                      {slotCitas.map(c => (
                        <div key={c.id} className="cita-chip"
                          style={{ borderLeftColor: estadoColor[c.estado] || "#9b30d9" }}
                          onClick={e => { e.stopPropagation(); setCitaDetalle(c) }}>
                          <span className="chip-cliente">{c.cliente_nombre || "Cliente"}</span>
                          <span className="chip-servicio">
                            {c.servicio_tipo==="paquete" && <i className="fas fa-box-open" style={{marginRight:3,fontSize:10}} />}
                            {c.servicio_desc || ""}
                          </span>
                          {hayBarberos && c.barbero_nombre && (
                            <span className="chip-barbero">
                              <i className="fas fa-user-circle" /> {c.barbero_nombre}
                            </span>
                          )}
                        </div>
                      ))}
                      {clickeable && <div className="slot-add-hint"><i className="fas fa-plus" /></div>}
                      {esBloqueoDur && <div className="slot-ocupado-icon"><i className="fas fa-lock" /></div>}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>

          <div className="cal-leyenda">
            <span><span className="ley-dot" style={{background:"#f59e0b"}} />Pendiente</span>
            <span><span className="ley-dot" style={{background:"#10b981"}} />Confirmada</span>
            <span><span className="ley-dot" style={{background:"#6366f1"}} />Completada</span>
            <span><span className="ley-dot" style={{background:"#ef4444"}} />Cancelada</span>
            <span><span className="ley-dot ocupado-ley" />Ocupado</span>
            <span><span className="ley-dot bloqueo-agenda-ley" />Día bloqueado</span>
          </div>
        </div>
      )}

      {/* ── Vista Lista ── */}
      {vistaMode === "lista" && (() => {
        const ahora = new Date()
        const periodoInicio = (() => {
          if (filtroPeriodo === "hoy") {
            const d = new Date(ahora); d.setHours(0,0,0,0); return d
          }
          if (filtroPeriodo === "semana") {
            const d = new Date(ahora); d.setDate(ahora.getDate()-6); d.setHours(0,0,0,0); return d
          }
          if (filtroPeriodo === "mes") {
            return new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0,0,0,0)
          }
          return null
        })()

        const orden = { pendiente:0, confirmada:1, completada:2, cancelada:3 }
        const citasFiltradas = [...citas]
          .sort((a,b) => orden[a.estado]-orden[b.estado] || new Date(b.fechaInicio)-new Date(a.fechaInicio))
          .filter(c => filtroEstado === "todas" || c.estado === filtroEstado)
          .filter(c => filtroBarbero === "todos" || String(c.id_barbero) === String(filtroBarbero))
          .filter(c => !periodoInicio || new Date(c.fechaInicio) >= periodoInicio)
        const citasVisibles = citasFiltradas.slice(0, pagina * POR_PAGINA)
        const hayMas = citasVisibles.length < citasFiltradas.length

        const PERIODOS_LISTA = [
          { val:"hoy",    label:"Hoy"        },
          { val:"semana", label:"7 días"     },
          { val:"mes",    label:"Este mes"   },
          { val:"todo",   label:"Todo"       },
        ]

        return (
          <div className="lista-wrap">
            {/* Filtro de periodo */}
            <div className="lista-periodo-bar">
              <i className="fas fa-calendar-alt lista-periodo-icon" />
              {PERIODOS_LISTA.map(p => (
                <button key={p.val}
                  className={`lista-periodo-btn ${filtroPeriodo === p.val ? "activo" : ""}`}
                  onClick={() => { setFiltroPeriodo(p.val); setPagina(1) }}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="lista-filtros">
              <span className="lista-count">{citasFiltradas.length} citas</span>
              <div className="filtro-btns">
                {[["pendiente","#f59e0b"],["confirmada","#10b981"],["completada","#6366f1"],["cancelada","#ef4444"],["todas","#9b30d9"]].map(([est,color]) => (
                  <button key={est} className={`filtro-btn ${filtroEstado===est?"activo":""}`}
                    style={{"--fc":color}} onClick={() => { setFiltroEstado(est); setPagina(1) }}>
                    {est.charAt(0).toUpperCase()+est.slice(1)}
                    <span className="filtro-count">{est==="todas"?citasFiltradas.length:citasFiltradas.filter(c=>c.estado===est).length}</span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="loading-citas"><i className="fas fa-spinner fa-spin" /> Cargando...</div>
            ) : citasFiltradas.length === 0 ? (
              <div className="empty-citas"><i className="fas fa-calendar-times" />
                <p>No hay citas {filtroEstado!=="todas"?`con estado "${filtroEstado}"`:"registradas"}.</p>
              </div>
            ) : (
              <>
                <div className="lista-citas">
                  {citasVisibles.map(c => {
                    const f = new Date(c.fechaInicio)
                    return (
                      <div key={c.id} className="lista-item" onClick={() => setCitaDetalle(c)}>
                        <div className="lista-fecha">
                          <span className="lf-dia">{f.getDate()}</span>
                          <span className="lf-mes">{MESES[f.getMonth()].slice(0,3)}</span>
                        </div>
                        <div className="lista-info">
                          <span className="li-nombre">{c.cliente_nombre || "Sin nombre"}</span>
                          <span className="li-servicio">
                            <i className={`fas ${c.servicio_tipo==="paquete"?"fa-box-open":"fa-cut"}`} />
                            {" "}{c.servicio_desc || "Servicio"}
                          </span>
                          <span className="li-hora"><i className="fas fa-clock" /> {String(f.getHours()).padStart(2,"0")}:{String(f.getMinutes()).padStart(2,"0")}</span>
                          {hayBarberos && c.barbero_nombre && (
                            <span className="li-barbero"><i className="fas fa-user-circle" /> {c.barbero_nombre}</span>
                          )}
                        </div>
                        <div className="lista-estado">
                          <span className="estado-badge" style={{background:estadoColor[c.estado]+"22",color:estadoColor[c.estado],borderColor:estadoColor[c.estado]}}>
                            {c.estado}
                          </span>
                        </div>
                        <div className="lista-precio">${parseFloat(c.precio||0).toFixed(2)}</div>
                      </div>
                    )
                  })}
                </div>
                {hayMas && (
                  <div className="ver-mas-wrap">
                    <button className="btn-ver-mas" onClick={() => setPagina(p=>p+1)}>
                      <i className="fas fa-chevron-down" /> Ver más ({citasFiltradas.length-citasVisibles.length} restantes)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* ── Modal Nueva Cita ── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-calendar-plus" /> Nueva Cita</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>Cliente * <span className="label-hint">Busca por nombre o teléfono</span></label>
                <ClienteSearch barberiaId={barberia?.id} value={form.clienteObj}
                  onChange={c => setForm({...form, clienteObj: c})} />
              </div>

              <div className="form-row">
                <label>Servicio / Paquete *</label>
                <select value={form.id_servicio} onChange={e => setForm({...form, id_servicio: e.target.value, hora: ""})}>
                  <option value="">— Selecciona —</option>
                  {serviciosSolos.length > 0 && (
                    <optgroup label="✂️ Servicios">
                      {serviciosSolos.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.descripcion} — ${s.precio} ({durLabel(s.hora_estimada)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {paquetes.length > 0 && (
                    <optgroup label="📦 Paquetes">
                      {paquetes.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.descripcion} — ${s.precio} ({durLabel(s.hora_estimada)}, bloquea {durLabel(minutosBloqueo(s.hora_estimada))})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {servicioSelObj?.tipo === "paquete" && servicioSelObj.contenido && (
                <div className="paquete-info-box">
                  <p className="pib-title"><i className="fas fa-box-open" /> Incluye:</p>
                  <ul className="pib-list">
                    {servicioSelObj.contenido.split("\n").filter(Boolean).map((line, i) => (
                      <li key={i}><i className="fas fa-check" /> {line}</li>
                    ))}
                  </ul>
                  <p className="pib-bloqueo">
                    <i className="fas fa-lock" /> Bloquea {durLabel(minutosBloqueo(servicioSelObj.hora_estimada))} en la agenda
                  </p>
                </div>
              )}

              {/* Selector de barbero — solo si hay barberos */}
              {hayBarberos && (
                <div className="form-row">
                  <label><i className="fas fa-user-circle" /> ¿Quién atiende?</label>
                  <select value={form.id_barbero} onChange={e => setForm({...form, id_barbero: e.target.value, hora: ""})}>
                    <option value="">— Sin asignar —</option>
                    {barberos.map(b => {
                      const bloq = form.hora ? barberoBloqueadoEn(b.id, form.fechaInicio, form.hora) : null
                      return (
                        <option key={b.id} value={b.id} disabled={!!bloq}>
                          {b.nombre}{bloq ? " 🚫 bloqueado" : ""}
                        </option>
                      )
                    })}
                  </select>
                  {form.id_barbero && form.hora && barberoBloqueadoEn(form.id_barbero, form.fechaInicio, form.hora) && (
                    <span className="form-error-inline">
                      <i className="fas fa-ban" /> Este barbero tiene bloqueado este horario
                    </span>
                  )}
                </div>
              )}

              <div className="form-row-2">
                <div className="form-row">
                  <label>Fecha *</label>
                  <input type="date" value={form.fechaInicio}
                    onChange={e => setForm({...form, fechaInicio: e.target.value, hora: ""})} />
                </div>
                <div className="form-row">
                  <label>Hora *</label>
                  <select value={form.hora} onChange={e => setForm({...form, hora: e.target.value})}>
                    <option value="">— Hora —</option>
                    {HORAS.map(h => {
                      const isOcupada = ocupadasEnForm.has(h)
                      return (
                        <option key={h} value={h} disabled={isOcupada}
                          style={isOcupada?{color:"#aaa",background:"#f8eef8"}:{}}>
                          {h}{isOcupada?" — ocupado":""}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {formError && <p className="form-error"><i className="fas fa-exclamation-circle" /> {formError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn-guardar" onClick={guardarCita} disabled={guardando}>
                {guardando
                  ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                  : <><i className="fas fa-check" /> Guardar cita</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Detalle Cita ── */}
      {citaDetalle && (
        <div className="modal-overlay" onClick={() => setCitaDetalle(null)}>
          <div className="modal-box detalle-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-info-circle" /> Detalle de Cita</h2>
              <button className="modal-close" onClick={() => setCitaDetalle(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <div className="detalle-grid">
                <div className="detalle-item">
                  <span className="di-label"><i className="fas fa-user" /> Cliente</span>
                  <span className="di-val">{citaDetalle.cliente_nombre || "—"}</span>
                </div>
                <div className="detalle-item">
                  <span className="di-label">
                    <i className={`fas ${citaDetalle.servicio_tipo==="paquete"?"fa-box-open":"fa-cut"}`} />
                    {" "}{citaDetalle.servicio_tipo==="paquete"?"Paquete":"Servicio"}
                  </span>
                  <span className="di-val">{citaDetalle.servicio_desc || "—"}</span>
                </div>
                {hayBarberos && (
                  <div className="detalle-item">
                    <span className="di-label"><i className="fas fa-user-circle" /> Barbero</span>
                    <span className="di-val">{citaDetalle.barbero_nombre || "Sin asignar"}</span>
                  </div>
                )}
                <div className="detalle-item">
                  <span className="di-label"><i className="fas fa-calendar" /> Fecha</span>
                  <span className="di-val">{new Date(citaDetalle.fechaInicio).toLocaleString("es-MX")}</span>
                </div>
                <div className="detalle-item">
                  <span className="di-label"><i className="fas fa-dollar-sign" /> Precio</span>
                  <span className="di-val">${parseFloat(citaDetalle.precio||0).toFixed(2)}</span>
                </div>
                <div className="detalle-item">
                  <span className="di-label"><i className="fas fa-tag" /> Estado</span>
                  <span className="di-val">
                    <span className="estado-badge" style={{background:estadoColor[citaDetalle.estado]+"22",color:estadoColor[citaDetalle.estado],borderColor:estadoColor[citaDetalle.estado]}}>
                      {citaDetalle.estado}
                    </span>
                  </span>
                </div>
                {citaDetalle.telefono && (
                  <div className="detalle-item">
                    <span className="di-label"><i className="fas fa-phone" /> Teléfono</span>
                    <span className="di-val">{citaDetalle.telefono}</span>
                  </div>
                )}
              </div>
              <div className="detalle-acciones">
                <p className="acciones-label">Cambiar estado:</p>
                <div className="acciones-btns">
                  {["pendiente","confirmada","completada","cancelada"].map(est => (
                    <button key={est} className={`btn-estado ${citaDetalle.estado===est?"activo":""}`}
                      style={{"--ec":estadoColor[est]}} onClick={() => cambiarEstado(citaDetalle.id, est)}>
                      {est}
                      {["confirmada","cancelada"].includes(est) && citaDetalle.telefono && (
                        <i className="fab fa-whatsapp wa-hint" />
                      )}
                    </button>
                  ))}
                  {citaDetalle.telefono
                    ? <p className="wa-aviso"><i className="fab fa-whatsapp" /> Al cambiar estado se abrirá WhatsApp</p>
                    : <p className="wa-aviso sin-tel"><i className="fas fa-exclamation-circle" /> Sin teléfono</p>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}