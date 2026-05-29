import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './Login';

// 1. MOCK GLOBAL DEL CANVAS
const mockContext = {
  clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(),
  moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), closePath: vi.fn(),
  fillStyle: '', strokeStyle: '', lineWidth: 0,
};
global.HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);
global.requestAnimationFrame = vi.fn();
global.cancelAnimationFrame = vi.fn();

// 2. Mock de fetch
global.fetch = vi.fn();

const renderLogin = () => {
  const onLogin = vi.fn();
  const onBarberoLogin = vi.fn();
  render(
    <GoogleOAuthProvider clientId="123">
      <MemoryRouter>
        <Login onLogin={onLogin} onBarberoLogin={onBarberoLogin} />
      </MemoryRouter>
    </GoogleOAuthProvider>
  );
  return { onLogin, onBarberoLogin };
};

describe('Login Component', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('debe mostrar errores de validación si los campos están vacíos', async () => {
    renderLogin();
    // Seleccionamos el botón de Entrar específicamente dentro del contenedor de Sign In
    const container = document.querySelector('.sign-in-container');
    const botonEntrar = container.querySelector('button[type="submit"]');
    
    fireEvent.click(botonEntrar);

    expect(await screen.findByText(/el correo es obligatorio/i)).toBeInTheDocument();
    expect(await screen.findByText(/la contraseña es obligatoria/i)).toBeInTheDocument();
  });

  it('debe llamar a onLogin cuando el inicio de sesión es exitoso (Barbería)', async () => {
    const { onLogin } = renderLogin();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tipo: 'barberia',
        barberia: { nombre: 'Mi Barbería' },
        token: 'fake-token',
        refreshToken: 'fake-refresh',
        tieneContrasena: true
      }),
    });

    // Usamos selectores precisos para el panel de Login
    const signInPanel = document.querySelector('.sign-in-container');
    const inputCorreo = signInPanel.querySelector('input[type="email"]');
    const inputPass = signInPanel.querySelector('input[type="password"]');
    const botonEntrar = signInPanel.querySelector('button[type="submit"]');

    fireEvent.change(inputCorreo, { target: { value: 'test@correo.com' } });
    fireEvent.change(inputPass, { target: { value: 'Password123' } });

    fireEvent.click(botonEntrar);

    // Esperamos un poco más por la respuesta del fetch simulado
    await waitFor(() => {
      expect(onLogin).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('debe mostrar el modal de recuperación al hacer clic en "¿Olvidaste tu contraseña?"', () => {
    renderLogin();
    const linkRecuperar = screen.getByText(/¿olvidaste tu contraseña\?/i);
    fireEvent.click(linkRecuperar);
    expect(screen.getByText(/ingresa tu correo registrado/i)).toBeInTheDocument();
  });

  it('debe cambiar al panel de registro al hacer clic en Registrarse', () => {
    renderLogin();
    const btnGhost = screen.getByText('Registrarse', { selector: '.overlay-right .ghost' });
    fireEvent.click(btnGhost);
    expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument();
  });
});