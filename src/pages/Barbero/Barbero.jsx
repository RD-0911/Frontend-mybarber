import { useState, useEffect, useCallback, Fragment, useRef } from "react"
import "./Barbero.css"
import Modal from "../../components/Modal/Modal"

const API = import.meta.env.VITE_API_URL || "http://localhost:5000"

function barberoHeaders() {
  const token = sessionStorage.getItem("barberoToken") || ""
  return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
}
function barberoToken() {
  return sessionStorage.getItem("barberoToken") || ""
}

const DIAS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  const monday = new Date(d)
  monday.setDate(d.getDate() - d.getDay() + 1)
  return Array.from({ length: 6 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd
  })
}

function formatFecha(d) {
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
}

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

const estadoColor = {
  pendiente:  "#f59e0b",
  confirmada: "#10b981",
  cancelada:  "#ef4444",
  completada: "#6366f1"
}

// ── ClienteSearch del barbero ─────────────────────────────────────
function ClienteSearchBarbero({ idBarberia, value, onChange }) {
  const [query,      setQuery]      = useState("")
  const [resultados, setResultados] = useState([])
  const [buscando,   setBuscando]   = useState(false)
  const [mostrar,    setMostrar]    = useState(false)
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
        const token = sessionStorage.getItem("barberoToken") || ""
        const r = await fetch(
          `${API}/barbero/clientes/buscar?q=${encodeURIComponent(q)}`,
          { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } }
        )
        const data = await r.json()
        setResultados(Array.isArray(data) ? data : [])
        setMostrar(true)
      } catch (_) { setResultados([]) }
      setBuscando(false)
    }, 300)
  }

  function seleccionar(c) {
    setQuery(`${c.nombre} ${c.primerAp}`)
    setResultados([]); setMostrar(false); onChange(c)
  }

  return (
    <div className="cliente-search-wrap" ref={wrapRef}>
      <div className="cliente-search-input-row">
        <input
          type="text"
          className="cliente-search-input"
          placeholder="Escribe nombre o teléfono..."
          value={query}
          onChange={handleInput}
          autoComplete="off"
        />
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

// ── Modal Nueva Cita (barbero) ────────────────────────────────────
function ModalNuevaCita({ barbero, servicios, horario, onSave, onClose }) {
  const HORAS = generarHoras(horario.horaInicio, horario.horaFin, horario.intervaloMinutos)

  const [form, setForm] = useState({
    clienteObj:  null,
    id_servicio: "",
    fechaInicio: (() => {
      const hoy = new Date()
      return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`
    })(),
    hora: "",
  })
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState("")

  const soloServicios = servicios.filter(s => s.tipo !== "paquete")
  const paquetes      = servicios.filter(s => s.tipo === "paquete")

  function durLabel(m) {
    if (!m) return ""
    if (m < 60) return `${m} min`
    const h = Math.floor(m / 60); const r = m % 60
    return r ? `${h}h ${r}min` : `${h}h`
  }

  async function guardar() {
    if (!form.clienteObj) { setError("Selecciona un cliente"); return }
    if (!form.id_servicio)  { setError("Selecciona un servicio"); return }
    if (!form.fechaInicio)  { setError("Selecciona una fecha"); return }
    if (!form.hora)         { setError("Selecciona una hora"); return }

    setGuardando(true); setError("")
    try {
      const token      = sessionStorage.getItem("barberoToken") || ""
      const fechaInicio = new Date(`${form.fechaInicio}T${form.hora}:00`)
      const res  = await fetch(`${API}/barbero/citas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          id_cliente:  form.clienteObj.id,
          id_servicio: form.id_servicio,
          fechaInicio: fechaInicio.toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar")
      onSave()
    } catch (e) { setError(e.message) }
    setGuardando(false)
  }

  return (
    <Modal
      title="Nueva Cita"
      icon="fa-calendar-plus"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button className="m-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="m-btn-primary" onClick={guardar} disabled={guardando}>
            {guardando
              ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
              : <><i className="fas fa-check" /> Guardar cita</>}
          </button>
        </>
      }
    >
      <div className="m-row">
        <label><i className="fas fa-user" /> Cliente *<span className="m-hint">Busca por nombre o teléfono</span></label>
        <ClienteSearchBarbero
          idBarberia={barbero.id_barberia}
          value={form.clienteObj}
          onChange={c => setForm({ ...form, clienteObj: c })}
        />
      </div>

      <div className="m-row">
        <label><i className="fas fa-cut" /> Servicio / Paquete *</label>
        <select
          value={form.id_servicio}
          onChange={e => setForm({ ...form, id_servicio: e.target.value, hora: "" })}
        >
          <option value="">— Selecciona —</option>
          {soloServicios.length > 0 && (
            <optgroup label="✂️ Servicios">
              {soloServicios.map(s => (
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
                  {s.descripcion} — ${s.precio} ({durLabel(s.hora_estimada)})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="m-row-2">
        <div className="m-row">
          <label><i className="fas fa-calendar" /> Fecha *</label>
          <input
            type="date"
            value={form.fechaInicio}
            onChange={e => setForm({ ...form, fechaInicio: e.target.value, hora: "" })}
          />
        </div>
        <div className="m-row">
          <label><i className="fas fa-clock" /> Hora *</label>
          <select
            value={form.hora}
            onChange={e => setForm({ ...form, hora: e.target.value })}
          >
            <option value="">— Hora —</option>
            {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      <div className="m-info">
        <i className="fas fa-user-circle" />
        La cita quedará asignada a ti automáticamente.
      </div>

      {error && <div className="m-error"><i className="fas fa-exclamation-circle" /> {error}</div>}
    </Modal>
  )
}

// ── Panel de perfil del barbero ───────────────────────────────────

// ── Tab: Bloqueos de agenda ──────────────────────────────────────
function TabBloqueos({ onMsg }) {
  const [bloqueos, setBloqueos] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({
    fecha: "",
    horaInicio: "09:00",
    horaFin: "18:00",
    todoElDia: false,
    motivo: "",
  })
  const [saving,       setSaving]       = useState(false)
  const [confirmar,    setConfirmar]    = useState(null) // { citasEnConflicto, datosForm }
  const [confirmDel,   setConfirmDel]   = useState(null) // { id, fecha }

  const cargar = async () => {
    setLoading(true)
    try {
      const token = sessionStorage.getItem("barberoToken") || ""
      const r = await fetch(`${API}/barbero/bloqueos`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await r.json()
      setBloqueos(Array.isArray(data) ? data : [])
    } catch (_) { setBloqueos([]) }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const guardar = async (forzar = false) => {
    if (!form.fecha) {
      onMsg({ tipo: "error", texto: "Selecciona una fecha" }); return
    }
    const inicioDate = form.todoElDia
      ? new Date(`${form.fecha}T00:00:00`)
      : new Date(`${form.fecha}T${form.horaInicio}:00`)
    const finDate = form.todoElDia
      ? new Date(`${form.fecha}T23:59:59`)
      : new Date(`${form.fecha}T${form.horaFin}:00`)

    if (finDate <= inicioDate) {
      onMsg({ tipo: "error", texto: "La hora de fin debe ser posterior al inicio" }); return
    }

    setSaving(true)
    try {
      const token = sessionStorage.getItem("barberoToken") || ""
      const url = `${API}/barbero/bloqueos${forzar ? "?forzar=true" : ""}`
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          fecha_inicio: inicioDate.toISOString(),
          fecha_fin: finDate.toISOString(),
          motivo: form.motivo.trim() || null,
        }),
      })
      const data = await r.json()

      if (r.status === 409 && data.requiereConfirmacion) {
        // Pedir confirmación para cancelar citas
        setConfirmar({ citas: data.citasEnConflicto })
        setSaving(false)
        return
      }

      if (!r.ok) throw new Error(data.error || "Error al crear bloqueo")

      const msgExtra = data.citasCanceladas > 0
        ? ` (${data.citasCanceladas} cita${data.citasCanceladas > 1 ? "s canceladas" : " cancelada"})`
        : ""
      onMsg({ tipo: "ok", texto: `✅ Bloqueo creado${msgExtra}` })
      setShowForm(false)
      setConfirmar(null)
      setForm({ fecha: "", horaInicio: "09:00", horaFin: "18:00", todoElDia: false, motivo: "" })
      cargar()
    } catch (e) {
      onMsg({ tipo: "error", texto: e.message })
    }
    setSaving(false)
  }

  const confirmarEliminar = async () => {
    if (!confirmDel) return
    try {
      const token = sessionStorage.getItem("barberoToken") || ""
      const r = await fetch(`${API}/barbero/bloqueos/${confirmDel.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (!r.ok) throw new Error("Error al eliminar")
      onMsg({ tipo: "ok", texto: "Bloqueo eliminado" })
      setConfirmDel(null)
      cargar()
    } catch (e) {
      onMsg({ tipo: "error", texto: e.message })
    }
  }

  const fmtFecha = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString("es-MX", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  }

  return (
    <div className="bp-bloq">
      {!showForm && (
        <>
          <div className="bp-bloq-head">
            <span className="bp-bloq-count">
              {bloqueos.length} bloqueo{bloqueos.length !== 1 ? "s" : ""} activo{bloqueos.length !== 1 ? "s" : ""}
            </span>
            <button className="bp-bloq-add" onClick={() => setShowForm(true)}>
              <i className="fas fa-plus" /> Nuevo bloqueo
            </button>
          </div>

          {loading ? (
            <p className="bp-bloq-empty"><i className="fas fa-spinner fa-spin" /> Cargando...</p>
          ) : bloqueos.length === 0 ? (
            <p className="bp-bloq-empty">
              <i className="fas fa-calendar-check" />
              No tienes bloqueos programados. Tu agenda está libre.
            </p>
          ) : (
            <div className="bp-bloq-list">
              {bloqueos.map(b => (
                <div key={b.id} className="bp-bloq-item">
                  <div className="bp-bloq-info">
                    <i className="fas fa-ban bp-bloq-icon" />
                    <div>
                      <span className="bp-bloq-fechas">
                        {fmtFecha(b.fecha_inicio)}
                      </span>
                      <span className="bp-bloq-separador">→</span>
                      <span className="bp-bloq-fechas">
                        {fmtFecha(b.fecha_fin)}
                      </span>
                      {b.motivo && <span className="bp-bloq-motivo">{b.motivo}</span>}
                    </div>
                  </div>
                  <button
                    className="bp-bloq-del"
                    onClick={() => setConfirmDel({ id: b.id, fecha: fmtFecha(b.fecha_inicio) })}
                    title="Eliminar"
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && !confirmar && (
        <div className="bp-bloq-form">
          <h4 className="bp-bloq-form-title">
            <i className="fas fa-plus-circle" /> Nuevo bloqueo
          </h4>

          <label className="bp-bloq-label">Fecha</label>
          <input
            type="date"
            className="bp-bloq-input"
            value={form.fecha}
            min={new Date().toISOString().slice(0,10)}
            onChange={e => setForm({ ...form, fecha: e.target.value })}
          />

          <label className="bp-bloq-check">
            <input
              type="checkbox"
              checked={form.todoElDia}
              onChange={e => setForm({ ...form, todoElDia: e.target.checked })}
            />
            Todo el día
          </label>

          {!form.todoElDia && (
            <div className="bp-bloq-horas">
              <div>
                <label className="bp-bloq-label">Hora inicio</label>
                <input
                  type="time"
                  className="bp-bloq-input"
                  value={form.horaInicio}
                  onChange={e => setForm({ ...form, horaInicio: e.target.value })}
                />
              </div>
              <div>
                <label className="bp-bloq-label">Hora fin</label>
                <input
                  type="time"
                  className="bp-bloq-input"
                  value={form.horaFin}
                  onChange={e => setForm({ ...form, horaFin: e.target.value })}
                />
              </div>
            </div>
          )}

          <label className="bp-bloq-label">Motivo (opcional)</label>
          <input
            type="text"
            className="bp-bloq-input"
            maxLength={100}
            placeholder="Ej. Vacaciones, cita médica..."
            value={form.motivo}
            onChange={e => setForm({ ...form, motivo: e.target.value })}
          />

          <div className="bp-bloq-actions">
            <button className="bp-bloq-cancel" onClick={() => { setShowForm(false); setForm({ fecha: "", horaInicio: "09:00", horaFin: "18:00", todoElDia: false, motivo: "" }) }}>
              Cancelar
            </button>
            <button className="bp-bloq-save" onClick={() => guardar(false)} disabled={saving}>
              {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar</>}
            </button>
          </div>
        </div>
      )}

      {/* Modal: confirmar eliminación */}
      {confirmDel && (
        <Modal
          title="Eliminar bloqueo"
          icon="fa-trash-alt"
          onClose={() => setConfirmDel(null)}
          size="sm"
          danger
          footer={
            <>
              <button className="m-btn m-btn-cancel" onClick={() => setConfirmDel(null)}>
                Cancelar
              </button>
              <button className="m-btn m-btn-danger" onClick={confirmarEliminar}>
                <i className="fas fa-trash" /> Sí, eliminar
              </button>
            </>
          }
        >
          <p className="bp-bloq-modal-text">
            ¿Estás seguro de eliminar el bloqueo del <strong>{confirmDel.fecha}</strong>?
          </p>
          <p className="bp-bloq-modal-note">
            Los clientes podrán agendar citas nuevamente en ese horario.
          </p>
        </Modal>
      )}

      {/* Confirmación: hay citas en conflicto */}
      {confirmar && (
        <div className="bp-bloq-form bp-bloq-confirm">
          <h4 className="bp-bloq-form-title bp-bloq-warn">
            <i className="fas fa-exclamation-triangle" /> Citas en conflicto
          </h4>
          <p className="bp-bloq-confirm-text">
            Tienes <strong>{confirmar.citas}</strong> cita{confirmar.citas > 1 ? "s" : ""} en ese rango.
            Si continúas, {confirmar.citas > 1 ? "se cancelarán todas" : "se cancelará"} automáticamente.
          </p>
          <p className="bp-bloq-confirm-note">
            ⚠️ Los clientes no reciben aviso automático. Considera contactarlos manualmente.
          </p>
          <div className="bp-bloq-actions">
            <button className="bp-bloq-cancel" onClick={() => setConfirmar(null)}>
              Volver
            </button>
            <button className="bp-bloq-save bp-bloq-save-danger" onClick={() => guardar(true)} disabled={saving}>
              {saving ? <><i className="fas fa-spinner fa-spin" /> Procesando...</> : <><i className="fas fa-check" /> Sí, cancelar y bloquear</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PanelPerfil({ perfil, onClose, onLogout, onUpdate }) {
  const [tab, setTab]           = useState("info")
  const [nombre, setNombre]     = useState(perfil?.nombre || "")
  const [passForm, setPassForm] = useState({ actual: "", nueva: "", confirmar: "" })
  const [saving, setSaving]     = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [msg, setMsg]           = useState(null)
  const [showPass, setShowPass] = useState({ actual: false, nueva: false, confirmar: false })
  const fileRef = useRef(null)

  function flash(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  // ── Foto ─────────────────────────────────────────────────────
  async function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { flash("error", "La imagen no debe superar 3MB"); return }
    setUploadingFoto(true)
    try {
      const fd = new FormData()
      fd.append("foto", file)
      const res  = await fetch(`${API}/barbero/foto`, {
        method: "POST",
        headers: { Authorization: `Bearer ${barberoToken()}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al subir")
      flash("ok", "¡Foto actualizada!")
      onUpdate && onUpdate({ foto: data.foto })
    } catch (e) { flash("error", e.message) }
    setUploadingFoto(false)
    e.target.value = ""
  }

  async function quitarFoto() {
    try {
      const res  = await fetch(`${API}/barbero/foto`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${barberoToken()}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      flash("ok", "Foto eliminada")
      onUpdate && onUpdate({ foto: null })
    } catch (e) { flash("error", e.message) }
  }

  // ── Nombre ───────────────────────────────────────────────────
  async function guardarNombre() {
    if (!nombre.trim()) { flash("error", "El nombre es obligatorio"); return }
    setSaving(true)
    try {
      const res  = await fetch(`${API}/barbero/nombre`, {
        method: "PUT",
        headers: barberoHeaders(),
        body: JSON.stringify({ nombre: nombre.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      flash("ok", "¡Nombre actualizado!")
      onUpdate && onUpdate({ nombre: nombre.trim() })
    } catch (e) { flash("error", e.message) }
    setSaving(false)
  }

  // ── Contraseña ───────────────────────────────────────────────
  async function cambiarPass() {
    if (!passForm.actual || !passForm.nueva || !passForm.confirmar) {
      flash("error", "Completa todos los campos"); return
    }
    if (passForm.nueva !== passForm.confirmar) {
      flash("error", "Las contraseñas nuevas no coinciden"); return
    }
    if (passForm.nueva.length < 6) {
      flash("error", "Mínimo 6 caracteres"); return
    }
    setSaving(true)
    try {
      const res  = await fetch(`${API}/barbero/password`, {
        method: "PUT",
        headers: barberoHeaders(),
        body: JSON.stringify({ actual: passForm.actual, nueva: passForm.nueva }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      flash("ok", "¡Contraseña actualizada!")
      setPassForm({ actual: "", nueva: "", confirmar: "" })
    } catch (e) { flash("error", e.message) }
    setSaving(false)
  }

  const iniciales = (perfil?.nombre || "B")
    .split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
  const foto = perfil?.foto

  return (
    <>
      <div className="bp-backdrop" onClick={onClose} />
      <div className="bp-panel">

        {/* Header del panel */}
        <div className="bp-header">
          <div className="bp-header-top">
            <span className="bp-titulo"><i className="fas fa-user-circle" /> Mi perfil</span>
            <button className="bp-close" onClick={onClose}><i className="fas fa-times" /></button>
          </div>

          {/* Avatar + info */}
          <div className="bp-perfil-row">
            <div className="bp-avatar-wrap">
              <div className="bp-avatar">
                {foto
                  ? <img src={foto} alt="foto" className="bp-avatar-img" />
                  : <span className="bp-avatar-iniciales">{iniciales}</span>
                }
              </div>
              <button
                className={`bp-cam-btn ${uploadingFoto ? "loading" : ""}`}
                onClick={() => !uploadingFoto && fileRef.current?.click()}
                title="Cambiar foto"
              >
                {uploadingFoto
                  ? <i className="fas fa-spinner fa-spin" />
                  : <i className="fas fa-camera" />
                }
              </button>
              <input
                ref={fileRef} type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }} onChange={handleFoto}
              />
            </div>

            <div className="bp-info">
              <span className="bp-nombre">{perfil?.nombre || "Barbero"}</span>
              <span className="bp-barberia"><i className="fas fa-store" /> {perfil?.barberia_nombre || "Mi barbería"}</span>
              <span className="bp-correo"><i className="fas fa-envelope" /> {perfil?.correo || ""}</span>
            </div>

            {foto && (
              <button className="bp-quitar-foto" onClick={quitarFoto} title="Quitar foto">
                <i className="fas fa-trash-alt" />
              </button>
            )}
          </div>

          <p className="bp-foto-hint">
            <i className="fas fa-camera" /> Toca el ícono · JPG, PNG o WEBP · Max 3MB
          </p>

          {/* Tabs */}
          <div className="bp-tabs">
            <button className={`bp-tab ${tab === "info" ? "active" : ""}`} onClick={() => setTab("info")}>
              <i className="fas fa-user" /> Nombre
            </button>
            <button className={`bp-tab ${tab === "pass" ? "active" : ""}`} onClick={() => setTab("pass")}>
              <i className="fas fa-lock" /> Contraseña
            </button>
            <button className={`bp-tab ${tab === "bloq" ? "active" : ""}`} onClick={() => setTab("bloq")}>
              <i className="fas fa-ban" /> Bloqueos
            </button>
          </div>
        </div>

        {/* Flash message */}
        {msg && (
          <div className={`bp-msg ${msg.type}`}>
            <i className={`fas ${msg.type === "ok" ? "fa-check-circle" : "fa-exclamation-circle"}`} />
            {msg.text}
          </div>
        )}

        {/* Body */}
        <div className="bp-body">

          {/* TAB: Nombre */}
          {tab === "info" && (
            <div className="bp-form">
              <div className="bp-section-label"><i className="fas fa-user" /> Datos personales</div>
              <div className="bp-group">
                <label>Tu nombre</label>
                <input
                  type="text"
                  placeholder="Tu nombre completo"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                />
              </div>
              <div className="bp-group">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={perfil?.correo || ""}
                  disabled
                  title="El correo solo puede ser modificado por el dueño de la barbería"
                />
                <span className="bp-field-hint">
                  <i className="fas fa-info-circle" /> El correo lo gestiona el dueño del negocio
                </span>
              </div>
              <button className="bp-save-btn" onClick={guardarNombre} disabled={saving}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                  : <><i className="fas fa-check" /> Guardar nombre</>}
              </button>
            </div>
          )}

          {/* TAB: Contraseña */}
          {tab === "pass" && (
            <div className="bp-form">
              <div className="bp-section-label"><i className="fas fa-lock" /> Cambiar contraseña</div>

              {[
                { key: "actual",    label: "Contraseña actual",          ph: "Tu contraseña actual" },
                { key: "nueva",     label: "Nueva contraseña",           ph: "Mínimo 6 caracteres" },
                { key: "confirmar", label: "Confirmar nueva contraseña", ph: "Repite la nueva contraseña" },
              ].map(f => (
                <div className="bp-group" key={f.key}>
                  <label>{f.label}</label>
                  <div className="bp-pass-wrap">
                    <input
                      type={showPass[f.key] ? "text" : "password"}
                      placeholder={f.ph}
                      value={passForm[f.key]}
                      onChange={e => setPassForm({ ...passForm, [f.key]: e.target.value })}
                    />
                    <button type="button" className="bp-eye"
                      onClick={() => setShowPass(s => ({ ...s, [f.key]: !s[f.key] }))}>
                      <i className={`fas ${showPass[f.key] ? "fa-eye-slash" : "fa-eye"}`} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Validaciones en vivo */}
              {passForm.nueva.length > 0 && passForm.nueva.length < 6 && (
                <p className="bp-warn"><i className="fas fa-exclamation-triangle" /> Mínimo 6 caracteres</p>
              )}
              {passForm.nueva && passForm.confirmar && passForm.nueva !== passForm.confirmar && (
                <p className="bp-warn"><i className="fas fa-exclamation-triangle" /> Las contraseñas no coinciden</p>
              )}
              {passForm.nueva && passForm.confirmar && passForm.nueva === passForm.confirmar && passForm.nueva.length >= 6 && (
                <p className="bp-ok"><i className="fas fa-check-circle" /> Las contraseñas coinciden</p>
              )}

              <button className="bp-save-btn" onClick={cambiarPass} disabled={saving}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                  : <><i className="fas fa-key" /> Cambiar contraseña</>}
              </button>
            </div>
          )}

          {/* TAB: Bloqueos */}
          {tab === "bloq" && <TabBloqueos onMsg={setMsg} />}
        </div>

        {/* Footer */}
        <div className="bp-footer">
          <button className="bp-logout-btn" onClick={() => { onClose(); onLogout() }}>
            <i className="fas fa-sign-out-alt" /> Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────
export default function Barbero({ barbero, onLogout }) {
  const [citas,        setCitas]        = useState([])
  const [perfil,       setPerfil]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [vistaMode,    setVistaMode]    = useState("semana")
  const [baseDate,     setBaseDate]     = useState(new Date())
  const [citaDetalle,  setCitaDetalle]  = useState(null)
  const [filtroEstado, setFiltroEstado] = useState("pendiente")
  const [pagina,       setPagina]       = useState(1)
  const [panelPerfil,  setPanelPerfil]  = useState(false)
  const [modalNueva,   setModalNueva]   = useState(false)
  const [servicios,    setServicios]    = useState([])
  const [horario,      setHorario]      = useState({
    horaInicio: "09:00", horaFin: "18:00", intervaloMinutos: 30
  })
  const POR_PAGINA = 10

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [rCitas, rPerfil, rHorario, rServicios] = await Promise.all([
        fetch(`${API}/barbero/citas`,   { headers: barberoHeaders() }).then(r => r.json()),
        fetch(`${API}/barbero/perfil`,  { headers: barberoHeaders() }).then(r => r.json()),
        fetch(`${API}/barberia/${barbero.id_barberia}/horario`).then(r => r.json()).catch(() => null),
        fetch(`${API}/public/servicios/${barbero.id_barberia}`).then(r => r.json()).catch(() => []),
      ])
      setCitas(Array.isArray(rCitas) ? rCitas : [])
      if (rPerfil && rPerfil.nombre) setPerfil(rPerfil)
      if (rHorario && rHorario.horaInicio) setHorario(rHorario)
      if (Array.isArray(rServicios)) setServicios(rServicios)
    } catch (_) { setCitas([]) }
    setLoading(false)
  }, [barbero?.id_barberia])

  useEffect(() => {
    cargarDatos()
    const intervalo = setInterval(cargarDatos, 30000)
    return () => clearInterval(intervalo)
  }, [cargarDatos])

  // Cerrar panel con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setPanelPerfil(false) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  function abrirWhatsApp(cita, estado) {
    const tel = cita.telefono?.replace(/\D/g, "")
    if (!tel) return
    const nombre   = cita.cliente_nombre || "Cliente"
    const servicio = cita.servicio_desc  || "el servicio"
    const fecha    = new Date(cita.fechaInicio)
    const fechaStr = fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
    const horaStr  = `${String(fecha.getHours()).padStart(2,"0")}:${String(fecha.getMinutes()).padStart(2,"0")}`
    const mensajes = {
      confirmada: `Hola ${nombre}! 👋\nTu cita ha sido *CONFIRMADA* ✅\n\n✂️ *Servicio:* ${servicio}\n📅 *Fecha:* ${fechaStr}\n🕐 *Hora:* ${horaStr} hrs\n\n¡Te esperamos! 😊`,
      cancelada:  `Hola ${nombre} 👋\nTu cita ha sido *CANCELADA* ❌\n\n✂️ *Servicio:* ${servicio}\n📅 *Fecha:* ${fechaStr}\n🕐 *Hora:* ${horaStr} hrs\n\nPuedes agendar una nueva cita cuando gustes 🙏`,
    }
    if (mensajes[estado])
      window.open(`https://wa.me/52${tel}?text=${encodeURIComponent(mensajes[estado])}`, "_blank")
  }

  async function cambiarEstado(id, estado) {
    try {
      await fetch(`${API}/barbero/citas/${id}/estado`, {
        method: "PUT", headers: barberoHeaders(),
        body: JSON.stringify({ estado })
      })
      cargarDatos()
      if (citaDetalle?.telefono && ["confirmada", "cancelada"].includes(estado))
        abrirWhatsApp(citaDetalle, estado)
      setCitaDetalle(null)
    } catch (_) {}
  }

  // Actualizar perfil local cuando el panel guarda cambios
  function handlePerfilUpdate(nuevosDatos) {
    setPerfil(prev => ({ ...prev, ...nuevosDatos }))
  }

  const semana     = getWeekDates(baseDate)
  const HORAS      = generarHoras(horario.horaInicio, horario.horaFin, horario.intervaloMinutos)
  const citasHoy   = citas.filter(c => isSameDay(new Date(c.fechaInicio), new Date()))
  const pendientes = citas.filter(c => c.estado === "pendiente")

  function citasDelSlot(dia, hora) {
    return citas.filter(c => {
      const f  = new Date(c.fechaInicio)
      const hh = `${String(f.getHours()).padStart(2,"0")}:${String(f.getMinutes()).padStart(2,"0")}`
      return isSameDay(f, dia) && hh === hora
    })
  }

  function estaOcupado(dia, hora) {
    const [hh, mm] = hora.split(":").map(Number)
    const slotInicio = new Date(dia); slotInicio.setHours(hh, mm, 0, 0)
    const slotFin    = new Date(slotInicio.getTime() + horario.intervaloMinutos * 60000)
    return citas.some(c => {
      if (c.estado === "cancelada") return false
      const inicio = new Date(c.fechaInicio)
      if (!isSameDay(inicio, dia)) return false
      const fin = c.fechaFin
        ? new Date(c.fechaFin)
        : new Date(inicio.getTime() + Math.ceil((c.hora_estimada || 60) / 60) * 60 * 60000)
      return inicio < slotFin && fin > slotInicio
    })
  }

  const iniciales = (perfil?.nombre || barbero?.nombre || "B")
    .split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()

  const fotoActual = perfil?.foto || null

  return (
    <div className="barbero-root">

      {/* ── Header ── */}
      <header className="barbero-header">
        <div className="bh-left">
          {/* Avatar clicable para abrir panel de perfil */}
          <button className="bh-avatar-btn" onClick={() => setPanelPerfil(true)} title="Ver mi perfil">
            <div className="bh-avatar">
              {fotoActual
                ? <img src={fotoActual} alt="foto" className="bh-avatar-img" />
                : <span>{iniciales}</span>
              }
            </div>
            <div className="bh-avatar-edit"><i className="fas fa-pen" /></div>
          </button>
          <div className="bh-info">
            <span className="bh-nombre">{perfil?.nombre || barbero?.nombre}</span>
            <span className="bh-barberia">
              <i className="fas fa-store" /> {perfil?.barberia_nombre || "Mi barbería"}
            </span>
          </div>
        </div>

        <div className="bh-center">
          <h1 className="bh-title"><i className="fas fa-calendar-alt" /> Mi Agenda</h1>
        </div>

        <div className="bh-right">
          <div className="bh-stats">
            <div className="bhs-chip">
              <span className="bhs-n">{citasHoy.length}</span>
              <span className="bhs-l">Hoy</span>
            </div>
            <div className="bhs-chip pending">
              <span className="bhs-n">{pendientes.length}</span>
              <span className="bhs-l">Pendientes</span>
            </div>
          </div>
          <button className="bh-logout" onClick={onLogout}>
            <i className="fas fa-sign-out-alt" /> Salir
          </button>
        </div>
      </header>

      {/* ── Controles de vista ── */}
      <div className="barbero-toolbar">
        <div className="vista-toggle">
          <button className={vistaMode === "semana" ? "active" : ""} onClick={() => setVistaMode("semana")}>
            <i className="fas fa-th" /> Semana
          </button>
          <button className={vistaMode === "lista" ? "active" : ""} onClick={() => setVistaMode("lista")}>
            <i className="fas fa-list" /> Lista
          </button>
        </div>
        <button className="bh-nueva-cita-btn" onClick={() => setModalNueva(true)}>
          <i className="fas fa-plus" /> Nueva cita
        </button>
      </div>

      {/* ── Vista Semana ── */}
      {vistaMode === "semana" && (
        <div className="semana-wrap">
          <div className="semana-nav">
            <button onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate()-7); setBaseDate(d) }}>
              <i className="fas fa-chevron-left" />
            </button>
            <span className="semana-rango">{formatFecha(semana[0])} — {formatFecha(semana[5])}</span>
            <button onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate()+7); setBaseDate(d) }}>
              <i className="fas fa-chevron-right" />
            </button>
            <button className="btn-hoy" onClick={() => setBaseDate(new Date())}>Hoy</button>
          </div>

          <div className="calendario-grid">
            <div className="cal-corner" />
            {semana.map((dia, i) => {
              const esHoy = isSameDay(dia, new Date())
              return (
                <div key={i} className={`cal-dia-header ${esHoy ? "hoy" : ""}`}>
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
                  const esBloqueo = ocupado && slotCitas.length === 0
                  return (
                    <div
                      key={`${hora}-${di}`}
                      className={`cal-slot ${esPasado?"pasado":""} ${ocupado?"ocupado":""} ${esBloqueo?"bloqueo":""}`}
                    >
                      {slotCitas.map(c => (
                        <div key={c.id} className="cita-chip"
                          style={{ borderLeftColor: estadoColor[c.estado] || "#9b30d9" }}
                          onClick={() => setCitaDetalle(c)}>
                          <span className="chip-cliente">{c.cliente_nombre || "Cliente"}</span>
                          <span className="chip-servicio">
                            {c.servicio_tipo === "paquete" && <i className="fas fa-box-open" style={{marginRight:3,fontSize:10}} />}
                            {c.servicio_desc || ""}
                          </span>
                        </div>
                      ))}
                      {esBloqueo && <div className="slot-ocupado-icon"><i className="fas fa-lock" /></div>}
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
          </div>
        </div>
      )}

      {/* ── Vista Lista ── */}
      {vistaMode === "lista" && (() => {
        const orden = { pendiente:0, confirmada:1, completada:2, cancelada:3 }
        const citasFiltradas = [...citas]
          .sort((a,b) => orden[a.estado]-orden[b.estado] || new Date(b.fechaInicio)-new Date(a.fechaInicio))
          .filter(c => filtroEstado === "todas" || c.estado === filtroEstado)
        const citasVisibles = citasFiltradas.slice(0, pagina * POR_PAGINA)
        const hayMas = citasVisibles.length < citasFiltradas.length

        return (
          <div className="lista-wrap">
            <div className="lista-filtros">
              <span className="lista-count">{citasFiltradas.length} citas</span>
              <div className="filtro-btns">
                {[["pendiente","#f59e0b"],["confirmada","#10b981"],["completada","#6366f1"],["cancelada","#ef4444"],["todas","#9b30d9"]].map(([est,color]) => (
                  <button key={est}
                    className={`filtro-btn ${filtroEstado === est ? "activo" : ""}`}
                    style={{"--fc": color}}
                    onClick={() => { setFiltroEstado(est); setPagina(1) }}>
                    {est.charAt(0).toUpperCase() + est.slice(1)}
                    <span className="filtro-count">
                      {est === "todas" ? citas.length : citas.filter(c => c.estado === est).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="loading-citas"><i className="fas fa-spinner fa-spin" /> Cargando...</div>
            ) : citasFiltradas.length === 0 ? (
              <div className="empty-citas">
                <i className="fas fa-calendar-times" />
                <p>No tienes citas {filtroEstado !== "todas" ? `con estado "${filtroEstado}"` : "registradas"}.</p>
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
                            <i className={`fas ${c.servicio_tipo === "paquete" ? "fa-box-open" : "fa-cut"}`} />
                            {" "}{c.servicio_desc || "Servicio"}
                          </span>
                          <span className="li-hora">
                            <i className="fas fa-clock" /> {String(f.getHours()).padStart(2,"0")}:{String(f.getMinutes()).padStart(2,"0")}
                          </span>
                        </div>
                        <div className="lista-estado">
                          <span className="estado-badge" style={{
                            background: estadoColor[c.estado]+"22",
                            color: estadoColor[c.estado],
                            borderColor: estadoColor[c.estado]
                          }}>
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
                    <button className="btn-ver-mas" onClick={() => setPagina(p => p+1)}>
                      <i className="fas fa-chevron-down" /> Ver más ({citasFiltradas.length - citasVisibles.length} restantes)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* ── Modal Detalle Cita ── */}
      {citaDetalle && (
        <Modal
          title="Detalle de cita"
          icon="fa-calendar-check"
          onClose={() => setCitaDetalle(null)}
          size="md"
        >
          <div className="m-detail-grid">
            <div className="m-detail-item">
              <span className="m-detail-label"><i className="fas fa-user" /> Cliente</span>
              <span className="m-detail-val">{citaDetalle.cliente_nombre || "—"}</span>
            </div>

            <div className="m-detail-item">
              <span className="m-detail-label">
                <i className={`fas ${citaDetalle.servicio_tipo === "paquete" ? "fa-box-open" : "fa-cut"}`} />
                {" "}{citaDetalle.servicio_tipo === "paquete" ? "Paquete" : "Servicio"}
              </span>
              <span className="m-detail-val">{citaDetalle.servicio_desc || "—"}</span>
            </div>

            <div className="m-detail-item">
              <span className="m-detail-label"><i className="fas fa-calendar" /> Fecha y hora</span>
              <span className="m-detail-val">
                {new Date(citaDetalle.fechaInicio).toLocaleString("es-MX", {
                  weekday: "short", day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit"
                })}
              </span>
            </div>

            <div className="m-detail-item">
              <span className="m-detail-label"><i className="fas fa-dollar-sign" /> Precio</span>
              <span className="m-detail-val" style={{ fontSize: 18, color: "#4a0080" }}>
                ${parseFloat(citaDetalle.precio || 0).toFixed(2)}
              </span>
            </div>

            <div className="m-detail-item">
              <span className="m-detail-label"><i className="fas fa-tag" /> Estado</span>
              <span className="m-detail-val">
                <span className="estado-badge" style={{
                  background: estadoColor[citaDetalle.estado] + "22",
                  color: estadoColor[citaDetalle.estado],
                  borderColor: estadoColor[citaDetalle.estado]
                }}>
                  {citaDetalle.estado}
                </span>
              </span>
            </div>

            {citaDetalle.telefono && (
              <div className="m-detail-item full">
                <span className="m-detail-label"><i className="fas fa-phone" /> Teléfono</span>
                <span className="m-detail-val">{citaDetalle.telefono}</span>
              </div>
            )}
          </div>

          {/* Cambiar estado */}
          <div className="m-actions-section">
            <span className="m-actions-label">Cambiar estado</span>
            <div className="m-actions-btns">
              {["pendiente", "confirmada", "completada", "cancelada"].map(est => (
                <button
                  key={est}
                  className={`m-estado-btn ${citaDetalle.estado === est ? "activo" : ""}`}
                  style={{"--ec": estadoColor[est]}}
                  onClick={() => cambiarEstado(citaDetalle.id, est)}
                >
                  {est}
                  {["confirmada", "cancelada"].includes(est) && citaDetalle.telefono && (
                    <i className="fab fa-whatsapp" style={{ color: "#25d366" }} />
                  )}
                </button>
              ))}
            </div>
            {citaDetalle.telefono
              ? <p className="wa-aviso"><i className="fab fa-whatsapp" /> Al confirmar o cancelar se abrirá WhatsApp</p>
              : <p className="wa-aviso sin-tel"><i className="fas fa-exclamation-circle" /> Sin teléfono registrado</p>
            }
          </div>
        </Modal>
      )}

      {/* ── Modal Nueva Cita ── */}
      {modalNueva && (
        <ModalNuevaCita
          barbero={barbero}
          servicios={servicios}
          horario={horario}
          onSave={() => { setModalNueva(false); cargarDatos() }}
          onClose={() => setModalNueva(false)}
        />
      )}

      {/* ── Panel de perfil ── */}
      {panelPerfil && (
        <PanelPerfil
          perfil={perfil}
          onClose={() => setPanelPerfil(false)}
          onLogout={onLogout}
          onUpdate={handlePerfilUpdate}
        />
      )}
    </div>
  )
}