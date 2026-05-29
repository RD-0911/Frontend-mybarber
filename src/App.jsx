import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { lazy, Suspense } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Login             from './pages/Login/Login'
import CompletarRegistro from './pages/CompletarRegistro/CompletarRegistro'
import { API, registrarLogout, apiFetch } from './utils/api'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ""

const Dashboard   = lazy(() => import('./pages/Dashboard/Dashboard'))
const CitaPublica = lazy(() => import('./pages/Citapublica/Citapublica'))
const Catalogo    = lazy(() => import('./pages/Catalogo/Catalogo'))
const Admin       = lazy(() => import('./pages/Admin/Admin'))
const AdminLogin  = lazy(() => import('./pages/AdminLogin/AdminLogin'))
const Barbero     = lazy(() => import('./pages/Barbero/Barbero'))

function PageLoader() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', gap:12, color:'#9b30d9', fontFamily:'Jost,sans-serif', fontSize:14 }}>
      <i className="fas fa-spinner fa-spin" /> Cargando...
    </div>
  )
}

function RutaPrivada({ barberia, children }) {
  if (!barberia) return <Navigate to="/login" replace />
  return children
}
function RutaPublica({ barberia, children }) {
  if (barberia) return <Navigate to="/dashboard" replace />
  return children
}
function RutaAdmin({ admin, children }) {
  if (!admin) return <Navigate to="/admin/login" replace />
  return children
}
function RutaBarbero({ barbero, children }) {
  if (!barbero) return <Navigate to="/login" replace />
  return children
}

// ── Maneja el callback de Google OAuth redirect (móvil) ──────────
function GoogleRedirectHandler({ onLogin, onBarberoLogin }) {
  useEffect(() => {
    const params     = new URLSearchParams(window.location.search)
    const credential = params.get('credential')
    if (!credential) return

    window.history.replaceState({}, '', '/login')

    fetch(`${API}/auth/google`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) return

        if (data.needsRegistration) {
          sessionStorage.setItem('registroToken',   data.registroToken)
          sessionStorage.setItem('registroPrefill', JSON.stringify(data.prefill))
          window.location.href = '/completar-registro'
          return
        }

        if (data.tipo === 'barbero') {
          // onBarberoLogin(data.barbero, data.token, data.refreshToken)
          onBarberoLogin(data.barbero, data.token)
          return
        }

        sessionStorage.setItem('tieneContrasena', data.tieneContrasena ? '1' : '0')
        // onLogin(data.barberia, data.token, data.refreshToken)
        onLogin(data.barberia, data.token)
      })
      .catch(() => {})
  }, [])

  return null
}

// ── Leer y validar token en sessionStorage ────────────────────────
function leerSesion(dataKey, tokenKey, tipoEsperado) {
  const saved = sessionStorage.getItem(dataKey)
  const token = sessionStorage.getItem(tokenKey)
  if (!saved || !token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      sessionStorage.removeItem(dataKey)
      sessionStorage.removeItem(tokenKey)
      return null
    }
    if (tipoEsperado && payload.tipo && payload.tipo !== tipoEsperado) return null
  } catch (_) {}
  return JSON.parse(saved)
}

// ── Renovación proactiva del access token ─────────────────────────
async function renovarSiNecesario(tokenKey, refreshKey, setter, logoutFn) {
  const at = sessionStorage.getItem(tokenKey)
  if (!at) return
  try {
    const { exp } = JSON.parse(atob(at.split('.')[1]))
    if ((exp * 1000 - Date.now()) > 5 * 60 * 1000) return // más de 5 min → no hace falta

    // const rt = localStorage.getItem(refreshKey)
    // if (!rt) { logoutFn(); return }

    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo }),
    })
    if (res.ok) {
      const data = await res.json()
      sessionStorage.setItem(tokenKey, data.accessToken)
      if (data.user) sessionStorage.setItem(dataKey, JSON.stringify(data.user))
      setter(data.user)
    } else {
      logoutFn()
    }
    // } else {
    //   localStorage.removeItem(refreshKey)
    //   logoutFn()
    // }
  } catch (_) {}
}

