import { useState, useEffect, useCallback } from "react"
import "./Admin.css"
import { API } from "../../utils/api"

function adminHeaders() {
  const token = sessionStorage.getItem("adminToken") || ""
  return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
}

// ── Modal Confirmar ───────────────────────────────────────────────
function ModalConfirmar({ titulo, mensaje, advertencia, colorBtn, labelBtn, iconBtn, onConfirm, onClose }) {
  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header" style={{ background: colorBtn === "#ef4444" ? "linear-gradient(135deg,#991b1b,#ef4444)" : "linear-gradient(135deg,#4a0080,#9b30d9)" }}>
          <h2><i className={`fas ${iconBtn}`} /> {titulo}</h2>
          <button className="adm-modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <div className="adm-modal-body">
          <p className="adm-confirm-msg">{mensaje}</p>
          {advertencia && <p className="adm-confirm-warn"><i className="fas fa-exclamation-triangle" /> {advertencia}</p>}
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="adm-btn-accion" style={{ background: colorBtn }} onClick={onConfirm}>
            <i className={`fas ${iconBtn}`} /> {labelBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Detalle ─────────────────────────────────────────────────
function ModalDetalle({ barberiaId, onClose }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/admin/barberias/${barberiaId}`, { headers: adminHeaders() })
      .then(r => r.json()).then(setData).catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [barberiaId])

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal detalle-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h2><i className="fas fa-store" /> Detalle de barbería</h2>
          <button className="adm-modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <div className="adm-modal-body">
          {loading ? (
            <div className="adm-loading-sm"><i className="fas fa-spinner fa-spin" /> Cargando...</div>
          ) : !data ? (
            <p className="adm-err-sm">No se pudo cargar la información.</p>
          ) : (
            <>
              <div className="det-info-grid">
                <div className="det-item"><span className="det-label"><i className="fas fa-store" /> Nombre</span><span className="det-val">{data.nombre}</span></div>
                <div className="det-item"><span className="det-label"><i className="fas fa-user" /> Encargado</span><span className="det-val">{data.nombre_encargado}</span></div>
                <div className="det-item"><span className="det-label"><i className="fas fa-phone" /> Teléfono</span><span className="det-val">{data.telefono || "—"}</span></div>
                <div className="det-item"><span className="det-label"><i className="fas fa-envelope" /> Correo</span><span className="det-val">{data.correo}</span></div>
                <div className="det-item"><span className="det-label"><i className="fas fa-map-marker-alt" /> Dirección</span><span className="det-val">{data.direccion || "—"}</span></div>
                <div className="det-item"><span className="det-label"><i className="fas fa-circle" /> Estado</span>
                  <span className={`adm-badge ${data.estado}`}>{data.estado}</span>
                </div>
              </div>

              <div className="det-section">
                <h3><i className="fas fa-calendar-alt" /> Citas</h3>
                <div className="det-citas-grid">
                  <div className="det-cita-card"><span className="dc-num">{data.estadoCitas?.total || 0}</span><span className="dc-lbl">Total</span></div>
                  <div className="det-cita-card pendiente"><span className="dc-num">{data.estadoCitas?.pendientes || 0}</span><span className="dc-lbl">Pendientes</span></div>
                  <div className="det-cita-card confirmada"><span className="dc-num">{data.estadoCitas?.confirmadas || 0}</span><span className="dc-lbl">Confirmadas</span></div>
                  <div className="det-cita-card cancelada"><span className="dc-num">{data.estadoCitas?.canceladas || 0}</span><span className="dc-lbl">Canceladas</span></div>
                </div>
              </div>

              <div className="det-section">
                <h3><i className="fas fa-cut" /> Servicios ({data.servicios?.length || 0})</h3>
                {data.servicios?.length > 0 ? (
                  <div className="det-servicios">
                    {data.servicios.map(s => (
                      <div key={s.id} className="det-serv-item">
                        <span>{s.descripcion}</span>
                        <span className="det-serv-meta">${parseFloat(s.precio).toFixed(2)} · {s.hora_estimada} min</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="det-empty">Sin servicios registrados</p>}
              </div>
            </>
          )}
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn-cancelar" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Editar ──────────────────────────────────────────────────
function ModalEditar({ barberia, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre:           barberia.nombre,
    nombre_encargado: barberia.nombre_encargado,
    telefono:         barberia.telefono || "",
    correo:           barberia.correo,
    direccion:        barberia.direccion || "",
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  async function handleSave() {
    if (!form.nombre.trim() || !form.nombre_encargado.trim() || !form.correo.trim()) {
      setError("Nombre, encargado y correo son obligatorios"); return
    }
    setSaving(true); setError("")
    try {
      const r = await fetch(`${API}/admin/barberias/${barberia.id}`, {
        method: "PUT", headers: adminHeaders(), body: JSON.stringify(form)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Error al guardar")
      onSave()
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h2><i className="fas fa-edit" /> Editar barbería</h2>
          <button className="adm-modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <div className="adm-modal-body">
          <div className="adm-form-grid">
            {[
              { key: "nombre",           label: "Nombre *",           type: "text" },
              { key: "nombre_encargado", label: "Encargado *",        type: "text" },
              { key: "correo",           label: "Correo *",           type: "email" },
              { key: "telefono",         label: "Teléfono",           type: "text" },
              { key: "direccion",        label: "Dirección",          type: "text", full: true },
            ].map(({ key, label, type, full }) => (
              <div key={key} className={`adm-form-row${full ? " full" : ""}`}>
                <label>{label}</label>
                <input type={type} value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          {error && <p className="adm-form-error"><i className="fas fa-exclamation-circle" /> {error}</p>}
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="adm-btn-guardar" onClick={handleSave} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-check" /> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panel principal ───────────────────────────────────────────────
export default function Admin({ admin, onLogout }) {
  const [stats,     setStats]     = useState({ total: 0, activas: 0, pausadas: 0, citas: 0 })
  const [barberias, setBarberias] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [buscar,    setBuscar]    = useState("")
  const [filtroEst, setFiltroEst] = useState("todas")
  const [toast,     setToast]     = useState("")

  // Modales
  const [modalDetalle,  setModalDetalle]  = useState(null) // id
  const [modalEditar,   setModalEditar]   = useState(null) // objeto barberia
  const [modalEliminar, setModalEliminar] = useState(null) // objeto barberia
  const [modalPausar,   setModalPausar]   = useState(null) // objeto barberia

  const mostrarToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, bRes] = await Promise.all([
        fetch(`${API}/admin/stats`, { headers: adminHeaders() }),
        fetch(`${API}/admin/barberias?buscar=${encodeURIComponent(buscar)}&estado=${filtroEst}`, { headers: adminHeaders() })
      ])
      if (sRes.status === 401 || bRes.status === 401) { onLogout(); return }
      setStats(await sRes.json())
      setBarberias(await bRes.json())
    } catch (_) {}
    setLoading(false)
  }, [buscar, filtroEst])

  useEffect(() => { cargar() }, [cargar])

  async function cambiarEstado(b, nuevoEstado) {
    try {
      const r = await fetch(`${API}/admin/barberias/${b.id}/estado`, {
        method: "PUT", headers: adminHeaders(),
        body: JSON.stringify({ estado: nuevoEstado })
      })
      if (!r.ok) throw new Error()
      mostrarToast(nuevoEstado === "pausada" ? "⏸️ Barbería pausada" : "✅ Barbería reactivada")
      setModalPausar(null)
      cargar()
    } catch { mostrarToast("❌ Error al cambiar estado") }
  }

  async function eliminar(b) {
    try {
      const r = await fetch(`${API}/admin/barberias/${b.id}`, {
        method: "DELETE", headers: adminHeaders()
      })
      if (!r.ok) throw new Error()
      mostrarToast("🗑️ Barbería eliminada")
      setModalEliminar(null)
      cargar()
    } catch { mostrarToast("❌ Error al eliminar") }
  }

  const FILTROS = [
    { val: "todas",   label: "Todas" },
    { val: "activa",  label: "Activas" },
    { val: "pausada", label: "Pausadas" },
  ]

  return (
    <div className="adm-root">
      {toast && <div className="adm-toast">{toast}</div>}

      {/* Header */}
      <header className="adm-header">
        <div className="adm-header-left">
          <div className="adm-logo"><i className="fas fa-shield-alt" /></div>
          <div>
            <span className="adm-brand">MyBarber</span>
            <span className="adm-panel-tag">Admin</span>
          </div>
        </div>
        <div className="adm-header-right">
          <span className="adm-admin-name"><i className="fas fa-user-shield" /> {admin?.nombre || "Administrador"}</span>
          <button className="adm-logout" onClick={onLogout}>
            <i className="fas fa-sign-out-alt" /> Salir
          </button>
        </div>
      </header>

      <main className="adm-main">

        {/* Stats */}
        <div className="adm-stats">
          {[
            { label: "Total barberías",  val: stats.total,   icon: "fa-store",        color: "#4a0080" },
            { label: "Activas",          val: stats.activas, icon: "fa-check-circle", color: "#10b981" },
            { label: "Pausadas",         val: stats.pausadas,icon: "fa-pause-circle", color: "#f59e0b" },
            { label: "Total citas",      val: stats.citas,   icon: "fa-calendar-alt", color: "#6366f1" },
          ].map((s, i) => (
            <div key={i} className="adm-stat-card" style={{ "--sc": s.color }}>
              <div className="adm-stat-icon"><i className={`fas ${s.icon}`} /></div>
              <div>
                <span className="adm-stat-num">{s.val}</span>
                <span className="adm-stat-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="adm-toolbar">
          <div className="adm-search-wrap">
            <i className="fas fa-search adm-search-icon" />
            <input
              className="adm-search"
              placeholder="Buscar por nombre, encargado o correo..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
            />
            {buscar && (
              <button className="adm-search-clear" onClick={() => setBuscar("")}>
                <i className="fas fa-times" />
              </button>
            )}
          </div>
          <div className="adm-filtros">
            {FILTROS.map(f => (
              <button key={f.val}
                className={`adm-filtro ${filtroEst === f.val ? "activo" : ""}`}
                onClick={() => setFiltroEst(f.val)}
              >{f.label}</button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="adm-table-wrap">
          {loading ? (
            <div className="adm-loading"><i className="fas fa-spinner fa-spin" /> Cargando barberías...</div>
          ) : barberias.length === 0 ? (
            <div className="adm-empty">
              <i className="fas fa-store-slash" />
              <p>No se encontraron barberías</p>
            </div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Barbería</th>
                  <th>Responsable</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Citas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {barberias.map(b => (
                  <tr key={b.id} className={b.estado === "pausada" ? "fila-pausada" : ""}>
                    <td>
                      <div className="adm-barberia-cell">
                        <div className="adm-avatar">
                          {b.foto_perfil
                            ? <img src={b.foto_perfil} alt={b.nombre} />
                            : <span>{b.nombre.charAt(0).toUpperCase()}</span>
                          }
                        </div>
                        <span className="adm-barberia-nombre">{b.nombre}</span>
                      </div>
                    </td>
                    <td className="adm-td-sec">{b.nombre_encargado}</td>
                    <td className="adm-td-sec">
                      <div className="adm-contacto">
                        <span><i className="fas fa-envelope" /> {b.correo}</span>
                        {b.telefono && <span><i className="fas fa-phone" /> {b.telefono}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`adm-badge ${b.estado}`}>{b.estado}</span>
                    </td>
                    <td>
                      <span className="adm-citas-num">{b.total_citas}</span>
                    </td>
                    <td>
                      <div className="adm-acciones">
                        <button className="adm-btn-ico info"  title="Ver detalle"  onClick={() => setModalDetalle(b.id)}>
                          <i className="fas fa-eye" />
                        </button>
                        <button className="adm-btn-ico edit"  title="Editar"       onClick={() => setModalEditar(b)}>
                          <i className="fas fa-edit" />
                        </button>
                        {b.estado !== "pausada" ? (
                          <button className="adm-btn-ico pause" title="Pausar"    onClick={() => setModalPausar({ ...b, accion: "pausar" })}>
                            <i className="fas fa-pause" />
                          </button>
                        ) : (
                          <button className="adm-btn-ico play"  title="Reactivar" onClick={() => setModalPausar({ ...b, accion: "reactivar" })}>
                            <i className="fas fa-play" />
                          </button>
                        )}
                        <button className="adm-btn-ico del"   title="Eliminar"    onClick={() => setModalEliminar(b)}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modales */}
      {modalDetalle && (
        <ModalDetalle barberiaId={modalDetalle} onClose={() => setModalDetalle(null)} />
      )}
      {modalEditar && (
        <ModalEditar
          barberia={modalEditar}
          onSave={() => { setModalEditar(null); cargar(); mostrarToast("✅ Barbería actualizada") }}
          onClose={() => setModalEditar(null)}
        />
      )}
      {modalPausar && (
        <ModalConfirmar
          titulo={modalPausar.accion === "pausar" ? "Pausar barbería" : "Reactivar barbería"}
          mensaje={modalPausar.accion === "pausar"
            ? `¿Pausar la barbería "${modalPausar.nombre}"?`
            : `¿Reactivar la barbería "${modalPausar.nombre}"?`}
          advertencia={modalPausar.accion === "pausar" ? "Los clientes no podrán agendar citas mientras esté pausada." : null}
          colorBtn={modalPausar.accion === "pausar" ? "#f59e0b" : "#10b981"}
          labelBtn={modalPausar.accion === "pausar" ? "Pausar" : "Reactivar"}
          iconBtn={modalPausar.accion === "pausar" ? "fa-pause" : "fa-play"}
          onConfirm={() => cambiarEstado(modalPausar, modalPausar.accion === "pausar" ? "pausada" : "activa")}
          onClose={() => setModalPausar(null)}
        />
      )}
      {modalEliminar && (
        <ModalConfirmar
          titulo="Eliminar barbería"
          mensaje={`¿Eliminar "${modalEliminar.nombre}" permanentemente?`}
          advertencia="Se eliminarán todas sus citas, servicios y productos. Esta acción no se puede deshacer."
          colorBtn="#ef4444"
          labelBtn="Eliminar"
          iconBtn="fa-trash"
          onConfirm={() => eliminar(modalEliminar)}
          onClose={() => setModalEliminar(null)}
        />
      )}
    </div>
  )
}