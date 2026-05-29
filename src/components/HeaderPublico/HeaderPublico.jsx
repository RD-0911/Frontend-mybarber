import './HeaderPublico.css'

/**
 * Header reutilizable para páginas públicas (CitaPublica y Catalogo)
 * Props:
 *   barberia    — objeto con nombre, direccion, telefono
 *   badge       — texto del badge derecho (ej: "Reserva tu cita")
 *   badgeIcon   — clase de icono FontAwesome (ej: "fa-calendar-check")
 *   badgeLink   — si se pasa, el badge se convierte en enlace
 *   stats       — array de { n, label, color? } para mostrar chips de estadísticas
 */
export default function HeaderPublico({ barberia, badge, badgeIcon, badgeLink, stats }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    (barberia?.nombre || '') + ' ' + (barberia?.direccion || '')
  )}`

  return (
    <header className="hp-header">
      <div className="hp-inner">

        {/* Brand */}
        <div className="hp-brand">
          <div className="hp-brand-icon">
            <i className="fas fa-cut" />
          </div>
          <div className="hp-brand-info">
            <h1 className="hp-nombre">{barberia?.nombre || 'MyBarber'}</h1>
            {barberia?.direccion && (
              <a
                className="hp-dir"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-map-marker-alt" />
                {barberia.direccion}
                <i className="fas fa-external-link-alt hp-dir-ext" />
              </a>
            )}
          </div>
        </div>

        {/* Stats chips (opcionales) */}
        {stats && stats.length > 0 && (
          <div className="hp-stats">
            {stats.map((s, i) => (
              <div key={i} className="hp-stat">
                <span className="hp-stat-n" style={s.color ? { color: s.color } : {}}>{s.n}</span>
                <span className="hp-stat-l">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Badge derecho */}
        {badge && (
          badgeLink
            ? (
              <a href={badgeLink} target="_blank" rel="noopener noreferrer" className="hp-badge">
                {badgeIcon && <i className={`fas ${badgeIcon}`} />}
                <span>{badge}</span>
              </a>
            )
            : (
              <div className="hp-badge">
                {badgeIcon && <i className={`fas ${badgeIcon}`} />}
                <span>{badge}</span>
              </div>
            )
        )}
      </div>
    </header>
  )
}