export default function App() {
  // ── Estado de sesiones ────────────────────────────────────────
  const [barberia, setBarberia] = useState(() =>
    leerSesion('barberia', 'token', 'barberia'))

  const [barbero, setBarbero] = useState(() =>
    leerSesion('barberoData', 'barberoToken', 'barbero'))

  const [admin, setAdmin] = useState(() =>
    leerSesion('adminData', 'adminToken', null))

  // true mientras se intenta restaurar sesión desde refresh token
  const [inicializando, setInicializando] = useState(
    //Se elimina && !!localStorage.getItem('refreshToken')) porque ahora se incluye en una cookie
    !sessionStorage.getItem('barberia') ||
    !sessionStorage.getItem('barberoData') ||
    !sessionStorage.getItem('adminData') 
  )

  // ── Restaurar sesión al abrir nueva pestaña / reiniciar ───────
  useEffect(() => {
    async function restaurar() {
      const intentos = []

      if (!barberia) {
        intentos.push(
          apiFetch(`/auth/refresh`, {
            method: 'POST',
            credentials:'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'barberia' }),
          })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
              sessionStorage.setItem('token',    data.accessToken)
              sessionStorage.setItem('barberia', JSON.stringify(data.user))
              setBarberia(data.user)
            })
            .catch(() => localStorage.removeItem('refreshToken'))
        )
      }

      if (!barbero) {
        intentos.push(
          apiFetch(`/auth/refresh`, {
            method: 'POST',
            credentials:'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: "barbero" }),
          })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
              sessionStorage.setItem('barberoToken', data.accessToken)
              sessionStorage.setItem('barberoData',  JSON.stringify(data.user))
              setBarbero(data.user)
            })
            .catch(() => {})
        )
      }

      if (!admin) {
        intentos.push(
          apiFetch(`/auth/refresh`, {
            method: 'POST',
            credentials:'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'admin'}),
          })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
              sessionStorage.setItem('adminToken', data.accessToken)
              sessionStorage.setItem('adminData',  JSON.stringify(data.user))
              setAdmin(data.user)
            })
            .catch(() => {})
        )
      }

      await Promise.allSettled(intentos)
      setInicializando(false)
    }

    restaurar()
  }, []) // solo al montar

  // ── Renovación proactiva (cada 60 s, renueva si expira en < 5 min) ─
  useEffect(() => {
    if (!barberia && !barbero && !admin) return

    // const tick = () => {
    //   if (barberia) renovarSiNecesario('token',       'refreshToken',       setBarberia, handleLogout)
    //   if (barbero)  renovarSiNecesario('barberoToken','barberoRefreshToken', setBarbero,  handleBarberoLogout)
    //   if (admin)    renovarSiNecesario('adminToken',  'adminRefreshToken',   setAdmin,    handleAdminLogout)
    // }
      const tick = () => {
      if (barberia) renovarSiNecesario('token',        'barberia', 'barberia',   setBarberia, handleLogout)
      if (barbero)  renovarSiNecesario('barberoToken', 'barbero',  'barberoData', setBarbero,  handleBarberoLogout)
      if (admin)    renovarSiNecesario('adminToken',   'admin',    'adminData',   setAdmin,    handleAdminLogout)
    }

    const id = setInterval(tick, 60 * 1000)
    return () => clearInterval(id)
  }, [barberia, barbero, admin]) // eslint-disable-line

  // ── Registrar callbacks de logout para apiFetch ───────────────
  useEffect(() => {
    registrarLogout('barberia', handleLogout)
    registrarLogout('barbero',  handleBarberoLogout)
    registrarLogout('admin',    handleAdminLogout)
  }) // sin deps: actualiza en cada render (los handlers son closures estables)

  // ── Sincronizar logout entre pestañas ─────────────────────────
  // El evento "storage" se dispara en las OTRAS pestañas cuando localStorage cambia.
  // Si otra pestaña borra el refreshToken (logout), esta pestaña cierra sesión también.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'refreshToken'       && !e.newValue && barberia) {
        sessionStorage.removeItem('barberia'); sessionStorage.removeItem('token')
        sessionStorage.removeItem('tieneContrasena'); setBarberia(null)
      }
      if (e.key === 'barberoRefreshToken' && !e.newValue && barbero) {
        sessionStorage.removeItem('barberoData'); sessionStorage.removeItem('barberoToken')
        setBarbero(null)
      }
      if (e.key === 'adminRefreshToken'  && !e.newValue && admin) {
        sessionStorage.removeItem('adminData'); sessionStorage.removeItem('adminToken')
        setAdmin(null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [barberia, barbero, admin])

  // ── Handlers de barbería ──────────────────────────────────────
  const handleLogin = (data, token) => {
    sessionStorage.setItem('barberia', JSON.stringify(data))
    if (token)        sessionStorage.setItem('token', token)
    // if (refreshToken) localStorage.setItem('refreshToken', refreshToken) el refresh token ahora viene en la cookie
    setBarberia(data)
  }
  const handleLogout = async () => {
    // const rt = localStorage.getItem('refreshToken')
  
     apiFetch(`/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'barberia'}),
      }, 'barberia').catch(() => {})

    sessionStorage.removeItem('barberia')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('tieneContrasena')
    setBarberia(null)
  }
  
  const handleUpdate = (nuevosDatos) => {
    const actualizado = { ...barberia, ...nuevosDatos }
    sessionStorage.setItem('barberia', JSON.stringify(actualizado))
    setBarberia(actualizado)
  }

  // ── Handlers de barbero ───────────────────────────────────────
  const handleBarberoLogin = (data, token) => {
    sessionStorage.setItem('barberoData',  JSON.stringify(data))
    sessionStorage.setItem('barberoToken', token)
    setBarbero(data)
  }

  const handleBarberoLogout = async () => {
    
      apiFetch(`/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'barbero'}),
      }, 'barbero').catch(() => {})
     
    
    sessionStorage.removeItem('barberoData')
    sessionStorage.removeItem('barberoToken')
    setBarbero(null)
  }

  // ── Handlers de admin ─────────────────────────────────────────
  const handleAdminLogin = (data, token) => {
    sessionStorage.setItem('adminData',  JSON.stringify(data))
    sessionStorage.setItem('adminToken', token)
  }
  const handleAdminLogout = async () => {
      apiFetch(`/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'admin' }),
      }).catch(() => {})
      
    sessionStorage.removeItem('adminData')
    sessionStorage.removeItem('adminToken')
    setAdmin(null)
  }

  if (inicializando) return <PageLoader />

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <GoogleRedirectHandler onLogin={handleLogin} onBarberoLogin={handleBarberoLogin} />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Públicas */}
        <Route path="/cita"     element={<CitaPublica />} />
        <Route path="/catalogo" element={<Catalogo />} />

        {/* Completar registro tras login con Google */}
        <Route path="/completar-registro" element={
          barberia ? <Navigate to="/dashboard" replace /> :
          <CompletarRegistro onLogin={handleLogin} />
        } />

        {/* Admin */}
        <Route path="/admin/login" element={
          admin
            ? <Navigate to="/admin" replace />
            : <AdminLogin onLogin={handleAdminLogin} />
        } />
        <Route path="/admin" element={
          <RutaAdmin admin={admin}>
            <Admin admin={admin} onLogout={handleAdminLogout} />
          </RutaAdmin>
        } />

        {/* Login unificado — barbería y barbero entran aquí */}
        <Route path="/login" element={
          barberia ? <Navigate to="/dashboard" replace /> :
          barbero  ? <Navigate to="/barbero"   replace /> :
          <RutaPublica barberia={barberia}>
            <Login onLogin={handleLogin} onBarberoLogin={handleBarberoLogin} />
          </RutaPublica>
        } />

        {/* Barbería */}
        <Route path="/dashboard/*" element={
          <RutaPrivada barberia={barberia}>
            <Dashboard barberia={barberia} onLogout={handleLogout} onUpdate={handleUpdate} />
          </RutaPrivada>
        } />

        {/* Barbero — su agenda personal */}
        <Route path="/barbero/*" element={
          <RutaBarbero barbero={barbero}>
            <Barbero barbero={barbero} onLogout={handleBarberoLogout} />
          </RutaBarbero>
        } />

        <Route path="/" element={
          barberia ? <Navigate to="/dashboard" replace /> :
          barbero  ? <Navigate to="/barbero"   replace /> :
          <Navigate to="/login" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
