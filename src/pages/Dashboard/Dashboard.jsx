import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom"
import { useEffect, useState, useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import Citas from "../Citas/Citas"
import Negocio from "../Negocio/Negocio"
import Productos from "../Productos/Productos"
import "./Dashboard.css"
import { API, authHeaders } from "../../utils/api"

/* ─── Helpers ─────────────────────────────────────────────────── */
function fmt(n) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n)
}
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0 }
function toLocalDate(s)  { return new Date(s) }
function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}
function toLocalTimeStr(d) {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
}

const ESTADO_COLOR = {
  completada: "#10b981", cancelada: "#ef4444",
  confirmada: "#9b30d9", pendiente: "#f59e0b",
}
const PERIODOS_LABEL = { semana: "últimos 7 días", mes: "este mes", todo: "todo el tiempo" }

/* ─── Tooltip personalizado para BarChart ─────────────────────── */
function TooltipBarra({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="hd-tooltip">
      <p className="hd-tooltip-label">{label}</p>
      <p className="hd-tooltip-val">{fmt(payload[0].value)}</p>
    </div>
  )
}

/* ─── Barra de progreso ───────────────────────────────────────── */
function BarProgress({ value, color }) {
  return (
    <div className="hm-bar-bg">
      <div className="hm-bar-fill" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  )
}

