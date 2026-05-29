import { useState, useEffect, useMemo } from "react"
import "./Catalogo.css"
import HeaderPublico from "../../components/HeaderPublico/HeaderPublico"
import FooterPublico from "../../components/FooterPublico/FooterPublico"
import { API } from "../../utils/api"


export default function Catalogo() {
  const params      = new URLSearchParams(window.location.search)
  const id_barberia = params.get("barberia")

  const [barberia,  setBarberia]  = useState(null)
  const [productos, setProductos] = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [error404,  setError404]  = useState(false)
  const [busqueda,  setBusqueda]  = useState("")

  useEffect(() => {
    if (!id_barberia) { setError404(true); setCargando(false); return }
    Promise.all([
      fetch(`${API}/public/barberia/${id_barberia}`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API}/productos/${id_barberia}/publico`).then(r => r.json()),
    ]).then(([b, p]) => {
      setBarberia(b)
      setProductos(Array.isArray(p) ? p : [])
    }).catch(() => setError404(true))
      .finally(() => setCargando(false))
  }, [id_barberia])

  const productosFiltrados = useMemo(() => {
    let lista = [...productos].sort((a,b) => {
      const ord = { disponible: 0, agotado: 1 }
      return (ord[a.estado]??2) - (ord[b.estado]??2)
    })
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(q))
      )
    }
    return lista
  }, [productos, busqueda])

  if (cargando) return (
    <div className="cat-loading">
      <div className="cat-spinner" />
      <p>Cargando catálogo...</p>
    </div>
  )
  if (error404) return (
    <div className="cat-error">
      <i className="fas fa-store-slash" />
      <h2>Catálogo no encontrado</h2>
      <p>El enlace puede ser incorrecto.</p>
    </div>
  )

  const disponibles = productos.filter(p => p.estado === "disponible").length

  return (
    <div className="cat-root">
      <div className="cat-grain" />

      {/* Header */}
      <HeaderPublico barberia={barberia} badge="Catálogo de productos" badgeIcon="fa-box-open" />

      {/* Barra de búsqueda */}
      <div className="cat-toolbar">
        <div className="cat-toolbar-inner">
          <div className="cat-search-wrap">
            <i className="fas fa-search cat-search-icon" />
            <input
              type="text"
              className="cat-search"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="cat-search-clear" onClick={() => setBusqueda("")}>
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        </div>
        {busqueda && (
          <div className="cat-results">
            {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? "s" : ""} para &ldquo;{busqueda}&rdquo;
          </div>
        )}
      </div>

      {/* Grid */}
      <main className="cat-main">
        {productosFiltrados.length === 0 ? (
          <div className="cat-empty">
            <i className="fas fa-search" />
            <p>{busqueda ? `No se encontró "${busqueda}"` : "No hay productos disponibles."}</p>
            {busqueda && <button className="cat-empty-btn" onClick={() => setBusqueda("")}>Ver todos los productos</button>}
          </div>
        ) : (
          <div className="cat-grid">
            {productosFiltrados.map(p => (
              <div key={p.id} className={`cat-card ${p.estado === "agotado" ? "agotado" : ""}`}>
                <div className="cat-card-img">
                  {p.imagen_url
                    ? <img src={p.imagen_url} alt={p.nombre} loading="lazy" />
                    : <div className="cat-card-no-img"><i className="fas fa-image" /></div>
                  }
                  {p.estado === "agotado" && (
                    <div className="cat-agotado-overlay">
                      <span><i className="fas fa-ban" /> Agotado</span>
                    </div>
                  )}
                </div>
                <div className="cat-card-info">
                  <span className="cat-card-nombre">{p.nombre}</span>
                  {p.descripcion && <span className="cat-card-desc">{p.descripcion}</span>}
                  <div className="cat-card-footer">
                    <span className="cat-card-precio">${parseFloat(p.precio).toFixed(2)}</span>
                    <span className={`cat-card-estado ${p.estado}`}>
                      {p.estado === "disponible"
                        ? <><i className="fas fa-check-circle" /> Disponible</>
                        : <><i className="fas fa-ban" /> Agotado</>
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <FooterPublico telefono={barberia.telefono} nombre={barberia.nombre} />
    </div>
  )
}