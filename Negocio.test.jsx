import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Negocio from './Negocio';

// 1. Mocks de entorno
global.fetch = vi.fn();

const mockBarberia = { id: 'barberia_123', nombre: 'Alchemist Studio' };

describe('Componente Negocio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn().mockReturnValue('fake-token'),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe navegar entre pestañas correctamente', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // Servicios
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // Horario

    await act(async () => {
      render(<Negocio barberia={mockBarberia} />);
    });

    expect(screen.getByRole('button', { name: /servicios & paquetes/i })).toHaveClass('active');

    const tabHorario = screen.getByRole('button', { name: /horario/i });
    await act(async () => {
      fireEvent.click(tabHorario);
    });

    expect(tabHorario).toHaveClass('active');
    expect(await screen.findByText(/días laborales/i)).toBeInTheDocument();

    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // Barberos
    const tabPersonal = screen.getByRole('button', { name: /personal/i });
    await act(async () => {
      fireEvent.click(tabPersonal);
    });

    expect(tabPersonal).toHaveClass('active');
  });

  it('debe abrir el modal de servicios y validar campos', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await act(async () => {
      render(<Negocio barberia={mockBarberia} />);
    });

    const btnAgregar = await screen.findByRole('button', { name: /^agregar$/i });
    fireEvent.click(btnAgregar);

    expect(screen.getByText(/nuevo registro/i)).toBeInTheDocument();

    const btnGuardar = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(btnGuardar);

    expect(await screen.findByText(/nombre, precio y duración son requeridos/i)).toBeInTheDocument();
  });

  it('debe permitir crear un nuevo paquete correctamente', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); 
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }); 
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); 

    await act(async () => {
      render(<Negocio barberia={mockBarberia} />);
    });

    fireEvent.click(await screen.findByRole('button', { name: /^agregar$/i }));

    const btnPaquete = document.querySelector('.tipo-btn.paquete');
    fireEvent.click(btnPaquete);

    // Llenar Nombre
    fireEvent.change(screen.getByPlaceholderText(/ej: paquete vip/i), {
      target: { value: 'Combo Alquimista' }
    });

    // SOLUCIÓN: Buscar el textarea por su etiqueta (label) o por una función de coincidencia parcial
    const textarea = screen.getByPlaceholderText((text) => text.includes('Corte clásico'));
    fireEvent.change(textarea, {
      target: { value: 'Corte\nBarba\nBebida' }
    });

    // Llenar Precio
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '500' }
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/servicios'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"tipo":"paquete"')
        })
      );
    });
  });

  it('debe mostrar el "bloqueo en agenda" correcto según la duración', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    
    await act(async () => {
      render(<Negocio barberia={mockBarberia} />);
    });
    
    fireEvent.click(await screen.findByRole('button', { name: /^agregar$/i }));

    const selectDuracion = screen.getByRole('combobox');
    fireEvent.change(selectDuracion, { target: { value: '45' } });

    expect(screen.getByText(/bloquea 1 hora en la agenda/i)).toBeInTheDocument();
  });
});