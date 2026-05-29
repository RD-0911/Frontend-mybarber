export const API = import.meta.env.VITE_API_URL || "http://localhost:5000"

// Keys de almacenamiento por tipo de sesión
const KEYS = {
  barberia: { access: "token",        refresh: "refreshToken",        data: "barberia"   },
  barbero:  { access: "barberoToken", refresh: "barberoRefreshToken", data: "barberoData" },
  admin:    { access: "adminToken",   refresh: "adminRefreshToken",   data: "adminData"   },
}

let _csrfToken=null;

export async function obtenerCsrfToken() {
  if (_csrfToken) return _csrfToken
  try {
    const res  = await fetch(`${API}/auth/csrf-token`, { credentials: "include" })
    const data = await res.json()
    _csrfToken = data.csrfToken
    return _csrfToken
  } catch (_) {
    console.error("No se pudo obtener token CSRF")
    return null
  }
}

export function inicializarCsrf() {
  obtenerCsrfToken()
}

// Callbacks de logout registrados por App.jsx
const _onLogout = {}

export function registrarLogout(tipo, fn) {
  _onLogout[tipo] = fn
}

// ── Helpers de token ──────────────────────────────────────────────

export function authHeaders(tipo = "barberia") {
  const token = sessionStorage.getItem(KEYS[tipo]?.access || "token") || ""
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  }
}

// ── Intento de renovación silenciosa ──────────────────────────────

// async function tryRefresh(tipo) {
//   const keys = KEYS[tipo]
//   const refreshToken = localStorage.getItem(keys.refresh)
//   if (!refreshToken) return false

//   try {
//     const res = await fetch(`${API}/auth/refresh`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ refreshToken }),
//       credentials: "include"
//     })

//     if (!res.ok) {

//       const data = await res.json().catch(() => ({}))

//       // Si se detecta una sesión robada, se limpia todo y se manda el aviso
//       if (data.codigo === "SESSION_HIJACK") {
//         localStorage.clear()
//         sessionStorage.clear()
//         alert("Tu sesión fue cerrada porque se detectó actividad sospechosa. Por favor inicia sesión de nuevo.")
//         window.location.href = "/login"
//         return false
//       }

//       localStorage.removeItem(keys.refresh)
//       if (_onLogout[tipo]) _onLogout[tipo]()
//       return false
//     }

//     const data = await res.json()
//     sessionStorage.setItem(keys.access, data.accessToken)
//     if (data.user) sessionStorage.setItem(keys.data, JSON.stringify(data.user))
//     return true
//   } catch (_) {
//     return false
//   }
// }

async function tryRefresh(tipo) {
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ tipo }),  // ya no envía el token, solo el tipo
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))

      if (data.codigo === "SESSION_HIJACK") {
        localStorage.clear()
        sessionStorage.clear()
        alert("Tu sesión fue cerrada porque se detectó actividad sospechosa. Por favor inicia sesión de nuevo.")
        window.location.href = "/login"
        return false
      }

      if (_onLogout[tipo]) _onLogout[tipo]()
      return false
    }

    const data = await res.json()
    sessionStorage.setItem(KEYS[tipo].access, data.accessToken)
    if (data.user) sessionStorage.setItem(KEYS[tipo].data, JSON.stringify(data.user))
    return true
  } catch (_) {
    return false
  }
}

// ── Cliente HTTP con auto-refresh en 401 ──────────────────────────
// Uso: apiFetch("/barberia/1/servicios", { method: "GET" }, "barberia")
// Firma igual que fetch, pero path relativo a la API base.

const UNSAFE_METHODS = ["POST", "PUT", "PATCH", "DELETE"]

export async function apiFetch(path, options = {}, tipo = "barberia") {
  const keys = KEYS[tipo]

  const buildHeaders = async () => {
    const token = sessionStorage.getItem(keys.access) || ""
    const base  = { Authorization: `Bearer ${token}` }
    if (!(options.body instanceof FormData)) {
      base["Content-Type"] = "application/json"
    }

    // Adjuntar CSRF solo en métodos que mutan estado
    if (UNSAFE_METHODS.includes((options.method || "GET").toUpperCase())) {
      const csrf = await obtenerCsrfToken()
      if (csrf) base["X-CSRF-Token"] = csrf
    }

    return { ...base, ...options.headers }
  }

  let res = await fetch(`${API}${path}`, { ...options, headers: await buildHeaders(), credentials: "include", })

  if (res.status === 401) {
    const renovado = await tryRefresh(tipo)
    if (renovado) {
      res = await fetch(`${API}${path}`, { ...options, headers: await buildHeaders(), credentials: "include" })
    }
  }

  // Si el servidor rechaza el CSRF (token expiró), lo renueva y reintenta una vez
  if (res.status === 403) {
    const body = await res.clone().json().catch(() => ({}))
    if (body?.error?.includes("CSRF")) {
      _csrfToken = null
      const csrf = await obtenerCsrfToken()
      if (csrf) {
        res = await fetch(`${API}${path}`, {
          ...options,
          credentials: "include",
          headers: await buildHeaders(),
        })
      }
    }
  }

  return res
}
