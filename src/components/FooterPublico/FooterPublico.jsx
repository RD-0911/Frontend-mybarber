import './FooterPublico.css'

/**
 * Footer reutilizable para páginas públicas
 * Props:
 *   telefono  — teléfono del negocio
 *   nombre    — nombre del negocio (opcional)
 */
export default function FooterPublico({ telefono, nombre }) {
  return (
    <footer className="fp-footer">
      <div className="fp-inner">
        <span className="fp-brand">
          <i className="fas fa-cut fp-icon" />
          Powered by <strong>MyBarber</strong>
        </span>
        {(nombre || telefono) && (
          <span className="fp-sep">·</span>
        )}
        {nombre && <span className="fp-negocio">{nombre}</span>}
        {telefono && (
          <a href={`tel:${telefono}`} className="fp-tel">
            <i className="fas fa-phone" /> {telefono}
          </a>
        )}
      </div>
    </footer>
  )
}