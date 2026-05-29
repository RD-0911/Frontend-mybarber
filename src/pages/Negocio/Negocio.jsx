import { useState, useEffect, useCallback } from "react"
import "./Negocio.css"
import { API, authHeaders } from "../../utils/api"
import Modal from "../../components/Modal/Modal"

const DIAS_SEMANA = [
  { id: 0, label: "Dom" }, { id: 1, label: "Lun" }, { id: 2, label: "Mar" },
  { id: 3, label: "Mié" }, { id: 4, label: "Jue" }, { id: 5, label: "Vie" }, { id: 6, label: "Sáb" }
]
const INTERVALOS = [
  { val: 15, label: "15 min" }, { val: 20, label: "20 min" },
  { val: 30, label: "30 min" }, { val: 45, label: "45 min" }, { val: 60, label: "1 hora" }
]
const DURACIONES = [15, 20, 30, 45, 60, 75, 90, 105, 120]

function durLabel(m) {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60); const r = m % 60
  return r ? `${h}h ${r}min` : `${h} hora${h > 1 ? "s" : ""}`
}
function minutosBloqueo(min) { return Math.ceil(min / 60) * 60 }
function generarOpcionesHora() {
  const opts = []
  for (let h = 6; h <= 23; h++)
    for (let m of [0, 30]) {
      if (h === 23 && m === 30) continue
      opts.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`)
    }
  return opts
}
const HORAS_OPTS = generarOpcionesHora()

// ── Modal Servicio / Paquete ──────────────────────────────────────

// ── Modal Servicio / Paquete ──────────────────────────────────────
function ModalServicio({ servicio, onSave, onClose }) {
  const [form, setForm] = useState(servicio ? {
    tipo: servicio.tipo || "servicio", descripcion: servicio.descripcion || "",
    contenido: servicio.contenido || "", precio: servicio.precio || "",
    hora_estimada: parseInt(servicio.hora_estimada) || 30,
  } : { tipo: "servicio", descripcion: "", contenido: "", precio: "", hora_estimada: 30 })
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false)
  const esPaquete = form.tipo === "paquete"
  const bloqueo   = minutosBloqueo(form.hora_estimada)

  async function handleSave() {
    if (!form.descripcion.trim() || !form.precio || !form.hora_estimada)
      return setError("Nombre, precio y duración son requeridos")
    if (esPaquete && !form.contenido.trim())
      return setError("Describe qué incluye el paquete")
    if (isNaN(parseFloat(form.precio)) || parseFloat(form.precio) <= 0)
      return setError("El precio debe ser un número positivo")
    setSaving(true)
    try {
      await onSave({ tipo: form.tipo, descripcion: form.descripcion.trim(),
        contenido: esPaquete ? form.contenido.trim() : "",
        precio: parseFloat(form.precio), hora_estimada: parseInt(form.hora_estimada) })
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  return (
    <Modal
      title={servicio
        ? `Editar ${esPaquete ? "paquete" : "servicio"}`
        : "Nuevo registro"}
      icon={servicio ? "fa-edit" : "fa-plus-circle"}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button className="m-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="m-btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
              : <><i className="fas fa-check" /> Guardar</>}
          </button>
        </>
      }
    >
      {/* Tipo — solo al crear */}
      {!servicio && (
        <div className="m-row">
          <label>Tipo *</label>
          <div className="tipo-toggle">
            <button type="button"
              className={`tipo-btn${form.tipo === "servicio" ? " activo" : ""}`}
              onClick={() => setForm({ ...form, tipo: "servicio", contenido: "" })}>
              <i className="fas fa-cut" /> Servicio
            </button>
            <button type="button"
              className={`tipo-btn paquete${form.tipo === "paquete" ? " activo" : ""}`}
              onClick={() => setForm({ ...form, tipo: "paquete" })}>
              <i className="fas fa-box-open" /> Paquete
            </button>
          </div>
        </div>
      )}

      <div className="m-row">
        <label>{esPaquete ? "Nombre del paquete *" : "Descripción del servicio *"}</label>
        <input type="text"
          placeholder={esPaquete ? "Ej: Paquete VIP, Combo Novio..." : "Ej: Corte clásico, Fade, Barba..."}
          value={form.descripcion}
          onChange={e => setForm({ ...form, descripcion: e.target.value })} />
      </div>

      {esPaquete && (
        <div className="m-row">
          <label>
            ¿Qué incluye? *
            <span className="m-hint">Escribe cada elemento en una línea</span>
          </label>
          <textarea
            rows={4}
            placeholder={"Corte clásico\nArreglo de barba\nMascarilla facial\nBebida de cortesía"}
            value={form.contenido}
            onChange={e => setForm({ ...form, contenido: e.target.value })} />
        </div>
      )}

      <div className="m-row-2">
        <div className="m-row">
          <label>Precio ($) *</label>
          <input type="number" min="0" step="0.50" placeholder="0.00"
            value={form.precio}
            onChange={e => setForm({ ...form, precio: e.target.value })} />
        </div>
        <div className="m-row">
          <label>Duración real *</label>
          <select value={form.hora_estimada}
            onChange={e => setForm({ ...form, hora_estimada: parseInt(e.target.value) })}>
            {DURACIONES.map(m => <option key={m} value={m}>{durLabel(m)}</option>)}
          </select>
        </div>
      </div>

      <div className={`bloqueo-info ${bloqueo === form.hora_estimada ? "ok" : "warn"}`}>
        <i className={`fas ${bloqueo === form.hora_estimada ? "fa-calendar-check" : "fa-calendar-times"}`} />
        {bloqueo === form.hora_estimada
          ? ` Bloquea exactamente ${durLabel(bloqueo)} en la agenda`
          : ` Bloquea ${durLabel(bloqueo)} en la agenda (duración real: ${durLabel(form.hora_estimada)})`}
      </div>

      {error && <div className="m-error"><i className="fas fa-exclamation-circle" /> {error}</div>}
    </Modal>
  )
}

// ── Modal Barbero ─────────────────────────────────────────────────
function ModalBarbero({ barbero, onSave, onClose }) {
  const [form, setForm] = useState(barbero
    ? { nombre: barbero.nombre || "", correo: barbero.correo || "", password: "" }
    : { nombre: "", correo: "", password: "" })
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.nombre.trim() || !form.correo.trim())
      return setError("Nombre y correo son requeridos")
    if (!barbero && !form.password.trim())
      return setError("La contraseña es requerida al crear un barbero")
    if (form.password && form.password.length < 6)
      return setError("La contraseña debe tener mínimo 6 caracteres")
    setSaving(true)
    try {
      await onSave({ nombre: form.nombre.trim(), correo: form.correo.trim(), password: form.password })
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  return (
    <Modal
      title={barbero ? "Editar barbero" : "Nuevo barbero"}
      icon={barbero ? "fa-user-edit" : "fa-user-plus"}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="m-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="m-btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
              : <><i className="fas fa-check" /> Guardar</>}
          </button>
        </>
      }
    >
      <div className="m-row">
        <label><i className="fas fa-user" /> Nombre *</label>
        <input type="text" placeholder="Nombre del barbero"
          value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
      </div>

      <div className="m-row">
        <label><i className="fas fa-envelope" /> Correo *</label>
        <input type="email" placeholder="correo@ejemplo.com"
          value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} />
      </div>

      <div className="m-row">
        <label>
          <i className="fas fa-lock" /> {barbero ? "Nueva contraseña" : "Contraseña *"}
          {barbero && <span className="m-hint">dejar vacío para no cambiar</span>}
        </label>
        <input type="password" placeholder="Mínimo 6 caracteres"
          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      </div>

      <div className="m-info">
        <i className="fas fa-info-circle" />
        El barbero entra con este correo y contraseña desde el login normal.
      </div>

      {error && <div className="m-error"><i className="fas fa-exclamation-circle" /> {error}</div>}
    </Modal>
  )
}

// ── Modal Confirmar ───────────────────────────────────────────────
function ModalConfirmar({ mensaje, onConfirm, onClose }) {
  return (
    <Modal
      title="Confirmar eliminación"
      icon="fa-trash-alt"
      onClose={onClose}
      size="sm"
      danger
      footer={
        <>
          <button className="m-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="m-btn-danger" onClick={onConfirm}>
            <i className="fas fa-trash" /> Eliminar
          </button>
        </>
      }
    >
      <p className="m-confirm-text">{mensaje}</p>
      <div className="m-danger-note">
        <i className="fas fa-exclamation-triangle" />
        Esta acción no se puede deshacer.
      </div>
    </Modal>
  )
}

// ── Modal Día Especial ────────────────────────────────────────────
function ModalExcepcion({ excepcion, onSave, onClose }) {
  const [form, setForm] = useState(excepcion || {
    fecha: "", cerrado: false, horaInicio: "09:00", horaFin: "18:00", motivo: ""
  })
  const [error, setError] = useState("")

  function handleSave() {
    if (!form.fecha) { setError("La fecha es obligatoria"); return }
    onSave({ ...form })
  }

  return (
    <Modal
      title={excepcion ? "Editar día especial" : "Nuevo día especial"}
      icon="fa-calendar-alt"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="m-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="m-btn-primary" onClick={handleSave}>
            <i className="fas fa-check" /> Guardar
          </button>
        </>
      }
    >
      <div className="m-row">
        <label><i className="fas fa-calendar" /> Fecha *</label>
        <input type="date" value={form.fecha}
          onChange={e => setForm({ ...form, fecha: e.target.value })} />
      </div>

      <div className="m-row">
        <label><i className="fas fa-comment" /> Motivo <span className="m-hint">opcional</span></label>
        <input type="text" placeholder="Ej: Festivo, Evento especial..."
          value={form.motivo}
          onChange={e => setForm({ ...form, motivo: e.target.value })} />
      </div>

      <label className="toggle-label" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" checked={form.cerrado}
          onChange={e => setForm({ ...form, cerrado: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: "#9b30d9" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#2a1040" }}>
          Día cerrado (no se aceptan citas)
        </span>
      </label>

      {!form.cerrado && (
        <div className="m-row-2">
          <div className="m-row">
            <label><i className="fas fa-door-open" /> Apertura</label>
            <select value={form.horaInicio}
              onChange={e => setForm({ ...form, horaInicio: e.target.value })}>
              {HORAS_OPTS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="m-row">
            <label><i className="fas fa-door-closed" /> Cierre</label>
            <select value={form.horaFin}
              onChange={e => setForm({ ...form, horaFin: e.target.value })}>
              {HORAS_OPTS.filter(h => { return h > form.horaInicio }).map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>
      )}

      {!form.cerrado && (
        <div className="m-info">
          <i className="fas fa-clock" />
          Horario especial de {form.horaInicio} a {form.horaFin} para ese día.
        </div>
      )}

      {form.cerrado && (
        <div className="m-warn">
          <i className="fas fa-ban" />
          Los clientes no podrán agendar citas en este día.
        </div>
      )}

      {error && <div className="m-error"><i className="fas fa-exclamation-circle" /> {error}</div>}
    </Modal>
  )
}


// ── Tarjeta de servicio/paquete ───────────────────────────────────
function ServCard({ s, onEdit, onToggle, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const esPaquete = s.tipo === "paquete"
  const bloqueo   = Math.ceil(s.hora_estimada / 60) * 60
  return (
    <div className={`serv-card ${s.activo == 0 ? "inactivo" : ""}`}>
      <div className="serv-card-left">
        <div className={`serv-icon${esPaquete ? " paquete" : ""}`}>
          <i className={`fas ${esPaquete ? "fa-box-open" : "fa-cut"}`} />
        </div>
        <div className="serv-info">
          <div className="serv-nombre-row">
            <span className="serv-nombre">{s.descripcion}</span>
            <span className={`serv-tipo-badge ${esPaquete ? "paquete" : "servicio"}`}>
              {esPaquete ? "Paquete" : "Servicio"}
            </span>
          </div>
          <div className="serv-meta">
            <span className="serv-precio"><i className="fas fa-dollar-sign" />${parseFloat(s.precio).toFixed(2)}</span>
            <span className="serv-duracion"><i className="fas fa-clock" />{durLabel(s.hora_estimada)}</span>
            {bloqueo !== s.hora_estimada && (
              <span className="serv-bloqueo" title={`Bloquea ${durLabel(bloqueo)} en agenda`}>
                <i className="fas fa-lock" />{durLabel(bloqueo)}
              </span>
            )}
            <span className={`serv-estado ${s.activo == 0 ? "off" : "on"}`}>
              {s.activo == 0 ? "Desactivado" : "Activo"}
            </span>
          </div>
          {esPaquete && s.contenido && (
            <button className="btn-ver-contenido" onClick={() => setExpanded(v => !v)}>
              <i className={`fas fa-chevron-${expanded ? "up" : "down"}`} />
              {expanded ? " Ocultar" : " Ver qué incluye"}
            </button>
          )}
          {esPaquete && s.contenido && expanded && (
            <div className="paquete-contenido">
              {s.contenido.split("\n").filter(Boolean).map((line, i) => (
                <span key={i}><i className="fas fa-check-circle" style={{ color: "#10b981", marginRight: 6 }} />{line}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="serv-acciones">
        <button className="btn-sa edit" title="Editar" onClick={onEdit}><i className="fas fa-edit" /></button>
        <button className={`btn-sa toggle ${s.activo == 0 ? "activate" : "deactivate"}`}
          title={s.activo == 0 ? "Activar" : "Desactivar"} onClick={onToggle}>
          <i className={`fas ${s.activo == 0 ? "fa-toggle-off" : "fa-toggle-on"}`} />
        </button>
        <button className="btn-sa delete" title="Eliminar" onClick={onDelete}><i className="fas fa-trash" /></button>
      </div>
    </div>
  )
}

// ── Tarjeta de barbero ────────────────────────────────────────────
function BarberoCard({ b, onEdit, onToggle, onDelete }) {
  const iniciales = b.nombre.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className={`barbero-card ${b.activo == 0 ? "inactivo" : ""}`}>
      <div className="barbero-card-left">
        <div className="barbero-avatar">
          {b.foto
            ? <img src={b.foto} alt={b.nombre} />
            : <span>{iniciales}</span>
          }
        </div>
        <div className="barbero-info">
          <span className="barbero-nombre">{b.nombre}</span>
          <span className="barbero-correo"><i className="fas fa-envelope" /> {b.correo}</span>
          <span className={`barbero-estado ${b.activo == 0 ? "off" : "on"}`}>
            <i className={`fas fa-circle`} /> {b.activo == 0 ? "Desactivado" : "Activo"}
          </span>
        </div>
      </div>
      <div className="serv-acciones">
        <button className="btn-sa edit" title="Editar" onClick={onEdit}><i className="fas fa-edit" /></button>
        <button className={`btn-sa toggle ${b.activo == 0 ? "activate" : "deactivate"}`}
          title={b.activo == 0 ? "Activar" : "Desactivar"} onClick={onToggle}>
          <i className={`fas ${b.activo == 0 ? "fa-toggle-off" : "fa-toggle-on"}`} />
        </button>
        <button className="btn-sa delete" title="Eliminar" onClick={onDelete}><i className="fas fa-trash" /></button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────
export default function Negocio({ barberia }) {
  const [tab, setTab] = useState("servicios")
  const [toastMsg, setToastMsg] = useState("")

  // Servicios
  const [servicios, setServicios] = useState([])
  const [loadingS,  setLoadingS]  = useState(true)
  const [errorS,    setErrorS]    = useState("")
  const [modalServ, setModalServ] = useState(null)
  const [confirmar, setConfirmar] = useState(null)

  // Horario
  const [horario,         setHorario]         = useState({ diasLaborales:[1,2,3,4,5,6], horaInicio:"09:00", horaFin:"18:00", intervaloMinutos:30, excepciones:[] })
  const [loadingH,        setLoadingH]        = useState(true)
  const [guardandoH,      setGuardandoH]      = useState(false)
  const [horarioGuardado, setHorarioGuardado] = useState(false)
  const [modalExcepcion,  setModalExcepcion]  = useState(false)
  const [excepcionEditar, setExcepcionEditar] = useState(null)
  const [confirmarExcepcion, setConfirmarExcepcion] = useState(null)

  // Barberos
  const [barberos,      setBarberos]      = useState([])
  const [loadingB,      setLoadingB]      = useState(false)
  const [modalBarbero,  setModalBarbero]  = useState(null)  // null | "nuevo" | objeto
  const [confirmarB,    setConfirmarB]    = useState(null)

  function mostrarToast(msg) { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3000) }

  // ── Cargar datos ─────────────────────────────────────────────
  const cargarServicios = useCallback(async () => {
    if (!barberia?.id) return
    setLoadingS(true); setErrorS("")
    try {
      const r = await fetch(`${API}/barberia/${barberia.id}/servicios`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Error")
      setServicios(Array.isArray(d) ? d : [])
    } catch (e) { setErrorS(e.message) }
    setLoadingS(false)
  }, [barberia?.id])

  const cargarHorario = useCallback(async () => {
    if (!barberia?.id) return
    setLoadingH(true)
    try {
      const r = await fetch(`${API}/barberia/${barberia.id}/horario`)
      const d = await r.json()
      if (r.ok && d.horaInicio) setHorario({ ...d, excepciones: d.excepciones || [] })
    } catch (_) {}
    setLoadingH(false)
  }, [barberia?.id])

  const cargarBarberos = useCallback(async () => {
    if (!barberia?.id) return
    setLoadingB(true)
    try {
      const r = await fetch(`${API}/barberos/${barberia.id}`, { headers: authHeaders() })
      const d = await r.json()
      setBarberos(Array.isArray(d) ? d : [])
    } catch (_) {}
    setLoadingB(false)
  }, [barberia?.id])

  useEffect(() => {
    cargarServicios(); cargarHorario()
  }, [cargarServicios, cargarHorario])

  // Cargar barberos solo cuando se abre esa tab
  useEffect(() => {
    if (tab === "personal") cargarBarberos()
  }, [tab, cargarBarberos])

  // ── CRUD Servicios ───────────────────────────────────────────
  async function crearServicio(data) {
    const r = await fetch(`${API}/barberia/${barberia.id}/servicios`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(data)
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || "Error al crear")
    mostrarToast(`✅ ${data.tipo === "paquete" ? "Paquete" : "Servicio"} agregado`)
    setModalServ(null); cargarServicios()
  }
  async function editarServicio(id, data) {
    const r = await fetch(`${API}/barberia/${barberia.id}/servicios/${id}`, {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ ...data, activo: modalServ.activo ?? 1 })
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || "Error al editar")
    mostrarToast("✅ Actualizado correctamente"); setModalServ(null); cargarServicios()
  }
  async function toggleServicio(serv) {
    const r = await fetch(`${API}/barberia/${barberia.id}/servicios/${serv.id}/toggle`, {
      method: "PATCH", headers: authHeaders()
    })
    const d = await r.json()
    if (!r.ok) { mostrarToast("⚠️ " + (d.error || "Error")); return }
    mostrarToast(d.activo ? "✅ Activado" : "⚠️ Desactivado"); cargarServicios()
  }
  async function eliminarServicio(serv) {
    const r = await fetch(`${API}/barberia/${barberia.id}/servicios/${serv.id}`, {
      method: "DELETE", headers: authHeaders()
    })
    const d = await r.json()
    if (!r.ok) { mostrarToast("❌ " + (d.error || "Error")); setConfirmar(null); return }
    mostrarToast("🗑️ Eliminado"); setConfirmar(null); cargarServicios()
  }

  // ── CRUD Barberos ────────────────────────────────────────────
  async function crearBarbero(data) {
    const r = await fetch(`${API}/barberos/${barberia.id}`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(data)
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || "Error al crear")
    mostrarToast("✅ Barbero agregado correctamente")
    setModalBarbero(null); cargarBarberos()
  }
  async function editarBarbero(id, data) {
    const r = await fetch(`${API}/barberos/${barberia.id}/${id}`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify(data)
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || "Error al editar")
    mostrarToast("✅ Barbero actualizado")
    setModalBarbero(null); cargarBarberos()
  }
  async function toggleBarbero(b) {
    const r = await fetch(`${API}/barberos/${barberia.id}/${b.id}/toggle`, {
      method: "PATCH", headers: authHeaders()
    })
    const d = await r.json()
    if (!r.ok) { mostrarToast("⚠️ " + (d.error || "Error")); return }
    mostrarToast(d.activo ? "✅ Barbero activado" : "⚠️ Barbero desactivado"); cargarBarberos()
  }
  async function eliminarBarbero(b) {
    const r = await fetch(`${API}/barberos/${barberia.id}/${b.id}`, {
      method: "DELETE", headers: authHeaders()
    })
    const d = await r.json()
    if (!r.ok) { mostrarToast("❌ " + (d.error || "Error")); setConfirmarB(null); return }
    mostrarToast("🗑️ Barbero eliminado"); setConfirmarB(null); cargarBarberos()
  }

  // ── Horario ──────────────────────────────────────────────────
  async function guardarHorario() {
    setGuardandoH(true)
    try {
      const r = await fetch(`${API}/barberia/${barberia.id}/horario`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify(horario)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Error")
      setHorarioGuardado(true)
      mostrarToast("✅ Horario guardado correctamente")
      setTimeout(() => setHorarioGuardado(false), 2500)
    } catch (e) { mostrarToast("❌ " + e.message) }
    setGuardandoH(false)
  }
  async function guardarExcepcion(nuevaExcepcion) {
    const yaExiste = horario.excepciones?.some(e => e.fecha === nuevaExcepcion.fecha)
    const nuevasExcepciones = yaExiste
      ? horario.excepciones.map(e => e.fecha === nuevaExcepcion.fecha ? nuevaExcepcion : e)
      : [...(horario.excepciones||[]), nuevaExcepcion].sort((a,b) => a.fecha.localeCompare(b.fecha))
    const ha = { ...horario, excepciones: nuevasExcepciones }
    setHorario(ha); setModalExcepcion(false)
    try {
      const r = await fetch(`${API}/barberia/${barberia.id}/horario`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify(ha)
      })
      if (!r.ok) throw new Error()
      mostrarToast("✅ Día especial guardado")
    } catch (_) { mostrarToast("❌ Error al guardar") }
  }
  async function eliminarExcepcion(index) {
    const ha = { ...horario, excepciones: horario.excepciones.filter((_,j) => j !== index) }
    setHorario(ha); setConfirmarExcepcion(null)
    try {
      await fetch(`${API}/barberia/${barberia.id}/horario`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify(ha)
      })
      mostrarToast("🗑️ Día especial eliminado")
    } catch (_) {}
  }
  function toggleDia(id) {
    setHorario(h => ({
      ...h, diasLaborales: h.diasLaborales.includes(id)
        ? h.diasLaborales.filter(d => d !== id)
        : [...h.diasLaborales, id].sort()
    }))
  }

  const soloServicios = servicios.filter(s => s.tipo !== "paquete")
  const soloPaquetes  = servicios.filter(s => s.tipo === "paquete")

  return (
    <div className="negocio-root">
      {toastMsg && <div className="negocio-toast">{toastMsg}</div>}

      <div className="negocio-header">
        <h1 className="negocio-title"><i className="fas fa-store" /> Mi Negocio</h1>
        <p className="negocio-sub">Administra tu barbería — {barberia?.nombre || ""}</p>
      </div>

      <div className="negocio-tabs">
        <button className={tab === "servicios" ? "active" : ""} onClick={() => setTab("servicios")}>
          <i className="fas fa-cut" /> Servicios & Paquetes
        </button>
        <button className={tab === "horario" ? "active" : ""} onClick={() => setTab("horario")}>
          <i className="fas fa-clock" /> Horario
        </button>
        <button className={tab === "personal" ? "active" : ""} onClick={() => setTab("personal")}>
          <i className="fas fa-users" /> Personal
          {barberos.length > 0 && <span className="tab-badge">{barberos.length}</span>}
        </button>
      </div>

      {/* ─── TAB: SERVICIOS ──────────────────────────────────────── */}
      {tab === "servicios" && (
        <div className="tab-content">
          <div className="tab-topbar">
            <span className="tab-count">
              {soloServicios.length} servicio{soloServicios.length !== 1 ? "s" : ""}
              {soloPaquetes.length > 0 && ` · ${soloPaquetes.length} paquete${soloPaquetes.length !== 1 ? "s" : ""}`}
            </span>
            <button className="btn-nuevo-serv" onClick={() => setModalServ("nuevo")}>
              <i className="fas fa-plus" /> Agregar
            </button>
          </div>
          {loadingS ? (
            <div className="negocio-loading"><i className="fas fa-spinner fa-spin" /> Cargando...</div>
          ) : errorS ? (
            <div className="negocio-error"><i className="fas fa-exclamation-circle" /> {errorS}</div>
          ) : servicios.length === 0 ? (
            <div className="negocio-empty">
              <i className="fas fa-cut" />
              <p>No hay servicios ni paquetes registrados.</p>
              <button className="btn-nuevo-serv" onClick={() => setModalServ("nuevo")}>
                <i className="fas fa-plus" /> Agregar primero
              </button>
            </div>
          ) : (
            <>
              {soloServicios.length > 0 && (
                <div className="serv-grupo">
                  <div className="serv-grupo-header"><i className="fas fa-cut" /> Servicios</div>
                  <div className="servicios-grid">
                    {soloServicios.map(s => (
                      <ServCard key={s.id} s={s} onEdit={() => setModalServ(s)}
                        onToggle={() => toggleServicio(s)} onDelete={() => setConfirmar(s)} />
                    ))}
                  </div>
                </div>
              )}
              {soloPaquetes.length > 0 && (
                <div className="serv-grupo">
                  <div className="serv-grupo-header paquete"><i className="fas fa-box-open" /> Paquetes</div>
                  <div className="servicios-grid">
                    {soloPaquetes.map(s => (
                      <ServCard key={s.id} s={s} onEdit={() => setModalServ(s)}
                        onToggle={() => toggleServicio(s)} onDelete={() => setConfirmar(s)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TAB: HORARIO ────────────────────────────────────────── */}
      {tab === "horario" && (
        <div className="tab-content">
          {loadingH ? (
            <div className="negocio-loading"><i className="fas fa-spinner fa-spin" /> Cargando horario...</div>
          ) : (
            <div className="horario-form">
              <div className="horario-section">
                <h3 className="horario-section-title"><i className="fas fa-calendar-week" /> Días laborales</h3>
                <p className="horario-hint">Selecciona los días en que trabajas</p>
                <div className="dias-grid">
                  {DIAS_SEMANA.map(dia => (
                    <button key={dia.id} className={`dia-btn ${horario.diasLaborales.includes(dia.id) ? "activo" : ""}`}
                      onClick={() => toggleDia(dia.id)}>{dia.label}</button>
                  ))}
                </div>
                {horario.diasLaborales.length === 0 && (
                  <p className="horario-warn"><i className="fas fa-exclamation-triangle" /> Debes seleccionar al menos un día</p>
                )}
              </div>
              <div className="horario-section">
                <h3 className="horario-section-title"><i className="fas fa-business-time" /> Horario de atención</h3>
                <div className="horas-row">
                  <div className="form-row">
                    <label><i className="fas fa-sun" /> Apertura</label>
                    <select value={horario.horaInicio} onChange={e => setHorario({ ...horario, horaInicio: e.target.value })}>
                      {HORAS_OPTS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="horas-separator">—</div>
                  <div className="form-row">
                    <label><i className="fas fa-moon" /> Cierre</label>
                    <select value={horario.horaFin} onChange={e => setHorario({ ...horario, horaFin: e.target.value })}>
                      {HORAS_OPTS.filter(h => { return h > horario.horaInicio }).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="horario-section">
                <h3 className="horario-section-title"><i className="fas fa-stopwatch" /> Intervalo entre citas</h3>
                <div className="intervalos-row">
                  {INTERVALOS.map(iv => (
                    <button key={iv.val} className={`intervalo-btn ${horario.intervaloMinutos === iv.val ? "activo" : ""}`}
                      onClick={() => setHorario({ ...horario, intervaloMinutos: iv.val })}>{iv.label}</button>
                  ))}
                </div>
              </div>
              <div className="horario-section">
                <h3 className="horario-section-title"><i className="fas fa-eye" /> Vista previa de slots</h3>
                <div className="slots-preview">
                  {(() => {
                    const slots = []; const [hi, mi] = horario.horaInicio.split(":").map(Number)
                    const [hf, mf] = horario.horaFin.split(":").map(Number)
                    let m = hi*60+mi; const fin = hf*60+mf
                    while (m < fin) {
                      slots.push(`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`)
                      m += horario.intervaloMinutos
                    }
                    return slots.map(s => <span key={s} className="slot-preview-chip">{s}</span>)
                  })()}
                </div>
              </div>
              <div className="horario-section">
                <div className="horario-section-header">
                  <h3 className="horario-section-title"><i className="fas fa-calendar-alt" /> Días especiales</h3>
                  <button className="btn-agregar-excepcion" onClick={() => { setExcepcionEditar(null); setModalExcepcion(true) }}>
                    <i className="fas fa-plus" /> Agregar
                  </button>
                </div>
                {(!horario.excepciones || horario.excepciones.length === 0) ? (
                  <p className="excepcion-empty"><i className="fas fa-check-circle" style={{ color: "#10b981" }} /> Sin excepciones</p>
                ) : (
                  <div className="excepciones-list">
                    {horario.excepciones.map((ex, i) => (
                      <div key={i} className={`excepcion-item ${ex.cerrado ? "cerrado" : "especial"}`}>
                        <div className="ex-info">
                          <span className="ex-fecha"><i className="fas fa-calendar" /> {ex.fecha}</span>
                          {ex.motivo && <span className="ex-motivo">{ex.motivo}</span>}
                          <span className="ex-horario">
                            {ex.cerrado
                              ? <><i className="fas fa-store-slash" /> Cerrado</>
                              : <><i className="fas fa-clock" /> {ex.horaInicio} — {ex.horaFin}</>}
                          </span>
                        </div>
                        <div className="ex-acciones">
                          <button className="btn-editar-ex" onClick={() => { setExcepcionEditar(ex); setModalExcepcion(true) }}>
                            <i className="fas fa-edit" />
                          </button>
                          <button className="btn-eliminar-ex" onClick={() => setConfirmarExcepcion({ index: i, fecha: ex.fecha })}>
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className={`btn-guardar-horario ${horarioGuardado ? "guardado" : ""}`}
                onClick={guardarHorario} disabled={guardandoH || horario.diasLaborales.length === 0}>
                {guardandoH
                  ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                  : horarioGuardado
                  ? <><i className="fas fa-check-circle" /> ¡Horario guardado!</>
                  : <><i className="fas fa-save" /> Guardar horario</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: PERSONAL ───────────────────────────────────────── */}
      {tab === "personal" && (
        <div className="tab-content">
          <div className="tab-topbar">
            <span className="tab-count">
              {barberos.length} barbero{barberos.length !== 1 ? "s" : ""} registrado{barberos.length !== 1 ? "s" : ""}
            </span>
            <button className="btn-nuevo-serv" onClick={() => setModalBarbero("nuevo")}>
              <i className="fas fa-user-plus" /> Agregar barbero
            </button>
          </div>

          {loadingB ? (
            <div className="negocio-loading"><i className="fas fa-spinner fa-spin" /> Cargando personal...</div>
          ) : barberos.length === 0 ? (
            <div className="negocio-empty">
              <i className="fas fa-users" />
              <p>No hay barberos registrados.</p>
              <p className="negocio-empty-sub">
                Sin barberos el sistema opera igual que siempre. Agrega uno para habilitar agendas individuales.
              </p>
              <button className="btn-nuevo-serv" onClick={() => setModalBarbero("nuevo")}>
                <i className="fas fa-user-plus" /> Agregar primer barbero
              </button>
            </div>
          ) : (
            <div className="barberos-grid">
              {barberos.map(b => (
                <BarberoCard key={b.id} b={b}
                  onEdit={() => setModalBarbero(b)}
                  onToggle={() => toggleBarbero(b)}
                  onDelete={() => setConfirmarB(b)} />
              ))}
            </div>
          )}

          {/* Info de cómo funciona */}
          {barberos.length > 0 && (
            <div className="personal-info-box">
              <i className="fas fa-info-circle" />
              <div>
                <p><strong>¿Cómo funciona?</strong></p>
                <p>Cada barbero entra con su correo y contraseña desde el login normal y solo ve su propia agenda.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modales ── */}
      {modalServ && (
        <ModalServicio servicio={modalServ === "nuevo" ? null : modalServ}
          onSave={modalServ === "nuevo" ? crearServicio : (data) => editarServicio(modalServ.id, data)}
          onClose={() => setModalServ(null)} />
      )}
      {modalBarbero && (
        <ModalBarbero barbero={modalBarbero === "nuevo" ? null : modalBarbero}
          onSave={modalBarbero === "nuevo" ? crearBarbero : (data) => editarBarbero(modalBarbero.id, data)}
          onClose={() => setModalBarbero(null)} />
      )}
      {modalExcepcion && (
        <ModalExcepcion excepcion={excepcionEditar} onSave={guardarExcepcion}
          onClose={() => { setModalExcepcion(false); setExcepcionEditar(null) }} />
      )}
      {confirmar && (
        <ModalConfirmar mensaje={`¿Eliminar "${confirmar.descripcion}"?`}
          onConfirm={() => eliminarServicio(confirmar)} onClose={() => setConfirmar(null)} />
      )}
      {confirmarB && (
        <ModalConfirmar mensaje={`¿Eliminar al barbero "${confirmarB.nombre}"? Sus citas asignadas quedarán sin barbero.`}
          onConfirm={() => eliminarBarbero(confirmarB)} onClose={() => setConfirmarB(null)} />
      )}
      {confirmarExcepcion && (
        <ModalConfirmar mensaje={`¿Eliminar el día especial del ${confirmarExcepcion.fecha}?`}
          onConfirm={() => eliminarExcepcion(confirmarExcepcion.index)} onClose={() => setConfirmarExcepcion(null)} />
      )}
    </div>
  )
}