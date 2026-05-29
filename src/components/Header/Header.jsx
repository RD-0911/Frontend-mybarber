import './Header.css'
import { useState, useRef, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || "http://localhost:5000"
function authHeaders() {
  const token = sessionStorage.getItem("token") || ""
  return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
}

// ── URL completa de la foto ──────────────────────────────────────
function fotoUrl(ruta) {
  if (!ruta) return null
  if (ruta.startsWith('http')) return ruta
  return `${API}${ruta}`
}

// ── Avatar ───────────────────────────────────────────────────────
function Avatar({ barberia, size = 36 }) {
  const iniciales = [
    barberia?.nombre_encargado?.charAt(0),
    barberia?.nombre?.charAt(0)
  ].filter(Boolean).join('').toUpperCase().slice(0, 2) || 'MB'

  const foto = fotoUrl(barberia?.foto_perfil)
  const [imgError, setImgError] = useState(false)
  const mostrarFoto = foto && !imgError

  // Si cambia la foto, resetear el error
  useEffect(() => { setImgError(false) }, [foto])

  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {mostrarFoto && (
        <img
          src={foto}
          alt=""
          className="avatar-img"
          onError={() => setImgError(true)}
        />
      )}
      {!mostrarFoto && (
        <span className="avatar-iniciales" style={{ fontSize: size * 0.35 }}>{iniciales}</span>
      )}
    </div>
  )
}

