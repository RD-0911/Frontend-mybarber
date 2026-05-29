import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Productos from './Productos';

// 1. Mocks de entorno global
global.fetch = vi.fn();

// Simulación de URL.createObjectURL (necesaria para el manejo de imágenes en JSDOM)
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

// Mock de la barbería (prop requerida por el componente)
const mockBarberia = { id: 'barberia_123', nombre: 'Alchemist Studio' };

describe('Componente Productos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Simulación de sessionStorage para que authHeaders() no falle
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn().mockReturnValue('fake-token'),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe cargar y mostrar la lista de productos al iniciar', async () => {
    // Simulamos respuesta de la API con datos de prueba
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, nombre: 'Pomada Mate', precio: 250, stock: 10, estado: 'disponible', imagen_url: '' },
        { id: 2, nombre: 'Aceite Barba', precio: 180, stock: 5, estado: 'agotado', imagen_url: '' }
      ],
    });

    render(<Productos barberia={mockBarberia} />);

    // Verificamos que el mensaje de carga aparezca inicialmente
    expect(screen.getByText(/cargando productos/i)).toBeInTheDocument();

    // Verificamos que los productos se rendericen correctamente tras la carga
    expect(await screen.findByText('Pomada Mate')).toBeInTheDocument();
    expect(screen.getByText('Aceite Barba')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  it('debe abrir el modal de nuevo producto y validar campos obligatorios', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    render(<Productos barberia={mockBarberia} />);

    // Abrimos el modal de creación
    const btnNuevo = await screen.findByRole('button', { name: /agregar producto/i });
    fireEvent.click(btnNuevo);

    // Intentamos guardar sin llenar el formulario para disparar el error
    const btnGuardar = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(btnGuardar);

    expect(await screen.findByText(/el nombre es obligatorio/i)).toBeInTheDocument();
  });

  it('debe enviar un FormData correcto al crear un producto', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // Carga inicial
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // Guardado exitoso

    render(<Productos barberia={mockBarberia} />);

    fireEvent.click(await screen.findByRole('button', { name: /agregar producto/i }));

    // Llenamos el nombre y precio
    fireEvent.change(screen.getByPlaceholderText(/ej: pomada para cabello/i), {
      target: { value: 'Gel Extra Firme' }
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '150' }
    });

    // Simulamos la selección de un archivo de imagen
    const file = new File(['(⌐□_□)'], 'gel.png', { type: 'image/png' });
    const inputFile = document.querySelector('input[type="file"]');
    fireEvent.change(inputFile, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      // Verificamos que se use FormData y el método POST
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/productos/barberia_123'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
    });
  });

  it('debe mostrar el modal de confirmación al intentar eliminar', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 99, nombre: 'Producto Peligroso', precio: 10, stock: 1, estado: 'disponible' }],
    });

    render(<Productos barberia={mockBarberia} />);

    // Buscamos el botón de eliminar por su título
    const btnDelete = await screen.findByTitle('Eliminar');
    fireEvent.click(btnDelete);

    // SOLUCIÓN AL TEXTO FRAGMENTADO: 
    // Buscamos las partes del mensaje por separado para evitar el error del <strong>
    expect(screen.getByText(/¿Eliminar/i)).toBeInTheDocument();
    expect(screen.getByText(/"Producto Peligroso"/i)).toBeInTheDocument();
    expect(screen.getByText(/esta acción no se puede deshacer/i)).toBeInTheDocument();
  });
});