/* ─── Panel de detalle lateral ────────────────────────────────── */
function PanelDetalle({ tipo, citasPeriodo, periodo, onClose }) {
  const cfg = {
    ingresos:  { titulo: "Citas completadas",    icon: "fa-check-circle",   color: "#10b981", estado: "completada" },
    perdido:   { titulo: "Citas canceladas",      icon: "fa-ban",            color: "#ef4444", estado: "cancelada"  },
    cobrar:    { titulo: "Citas por cobrar",      icon: "fa-hourglass-half", color: "#9b30d9", estado: "confirmada" },
    servicios: { titulo: "Servicios solicitados", icon: "fa-star",           color: "#f59e0b", estado: null         },
  }[tipo]

  const [mostrarLista,   setMostrarLista]   = useState(true)
  const [limiteCitas,    setLimiteCitas]    = useState(10)  // cuántas citas mostrar

  const citasFiltradas = useMemo(() =>
    cfg.estado
      ? citasPeriodo.filter(c => c.estado === cfg.estado)
          .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio))
      : citasPeriodo,
  [citasPeriodo, cfg.estado])

  const citasVisibles  = citasFiltradas.slice(0, limiteCitas)
  const hayMasCitas    = citasFiltradas.length > limiteCitas
  const totalDinero    = citasFiltradas.reduce((s, c) => s + parseFloat(c.precio || 0), 0)

  /* Datos gráfica barras diarias */
  const barDatos = useMemo(() => {
    if (tipo === "servicios") return []
    const mapa = {}
    citasFiltradas.forEach(c => {
      const d   = toLocalDate(c.fechaInicio)
      const key = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`
      mapa[key] = (mapa[key] || 0) + parseFloat(c.precio || 0)
    })
    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, total]) => ({ dia, total }))
  }, [citasFiltradas, tipo])

  /* Datos donut */
  const donutDatos = useMemo(() => {
    if (tipo !== "servicios") return []
    const cnt = {}
    citasPeriodo.forEach(c => { cnt[c.estado] = (cnt[c.estado] || 0) + 1 })
    return Object.entries(cnt).map(([estado, n]) => ({ name: estado, value: n, color: ESTADO_COLOR[estado] || "#aaa" }))
  }, [citasPeriodo, tipo])

  /* Datos servicios */
  const breakdown = useMemo(() => {
    if (tipo !== "servicios") return []
    const m = {}
    citasPeriodo.forEach(c => {
      const k = c.servicio_desc || "Sin nombre"
      if (!m[k]) m[k] = { nombre: k, veces: 0, ingresos: 0 }
      m[k].veces++
      m[k].ingresos += parseFloat(c.precio || 0)
    })
    return Object.values(m).sort((a, b) => b.veces - a.veces)
  }, [citasPeriodo, tipo])

  const servBarDatos = breakdown.slice(0, 6).map(s => ({
    nombre: s.nombre.length > 14 ? s.nombre.slice(0, 14) + "…" : s.nombre,
    veces: s.veces, ingreso: s.ingresos, nombreFull: s.nombre,
  }))

  return (
    <>
      <div className="hd-backdrop" onClick={onClose} />
      <div className="hd-panel" style={{ "--hd-color": cfg.color }}>

        {/* Header */}
        <div className="hd-panel-header">
          <div className="hd-panel-title-row">
            <div className="hd-panel-icon"><i className={`fas ${cfg.icon}`} /></div>
            <div>
              <h3 className="hd-panel-title">{cfg.titulo}</h3>
              <span className="hd-panel-sub">
                {PERIODOS_LABEL[periodo]} ·{" "}
                {tipo === "servicios" ? `${breakdown.length} servicios` : `${citasFiltradas.length} citas`}
              </span>
            </div>
          </div>
          {tipo !== "servicios" && (
            <div className="hd-total-badge">
              <span className="hd-total-label">{tipo === "cobrar" ? "Por cobrar" : "Total"}</span>
              <span className="hd-total-val">{fmt(totalDinero)}</span>
            </div>
          )}
          <button className="hd-panel-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        <div className="hd-panel-body">



          {/* ══ Gráfica barras diarias ══ */}
          {tipo !== "servicios" && barDatos.length > 1 && (
            <div className="hd-chart-section">
              <span className="hd-chart-title">
                <i className="fas fa-chart-bar" />
                {tipo === "ingresos" ? "Ingresos por día" : tipo === "perdido" ? "Pérdidas por día" : "Monto por día"}
              </span>
              <ResponsiveContainer width="100%" height={155}>
                <BarChart data={barDatos} margin={{ top:4, right:8, left:-10, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,48,217,.1)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize:11, fill:"#9b30d9" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:"#aaa" }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `$${v/1000}k` : `$${v}`} />
                  <Tooltip content={<TooltipBarra />} cursor={{ fill:"rgba(155,48,217,.06)" }} />
                  <Bar dataKey="total" fill={cfg.color} radius={[6,6,0,0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ══ Donut estados ══ */}
          {tipo === "servicios" && donutDatos.length > 0 && (
            <div className="hd-chart-section">
              <span className="hd-chart-title">
                <i className="fas fa-chart-pie" /> Distribución de estados
              </span>
              <ResponsiveContainer width="100%" height={175}>
                <PieChart>
                  <Pie data={donutDatos} cx="50%" cy="50%"
                    innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value">
                    {donutDatos.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend formatter={v => <span style={{ fontSize:12, color:"#7a6090", textTransform:"capitalize" }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ══ Barras servicios ══ */}
          {tipo === "servicios" && servBarDatos.length > 0 && (
            <div className="hd-chart-section">
              <span className="hd-chart-title">
                <i className="fas fa-sort-amount-down" /> Top servicios
              </span>
              <ResponsiveContainer width="100%" height={Math.max(140, servBarDatos.length * 40)}>
                <BarChart data={servBarDatos} layout="vertical"
                  margin={{ top:0, right:40, left:4, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,48,217,.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:10, fill:"#aaa" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize:11, fill:"#4a0080" }}
                    axisLine={false} tickLine={false} width={90} />
                  <Tooltip formatter={(v, n) => [n === "veces" ? `${v} citas` : fmt(v), n === "veces" ? "Solicitudes" : "Ingresos"]}
                    cursor={{ fill:"rgba(155,48,217,.06)" }} />
                  <Bar dataKey="veces" fill="#f59e0b" radius={[0,6,6,0]} maxBarSize={22}
                    label={{ position:"right", fontSize:11, fill:"#f59e0b", formatter: v => v }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Divisor + toggle registros */}
          <div className="hd-list-header">
            <div className="hd-section-divider">
              <i className="fas fa-list" />
              {tipo === "servicios" ? "Desglose completo" : `Registros (${citasFiltradas.length})`}
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              {tipo !== "servicios" && citasFiltradas.length > 10 && mostrarLista && (
                <div className="hd-limit-btns">
                  {[10, 20, 50, citasFiltradas.length].map(n => {
                    const label = n === citasFiltradas.length ? "Todos" : `${n}`
                    return (
                      <button key={n}
                        className={`hd-limit-btn ${limiteCitas === n ? "activo" : ""}`}
                        onClick={() => setLimiteCitas(n)}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
              <button className="hd-toggle-lista-btn" onClick={() => setMostrarLista(v => !v)}>
                <i className={`fas fa-chevron-${mostrarLista ? "up" : "down"}`} />
                {mostrarLista ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {/* Lista servicios */}
          {mostrarLista && tipo === "servicios" && (
            <div className="hd-serv-list">
              {breakdown.length === 0
                ? <p className="hd-empty">Sin datos en este periodo.</p>
                : breakdown.map((s, i) => (
                  <div key={i} className="hd-serv-item">
                    <div className="hd-serv-rank">#{i+1}</div>
                    <div className="hd-serv-info">
                      <span className="hd-serv-nombre">{s.nombre}</span>
                      <span className="hd-serv-meta">{s.veces} solicitud{s.veces!==1?"es":""} · {fmt(s.ingresos)}</span>
                      <BarProgress value={pct(s.veces, citasPeriodo.length)} color="#f59e0b" />
                    </div>
                    <span className="hd-serv-pct">{pct(s.veces, citasPeriodo.length)}%</span>
                  </div>
                ))
              }
            </div>
          )}

          {/* Lista citas */}
          {mostrarLista && tipo !== "servicios" && (
            <div className="hd-citas-list">
              {citasVisibles.length === 0
                ? <p className="hd-empty">Sin citas en este periodo.</p>
                : citasVisibles.map(c => {
                    const d = toLocalDate(c.fechaInicio)
                    return (
                      <div key={c.id} className="hd-cita-item">
                        <div className="hd-cita-dot" style={{ background: ESTADO_COLOR[c.estado]||"#9b30d9" }} />
                        <div className="hd-cita-info">
                          <span className="hd-cita-cliente">{c.cliente_nombre || "Cliente"}</span>
                          <span className="hd-cita-servicio">
                            <i className={`fas ${c.servicio_tipo==="paquete"?"fa-box-open":"fa-cut"}`} />
                            {" "}{c.servicio_desc || "Servicio"}
                          </span>
                          <span className="hd-cita-fecha">
                            <i className="fas fa-calendar" />
                            {" "}{toLocalDateStr(d)} · {toLocalTimeStr(d)} hrs
                          </span>
                        </div>
                        <span className="hd-cita-precio">{fmt(parseFloat(c.precio||0))}</span>
                      </div>
                    )
                  })
              }
              {hayMasCitas && (
                <button className="hd-ver-mas-btn" onClick={() => setLimiteCitas(v => v + 10)}>
                  <i className="fas fa-chevron-down" />
                  Ver más ({citasFiltradas.length - limiteCitas} restantes)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}


/* ─── Home Dashboard ──────────────────────────────────────────── */
function HomeDashboard({ barberia, onNavigate }) {
  const [citas,        setCitas]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [periodo,      setPeriodo]      = useState("mes")
  const [detallePanel, setDetallePanel] = useState(null)

  useEffect(() => {
    if (!barberia?.id) return
    fetch(`${API}/public/citas-barberia/${barberia.id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCitas(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [barberia?.id])

  /* Filtro periodo */
  const citasPeriodo = useMemo(() => {
    const ahora = new Date()
    if (periodo === "semana") {
      const inicio = new Date(ahora); inicio.setDate(ahora.getDate() - 6); inicio.setHours(0,0,0,0)
      return citas.filter(c => toLocalDate(c.fechaInicio) >= inicio)
    }
    if (periodo === "mes") {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0)
      return citas.filter(c => toLocalDate(c.fechaInicio) >= inicio)
    }
    return [...citas]
  }, [citas, periodo])

  /* Stats globales */
  const ahora       = new Date()
  const hoyStr      = toLocalDateStr(ahora)
  const lunes       = new Date(ahora); lunes.setDate(ahora.getDate() - ahora.getDay() + 1); lunes.setHours(0,0,0,0)
  const domingo     = new Date(lunes); domingo.setDate(lunes.getDate() + 6); domingo.setHours(23,59,59,999)
  const citasHoy    = citas.filter(c => toLocalDateStr(toLocalDate(c.fechaInicio)) === hoyStr)
  const citasSemana = citas.filter(c => { const f = toLocalDate(c.fechaInicio); return f >= lunes && f <= domingo })
  const pendientes  = citas.filter(c => c.estado === "pendiente")

  /* Métricas periodo */
  const completadas = citasPeriodo.filter(c => c.estado === "completada")
  const canceladas  = citasPeriodo.filter(c => c.estado === "cancelada")
  const confirmadas = citasPeriodo.filter(c => c.estado === "confirmada")
  const total       = citasPeriodo.length

  const ingresos  = completadas.reduce((s, c) => s + parseFloat(c.precio || 0), 0)
  const perdido   = canceladas.reduce((s, c)  => s + parseFloat(c.precio || 0), 0)
  const porCobrar = confirmadas.reduce((s, c) => s + parseFloat(c.precio || 0), 0)

  const servicioTop = useMemo(() => {
    const cnt = {}
    citasPeriodo.forEach(c => { if (c.servicio_desc) cnt[c.servicio_desc] = (cnt[c.servicio_desc] || 0) + 1 })
    return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0] || null
  }, [citasPeriodo])

  const hora   = ahora.getHours()
  const saludo = hora < 12 ? "¡Buenos días" : hora < 19 ? "¡Buenas tardes" : "¡Buenas noches"

  const quickCards = [
    { id:"citas",     icon:"fa-calendar-alt", label:"Gestión de Citas", desc:"Agenda, revisa y administra todas las citas",
      color:"#9b30d9", badge: pendientes.length > 0 ? `${pendientes.length} pendientes` : null, badgeColor:"#f59e0b" },
    { id:"negocio",   icon:"fa-store",        label:"Mi Negocio",       desc:"Servicios, horarios y días laborales",      color:"#4a0080", badge:null },
    { id:"productos", icon:"fa-box-open",     label:"Productos",        desc:"Inventario y catálogo de productos",        color:"#6366f1", badge:null },
  ]

  const PERIODOS = [
    { val:"semana", label:"Últ. 7 días" },
    { val:"mes",    label:"Este mes"    },
    { val:"todo",   label:"Todo"        },
  ]

  return (
    <div className="home-root">

      {/* Bienvenida */}
      <div className="home-welcome-banner">
        <div className="hw-left">
          <h2 className="hw-greeting">{saludo}, <span>{barberia?.nombre_encargado || "Encargado"}</span>! 👋</h2>
          <p className="hw-sub">{barberia?.nombre || "Tu barbería"} — Panel de control</p>
        </div>
        <div className="hw-date">
          <i className="fas fa-calendar" />
          {ahora.toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" })}
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="home-stats-row">
        <div className="hs-card"><i className="fas fa-calendar-day" /><div>
          <span className="hs-num">{loading ? "—" : citasHoy.length}</span>
          <span className="hs-label">Citas hoy</span>
        </div></div>
        <div className="hs-card"><i className="fas fa-calendar-week" /><div>
          <span className="hs-num">{loading ? "—" : citasSemana.length}</span>
          <span className="hs-label">Esta semana</span>
        </div></div>
        <div className="hs-card warning"><i className="fas fa-clock" /><div>
          <span className="hs-num">{loading ? "—" : pendientes.length}</span>
          <span className="hs-label">Pendientes</span>
        </div></div>
        <div className="hs-card total"><i className="fas fa-chart-bar" /><div>
          <span className="hs-num">{loading ? "—" : citas.length}</span>
          <span className="hs-label">Total citas</span>
        </div></div>
      </div>

      {/* Métricas */}
      <div className="home-section-title">
        <i className="fas fa-chart-line" /> Métricas
        <div className="hm-periodo">
          {PERIODOS.map(p => (
            <button key={p.val}
              className={`hm-periodo-btn ${periodo === p.val ? "activo" : ""}`}
              onClick={() => setPeriodo(p.val)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="hm-loading"><i className="fas fa-spinner fa-spin" /> Cargando...</div>
      ) : total === 0 ? (
        <div className="hm-empty"><i className="fas fa-chart-bar" /><p>Sin citas en este periodo.</p></div>
      ) : (
        <div className="hm-metricas">
          <button className="hm-card hm-card--green" onClick={() => setDetallePanel("ingresos")}>
            <div className="hm-card-icon"><i className="fas fa-dollar-sign" /></div>
            <div className="hm-card-body">
              <span className="hm-card-label">Ingresos generados</span>
              <span className="hm-card-val">{fmt(ingresos)}</span>
              <span className="hm-card-sub">{completadas.length} completada{completadas.length!==1?"s":""}</span>
              <BarProgress value={pct(completadas.length, total)} color="#10b981" />
              <span className="hm-bar-label">{pct(completadas.length, total)}% · <span className="hm-ver-mas">Ver detalle →</span></span>
            </div>
          </button>

          <button className="hm-card hm-card--red" onClick={() => setDetallePanel("perdido")}>
            <div className="hm-card-icon"><i className="fas fa-ban" /></div>
            <div className="hm-card-body">
              <span className="hm-card-label">Ingresos perdidos</span>
              <span className="hm-card-val">{fmt(perdido)}</span>
              <span className="hm-card-sub">{canceladas.length} cancelada{canceladas.length!==1?"s":""}</span>
              <BarProgress value={pct(canceladas.length, total)} color="#ef4444" />
              <span className="hm-bar-label">{pct(canceladas.length, total)}% · <span className="hm-ver-mas">Ver detalle →</span></span>
            </div>
          </button>

          <button className="hm-card hm-card--purple" onClick={() => setDetallePanel("cobrar")}>
            <div className="hm-card-icon"><i className="fas fa-hourglass-half" /></div>
            <div className="hm-card-body">
              <span className="hm-card-label">Por cobrar</span>
              <span className="hm-card-val">{fmt(porCobrar)}</span>
              <span className="hm-card-sub">{confirmadas.length} confirmada{confirmadas.length!==1?"s":""}</span>
              <BarProgress value={pct(confirmadas.length, total)} color="#9b30d9" />
              <span className="hm-bar-label">{pct(confirmadas.length, total)}% · <span className="hm-ver-mas">Ver detalle →</span></span>
            </div>
          </button>

          {servicioTop && (
            <button className="hm-card hm-card--amber" onClick={() => setDetallePanel("servicios")}>
              <div className="hm-card-icon"><i className="fas fa-star" /></div>
              <div className="hm-card-body">
                <span className="hm-card-label">Servicio más solicitado</span>
                <span className="hm-card-val hm-card-val--sm">{servicioTop[0]}</span>
                <span className="hm-card-sub">{servicioTop[1]} solicitud{servicioTop[1]!==1?"es":""}</span>
                <BarProgress value={pct(servicioTop[1], total)} color="#f59e0b" />
                <span className="hm-bar-label">{pct(servicioTop[1], total)}% · <span className="hm-ver-mas">Ver todos →</span></span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="home-section-title" style={{ marginTop: 4 }}>
        <i className="fas fa-th-large" /> Accesos rápidos
      </div>
      <div className="home-quick-cards">
        {quickCards.map(card => (
          <button key={card.id} className="hq-card" onClick={() => onNavigate(card.id)} style={{"--cc": card.color}}>
            <div className="hq-icon"><i className={`fas ${card.icon}`} /></div>
            <div className="hq-info">
              <span className="hq-label">{card.label}</span>
              <span className="hq-desc">{card.desc}</span>
            </div>
            {card.badge && (
              <span className="hq-badge" style={{ background: card.badgeColor+"22", color: card.badgeColor, border: `1px solid ${card.badgeColor}44` }}>
                {card.badge}
              </span>
            )}
            <i className="fas fa-chevron-right hq-arrow" />
          </button>
        ))}
      </div>

      {/* Panel detalle */}
      {detallePanel && (
        <PanelDetalle
          tipo={detallePanel}
          citasPeriodo={citasPeriodo}
          periodo={periodo}
          onClose={() => setDetallePanel(null)}
        />
      )}
    </div>
  )
}

/* ─── Dashboard wrapper ───────────────────────────────────────── */
export default function Dashboard({ barberia, onLogout, onUpdate }) {
  const navigate = useNavigate()
  const location = useLocation()
  const segmento = location.pathname.split("/")[2] || "home"
  const setVista = (v) => navigate(v === "home" ? "/dashboard" : `/dashboard/${v}`)

  return (
    <div className="dashboard-container">
      <Header barberia={barberia} onLogout={onLogout} vista={segmento} setVista={setVista} onUpdate={onUpdate} />
      <main className="main-content" style={segmento === "citas" ? { padding: 0 } : {}}>
        <Routes>
          <Route path="/"          element={<HomeDashboard barberia={barberia} onNavigate={setVista} />} />
          <Route path="/citas"     element={<Citas     barberia={barberia} />} />
          <Route path="/negocio"   element={<Negocio   barberia={barberia} />} />
          <Route path="/productos" element={<Productos barberia={barberia} />} />
          <Route path="*"          element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      {segmento === "home" && <Footer />}
    </div>
  )
}