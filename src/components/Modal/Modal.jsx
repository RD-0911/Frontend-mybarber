import { useEffect } from 'react'
import './Modal.css'

/**
 * Modal reutilizable
 * Props:
 *  - title      : string  — título del modal
 *  - icon       : string  — clase FontAwesome sin "fas " (ej: "fa-calendar-plus")
 *  - onClose    : fn      — cierra el modal
 *  - footer     : node    — botones del footer (opcional)
 *  - size       : "sm" | "md" | "lg" | "xl"  (default: "md")
 *  - danger     : bool    — cambia el header a rojo (para confirmar eliminar)
 *  - children   : node    — contenido del body
 */
export default function Modal({
  title,
  icon,
  onClose,
  footer,
  size = 'md',
  danger = false,
  children,
}) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    // Bloquear scroll del body mientras el modal está abierto
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="m-overlay" onClick={onClose}>
      <div
        className={`m-box m-box--${size}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* ── Header ── */}
        <div className={`m-header ${danger ? 'm-header--danger' : ''}`}>
          <div className="m-header-left">
            {icon && (
              <div className="m-header-icon">
                <i className={`fas ${icon}`} />
              </div>
            )}
            <h2 className="m-title">{title}</h2>
          </div>
          <button className="m-close" onClick={onClose} aria-label="Cerrar">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="m-body">
          {children}
        </div>

        {/* ── Footer ── */}
        {footer && (
          <div className="m-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}