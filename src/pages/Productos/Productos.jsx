import { useState, useEffect, useCallback, useRef } from "react"
import "./Productos.css"
import { API, authHeaders } from "../../utils/api"
import Modal from "../../components/Modal/Modal"

const ESTADOS = [
  { val: "disponible", label: "Disponible", color: "#10b981" },
  { val: "agotado",    label: "Agotado",    color: "#f59e0b" },
  { val: "oculto",     label: "Oculto",     color: "#9ca3af" },
]

// ── Modal Producto ────────────────────────────────────────────────
function ModalProducto({ producto, barberiaId, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre:      producto?.nombre      || "",
    descripcion: producto?.descripcion || "",
    precio:      producto?.precio      || "",
    stock:       producto?.stock       ?? 0,
    estado:      producto?.estado      || "disponible",
    imagen_url_actual: producto?.imagen_url || "",
  })
  const [imagenFile, setImagenFile]       = useState(null)
  const [imagenPreview, setImagenPreview] = useState(producto?.imagen_url || null)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState("")
  const fileRef = useRef(null)

  function handleImagen(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { setError("La imagen no debe superar 3MB"); return }
    setImagenFile(file)
    setImagenPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    if (!form.precio || isNaN(parseFloat(form.precio)) || parseFloat(form.precio) < 0) {
      setError("El precio debe ser un número positivo"); return
    }
    setSaving(true); setError("")
    try {
      const fd = new FormData()
      fd.append("nombre",      form.nombre.trim())
      fd.append("descripcion", form.descripcion.trim())
      fd.append("precio",      parseFloat(form.precio))
      fd.append("stock",       parseInt(form.stock) || 0)
      fd.append("estado",      form.estado)
      fd.append("imagen_url_actual", form.imagen_url_actual || "")
      if (imagenFile) fd.append("imagen", imagenFile)

      const token  = sessionStorage.getItem("token") || ""
      const url    = producto
        ? `${API}/productos/${barberiaId}/${producto.id}`
        : `${API}/productos/${barberiaId}`
      const method = producto ? "PUT" : "POST"
      const res    = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` }, // sin Content-Type para FormData
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar")
      onSave()
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  return (
    <Modal
      title={producto ? "Editar producto" : "Nuevo producto"}
      icon={producto ? "fa-edit" : "fa-plus-circle"}
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
      {/* Imagen */}
      <div className="prod-img-upload" onClick={() => fileRef.current?.click()}>
        {imagenPreview
          ? <img src={imagenPreview} alt="preview" className="prod-img-preview" />
          : (
            <div className="prod-img-placeholder">
              <i className="fas fa-camera" />
              <span>Subir imagen</span>
            </div>
          )
        }
        <div className="prod-img-overlay"><i className="fas fa-camera" /> Cambiar</div>
        <input
          ref={fileRef} type="file" accept="image/*"
          style={{ display: "none" }} onChange={handleImagen}
        />
      </div>

      {/* Nombre */}
      <div className="m-row">
        <label>Nombre *</label>
        <input type="text" placeholder="Ej: Pomada para cabello" maxLength={100}
          value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
      </div>

      {/* Descripción */}
      <div className="m-row">
        <label>Descripción <span className="m-hint">opcional</span></label>
        <textarea placeholder="Descripción breve del producto..." maxLength={300} rows={3}
          value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
      </div>

      {/* Precio + Stock */}
      <div className="m-row-2">
        <div className="m-row">
          <label>Precio ($) *</label>
          <input type="number" min="0" step="0.50" placeholder="0.00"
            value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} />
        </div>
        <div className="m-row">
          <label>Stock</label>
          <input type="number" min="0" placeholder="0"
            value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
        </div>
      </div>

      {/* Estado */}
      <div className="m-row">
        <label>Estado</label>
        <div className="prod-estados">
          {ESTADOS.map(e => (
            <button key={e.val} type="button"
              className={`prod-estado-btn ${form.estado === e.val ? "activo" : ""}`}
              style={{"--ec": e.color}}
              onClick={() => setForm({...form, estado: e.val})}
            >{e.label}</button>
          ))}
        </div>
      </div>

      {error && <div className="m-error"><i className="fas fa-exclamation-circle" /> {error}</div>}
    </Modal>
  )
}

// ── Modal Confirmar Eliminar ──────────────────────────────────────
function ModalConfirmar({ nombre, onConfirm, onClose }) {
  return (
    <Modal
      title="Eliminar producto"
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
      <p className="m-confirm-text">
        ¿Eliminar <strong>"{nombre}"</strong>?
      </p>
      <div className="m-danger-note">
        <i className="fas fa-exclamation-triangle" />
        Esta acción no se puede deshacer. La imagen también será eliminada.
      </div>
    </Modal>
  )
}

// ── Componente principal ──────────────────────────────────────────
export default function Productos({ barberia }) {
  const [productos, setProductos] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)   // null | "nuevo" | producto
  const [confirmar, setConfirmar] = useState(null)
  const [toast,     setToast]     = useState("")
  const [filtro,    setFiltro]    = useState("todos")

  const mostrarToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const cargar = useCallback(async () => {
    if (!barberia?.id) return
    setLoading(true)
    try {
      const r = await fetch(`${API}/productos/${barberia.id}`, { headers: authHeaders() })
      const d = await r.json()
      setProductos(Array.isArray(d) ? d : [])
    } catch (_) { setProductos([]) }
    setLoading(false)
  }, [barberia?.id])

  useEffect(() => { cargar() }, [cargar])

  async function eliminar(prod) {
    try {
      await fetch(`${API}/productos/${barberia.id}/${prod.id}`, {
        method: "DELETE", headers: authHeaders()
      })
      mostrarToast("🗑️ Producto eliminado")
      setConfirmar(null)
      cargar()
    } catch (_) { mostrarToast("❌ Error al eliminar") }
  }

  const productosFiltrados = filtro === "todos"
    ? productos
    : productos.filter(p => p.estado === filtro)

  const estadoInfo = (est) => ESTADOS.find(e => e.val === est) || ESTADOS[0]

  return (
    <div className="prod-root">
      {toast && <div className="prod-toast">{toast}</div>}

      {/* Topbar */}
      <div className="prod-topbar">
        <div className="prod-topbar-left">
          <h1 className="prod-title">
            <i className="fas fa-box-open" />
            Productos
          </h1>
          <div className="prod-filtros">
            {[["todos","#9b30d9"],["disponible","#10b981"],["agotado","#f59e0b"],["oculto","#9ca3af"]].map(([f, color]) => (
              <button key={f} className={`prod-filtro ${filtro === f ? "activo" : ""}`}
                style={{"--pfc": color}}
                onClick={() => setFiltro(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="prod-filtro-n">
                  {f === "todos" ? productos.length : productos.filter(p => p.estado === f).length}
                </span>
              </button>
            ))}
          </div>
        </div>
        <button className="prod-btn-nuevo" onClick={() => setModal("nuevo")}>
          <i className="fas fa-plus" /> Agregar producto
        </button>
      </div>

      {/* Grid / estados */}
      {loading ? (
        <div className="prod-loading"><i className="fas fa-spinner fa-spin" /> Cargando productos...</div>
      ) : productosFiltrados.length === 0 ? (
        <div className="prod-empty">
          <i className="fas fa-box-open" />
          <p>
            {filtro === "todos"
              ? "No hay productos registrados aún."
              : `No hay productos con estado "${filtro}".`}
          </p>
          {filtro === "todos" && (
            <button className="prod-btn-nuevo" onClick={() => setModal("nuevo")}>
              <i className="fas fa-plus" /> Agregar primer producto
            </button>
          )}
        </div>
      ) : (
        <div className="prod-grid">
          {productosFiltrados.map(p => {
            const ei = estadoInfo(p.estado)
            return (
              <div key={p.id} className="prod-card">
                <div className="prod-card-img">
                  {p.imagen_url
                    ? <img src={p.imagen_url} alt={p.nombre} />
                    : <div className="prod-card-no-img"><i className="fas fa-image" /></div>
                  }
                  <span className="prod-card-estado" style={{
                    background: ei.color + "22",
                    color: ei.color,
                    border: `1px solid ${ei.color}44`
                  }}>
                    {ei.label}
                  </span>
                </div>
                <div className="prod-card-info">
                  <span className="prod-card-nombre">{p.nombre}</span>
                  {p.descripcion && <span className="prod-card-desc">{p.descripcion}</span>}
                  <div className="prod-card-meta">
                    <span className="prod-card-precio">${parseFloat(p.precio).toFixed(2)}</span>
                    <span className="prod-card-stock"><i className="fas fa-cubes" /> {p.stock} en stock</span>
                  </div>
                </div>
                <div className="prod-card-acciones">
                  <button className="prod-btn-accion edit" title="Editar" onClick={() => setModal(p)}>
                    <i className="fas fa-edit" />
                  </button>
                  <button className="prod-btn-accion delete" title="Eliminar" onClick={() => setConfirmar(p)}>
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <ModalProducto
          producto={modal === "nuevo" ? null : modal}
          barberiaId={barberia?.id}
          onSave={() => { setModal(null); cargar(); mostrarToast("✅ Producto guardado") }}
          onClose={() => setModal(null)}
        />
      )}
      {confirmar && (
        <ModalConfirmar
          nombre={confirmar.nombre}
          onConfirm={() => eliminar(confirmar)}
          onClose={() => setConfirmar(null)}
        />
      )}
    </div>
  )
}