// ── Panel de Configuración ───────────────────────────────────────
function PanelCuenta({ barberia, onClose, onLogout, onUpdate }) {
  const [tab, setTab]       = useState('info')
  const [form, setForm]     = useState({
    nombre:           barberia?.nombre           || '',
    direccion:        barberia?.direccion         || '',
    nombre_encargado: barberia?.nombre_encargado  || '',
    telefono:         barberia?.telefono          || '',
    correo:           barberia?.correo            || '',
  })
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' })
  // tieneContrasena se guarda en sessionStorage al hacer login con Google
  const tieneContrasena = sessionStorage.getItem('tieneContrasena') !== '0' 
  const [saving, setSaving]     = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [msg, setMsg]           = useState(null)
  const [showPass, setShowPass] = useState({ actual: false, nueva: false, confirmar: false })
  const fileRef = useRef(null)

  function mostrarMsg(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  // ── Subir foto al servidor ───────────────────────────────────
  async function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { mostrarMsg('error', 'La imagen no debe superar 3MB'); return }

    setUploadingFoto(true)
    try {
      const formData = new FormData()
      formData.append('foto', file)

      const res = await fetch(`${API}/barberia/${barberia.id}/foto`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir')

      mostrarMsg('ok', '¡Foto actualizada!')
      onUpdate && onUpdate({ ...barberia, foto_perfil: data.foto_perfil })
    } catch (e) {
      mostrarMsg('error', e.message)
    }
    setUploadingFoto(false)
    // Limpiar input para poder subir la misma foto de nuevo
    e.target.value = ''
  }

  // ── Quitar foto ──────────────────────────────────────────────
  async function quitarFoto() {
    try {
      const res = await fetch(`${API}/barberia/${barberia.id}/foto`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      mostrarMsg('ok', 'Foto eliminada')
      onUpdate && onUpdate({ ...barberia, foto_perfil: null })
    } catch (e) {
      mostrarMsg('error', e.message)
    }
  }

  // ── Guardar info ─────────────────────────────────────────────
  async function guardarInfo() {
    if (!form.nombre || !form.nombre_encargado || !form.telefono || !form.correo) {
      mostrarMsg('error', 'Todos los campos son obligatorios'); return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API}/barberia/${barberia.id}/perfil`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      mostrarMsg('ok', '¡Datos actualizados correctamente!')
      onUpdate && onUpdate({ ...barberia, ...form })
    } catch (e) {
      mostrarMsg('error', e.message)
    }
    setSaving(false)
  }

  // ── Añadir contraseña (cuenta Google sin password) ───────────
  async function anadirPassword() {
    if (!passForm.nueva || !passForm.confirmar) {
      mostrarMsg('error', 'Completa todos los campos'); return
    }
    if (passForm.nueva !== passForm.confirmar) {
      mostrarMsg('error', 'Las contraseñas no coinciden'); return
    }
    if (passForm.nueva.length < 8) {
      mostrarMsg('error', 'Mínimo 8 caracteres'); return
    }
    setSaving(true)
    try {
      const token = sessionStorage.getItem('token') || ''
      const res = await fetch(`${API}/auth/add-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ nueva: passForm.nueva })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      mostrarMsg('ok', '¡Contraseña añadida! Ahora puedes entrar con correo y contraseña.')
      setPassForm({ actual: '', nueva: '', confirmar: '' })
      // actualizar el flag para que el panel muestre ahora "cambiar contraseña"
      sessionStorage.setItem('tieneContrasena', '1')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      mostrarMsg('error', e.message)
    }
    setSaving(false)
  }

  // ── Cambiar contraseña ───────────────────────────────────────
  async function cambiarPassword() {
    if (!passForm.actual || !passForm.nueva || !passForm.confirmar) {
      mostrarMsg('error', 'Completa todos los campos'); return
    }
    if (passForm.nueva !== passForm.confirmar) {
      mostrarMsg('error', 'Las contraseñas nuevas no coinciden'); return
    }
    if (passForm.nueva.length < 8) {
      mostrarMsg('error', 'Mínimo 8 caracteres'); return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API}/barberia/${barberia.id}/password`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ actual: passForm.actual, nueva: passForm.nueva })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      mostrarMsg('ok', '¡Contraseña actualizada!')
      setPassForm({ actual: '', nueva: '', confirmar: '' })
    } catch (e) {
      mostrarMsg('error', e.message)
    }
    setSaving(false)
  }

  const foto = fotoUrl(barberia?.foto_perfil)

  return (
    <>
      <div className="panel-backdrop" onClick={onClose} />
      <div className="panel-cuenta">

        {/* ── Header del panel ── */}
        <div className="panel-header">
          <div className="panel-header-top">
            <span className="panel-titulo"><i className="fas fa-user-circle" /> Mi cuenta</span>
            <button className="panel-close" onClick={onClose}><i className="fas fa-times" /></button>
          </div>

          {/* Foto + info */}
          <div className="panel-perfil">
            <div className="panel-avatar-wrap">
              <Avatar barberia={barberia} size={72} />

              {/* Botón cámara */}
              <button
                className={`avatar-edit-btn ${uploadingFoto ? 'loading' : ''}`}
                onClick={() => !uploadingFoto && fileRef.current?.click()}
                title="Cambiar foto"
              >
                {uploadingFoto
                  ? <i className="fas fa-spinner fa-spin" />
                  : <i className="fas fa-camera" />
                }
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display:'none' }} onChange={handleFoto} />
            </div>

            <div className="panel-perfil-info">
              <span className="pp-nombre">{barberia?.nombre_encargado || 'Encargado'}</span>
              <span className="pp-negocio"><i className="fas fa-store" /> {barberia?.nombre || 'Mi Barbería'}</span>
              <span className="pp-correo"><i className="fas fa-envelope" /> {barberia?.correo || ''}</span>
            </div>

            {foto && (
              <button className="btn-quitar-foto" onClick={quitarFoto} title="Quitar foto">
                <i className="fas fa-trash-alt" />
              </button>
            )}
          </div>

          {/* Hint de foto */}
          <p className="foto-hint">
            <i className="fas fa-camera" /> Toca el ícono de cámara · JPG, PNG o WEBP · Max 3MB
          </p>

          {/* Tabs */}
          <div className="panel-tabs">
            {[
              { id: 'info', icon: 'fa-store',    label: 'Negocio'    },
              { id: 'pass', icon: 'fa-lock',      label: 'Contraseña' },
            ].map(t => (
              <button key={t.id} className={`ptab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                <i className={`fas ${t.icon}`} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Mensaje flash ── */}
        {msg && (
          <div className={`panel-msg ${msg.type}`}>
            <i className={`fas ${msg.type === 'ok' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
            {msg.text}
          </div>
        )}

        {/* ── Cuerpo ── */}
        <div className="panel-body">

          {/* TAB: Info */}
          {tab === 'info' && (
            <div className="panel-form">
              <div className="pf-section-label"><i className="fas fa-store" /> Datos del negocio</div>
              <div className="pf-group">
                <label>Nombre del negocio</label>
                <input value={form.nombre}
                  onChange={e => setForm({...form, nombre: e.target.value})}
                  placeholder="Ej: Barber Shop La Colonia" />
              </div>
              <div className="pf-group">
                <label>Dirección</label>
                <input value={form.direccion}
                  onChange={e => setForm({...form, direccion: e.target.value})}
                  placeholder="Calle, colonia, ciudad" />
              </div>
              <div className="pf-group">
                <label>Teléfono</label>
                <input type="tel" value={form.telefono}
                  onChange={e => setForm({...form, telefono: e.target.value})}
                  placeholder="312 000 0000" />
              </div>

              <div className="pf-section-label"><i className="fas fa-user-tie" /> Encargado</div>
              <div className="pf-group">
                <label>Nombre del encargado</label>
                <input value={form.nombre_encargado}
                  onChange={e => setForm({...form, nombre_encargado: e.target.value})}
                  placeholder="Tu nombre completo" />
              </div>
              <div className="pf-group">
                <label>Correo electrónico</label>
                <input type="email" value={form.correo}
                  onChange={e => setForm({...form, correo: e.target.value})}
                  placeholder="correo@ejemplo.com" />
              </div>

              <button className="btn-panel-save" onClick={guardarInfo} disabled={saving}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                  : <><i className="fas fa-check" /> Guardar cambios</>}
              </button>
            </div>
          )}

          {/* TAB: Contraseña */}
          {tab === 'pass' && (
            <div className="panel-form">
              {!tieneContrasena ? (
                <div className="pf-google-aviso">
                  <i className="fab fa-google" />
                  <div>
                    <strong>Tu cuenta usa Google</strong>
                    <p>Si quieres, puedes añadir también una contraseña para poder entrar con correo + password además de Google.</p>
                  </div>
                </div>
              ) : null}

              <div className="pf-section-label">
                <i className="fas fa-lock" />
                {tieneContrasena ? ' Cambiar contraseña' : ' Añadir contraseña'}
              </div>

              {(tieneContrasena
                ? [
                    { key: 'actual',    label: 'Contraseña actual',          placeholder: 'Tu contraseña actual' },
                    { key: 'nueva',     label: 'Nueva contraseña',           placeholder: 'Mínimo 8 caracteres' },
                    { key: 'confirmar', label: 'Confirmar nueva contraseña', placeholder: 'Repite la nueva contraseña' },
                  ]
                : [
                    { key: 'nueva',     label: 'Nueva contraseña',           placeholder: 'Mínimo 8 caracteres' },
                    { key: 'confirmar', label: 'Confirmar nueva contraseña', placeholder: 'Repite la nueva contraseña' },
                  ]
              ).map(f => (
                <div className="pf-group" key={f.key}>
                  <label>{f.label}</label>
                  <div className="pf-input-wrap">
                    <input
                      type={showPass[f.key] ? 'text' : 'password'}
                      value={passForm[f.key]}
                      onChange={e => setPassForm({...passForm, [f.key]: e.target.value})}
                      placeholder={f.placeholder}
                    />
                    <button type="button" className="toggle-pass"
                      onClick={() => setShowPass(s => ({...s, [f.key]: !s[f.key]}))}>
                      <i className={`fas ${showPass[f.key] ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Validaciones en vivo */}
              {passForm.nueva.length > 0 && passForm.nueva.length < 8 && (
                <p className="pf-warn"><i className="fas fa-exclamation-triangle" /> Mínimo 8 caracteres</p>
              )}
              {passForm.nueva && passForm.confirmar && passForm.nueva !== passForm.confirmar && (
                <p className="pf-warn"><i className="fas fa-exclamation-triangle" /> Las contraseñas no coinciden</p>
              )}
              {passForm.nueva && passForm.confirmar && passForm.nueva === passForm.confirmar && passForm.nueva.length >= 8 && (
                <p className="pf-ok"><i className="fas fa-check-circle" /> Las contraseñas coinciden</p>
              )}

              <button
                className="btn-panel-save"
                onClick={tieneContrasena ? cambiarPassword : anadirPassword}
                disabled={saving}
              >
                {saving
                  ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                  : <><i className="fas fa-key" /> {tieneContrasena ? 'Cambiar contraseña' : 'Añadir contraseña'}</>}
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="panel-footer">
          <button className="btn-panel-logout" onClick={() => { onClose(); onLogout() }}>
            <i className="fas fa-sign-out-alt" /> Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}

// ── Header principal ─────────────────────────────────────────────
export default function Header({ barberia, onLogout, vista, setVista, onUpdate }) {
  const [hoveredItem,   setHoveredItem]   = useState(null)
  const [panelOpen,     setPanelOpen]     = useState(false)
  const [fotoPerfil,    setFotoPerfil]    = useState(barberia?.foto_perfil || null)
  const [pendientes,    setPendientes]    = useState(0)
  const [notifVisto,    setNotifVisto]    = useState(false)
  const prevPendientes = useRef(0)

  // Polling ligero — solo cuenta pendientes, sin recargar todo
  useEffect(() => {
    if (!barberia?.id) return
    async function checkPendientes() {
      try {
        const r = await fetch(`${API}/public/citas-barberia/${barberia.id}`, { headers: authHeaders() })
        const data = await r.json()
        if (!Array.isArray(data)) return
        const n = data.filter(c => c.estado === 'pendiente').length
        if (n > prevPendientes.current) setNotifVisto(false) // llegó cita nueva
        prevPendientes.current = n
        setPendientes(n)
      } catch (_) {}
    }
    checkPendientes()
    const timer = setInterval(checkPendientes, 30000)
    return () => clearInterval(timer)
  }, [barberia?.id])

  // Sincronizar si el prop cambia desde afuera
  useEffect(() => {
    setFotoPerfil(barberia?.foto_perfil || null)
  }, [barberia?.foto_perfil])

  // Wrapper: actualiza foto local inmediatamente Y notifica al padre
  function handleUpdate(nuevosDatos) {
    if (nuevosDatos.foto_perfil !== undefined) setFotoPerfil(nuevosDatos.foto_perfil)
    onUpdate && onUpdate(nuevosDatos)
  }

  const navItems = [
    { id: 'productos', label: 'Productos',  icon: 'fa-box-open'     },
    { id: 'citas',     label: 'Citas',      icon: 'fa-calendar-alt' },
    { id: 'negocio',   label: 'Mi negocio', icon: 'fa-store'        },
  ]

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setPanelOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Barberia con foto local para que el avatar se actualice al instante
  const barberiaConFoto = { ...barberia, foto_perfil: fotoPerfil }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <div className="brand" onClick={() => setVista('home')}>
            <i className="fas fa-cut brand-icon" />
            MyBarber
          </div>

          <div className="nav-links">
            {navItems.map((item) => {
              const isActive  = vista === item.id
              const isHovered = hoveredItem === item.id
              return (
                <button key={item.id}
                  className={`nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setVista(item.id)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <span className={`nav-btn-icon ${isHovered || isActive ? 'visible' : ''}`}>
                    <i className={`fas ${item.icon}`} />
                  </span>
                  <span className={`nav-btn-label ${isHovered || isActive ? 'hidden' : ''}`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Boton de cuenta - usa barberiaConFoto para foto instantanea */}
        <div className="navbar-right">
          {/* Campanita de notificaciones */}
          <button
            className={`notif-btn ${pendientes > 0 && !notifVisto ? "has-notif" : ""}`}
            onClick={() => { setNotifVisto(true); setVista("citas") }}
            title={pendientes > 0 ? `${pendientes} cita${pendientes > 1 ? "s" : ""} pendiente${pendientes > 1 ? "s" : ""}` : "Sin pendientes"}
          >
            <i className="fas fa-bell" />
            {pendientes > 0 && !notifVisto && (
              <span className="notif-badge">{pendientes > 9 ? "9+" : pendientes}</span>
            )}
          </button>

          <button className="cuenta-btn" onClick={() => setPanelOpen(true)}>
            <Avatar barberia={barberiaConFoto} size={34} />
            <div className="cuenta-info">
              <span className="cuenta-nombre">{barberia?.nombre_encargado || 'Encargado'}</span>
              <span className="cuenta-negocio">{barberia?.nombre || 'Mi Barberia'}</span>
            </div>
            <i className="fas fa-chevron-down cuenta-chevron" />
          </button>
        </div>
      </nav>

      {panelOpen && (
        <PanelCuenta
          barberia={barberiaConFoto}
          onClose={() => setPanelOpen(false)}
          onLogout={onLogout}
          onUpdate={handleUpdate}
        />
      )}
    </>
  )
}