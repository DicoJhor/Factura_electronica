import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import PDFPreview from "../components/PDFPreview";

const ComprobanteForm = () => {
  const navigate = useNavigate();
  const BASE_URL = "https://facturaelectronica-production.up.railway.app";

  const [cliente, setCliente] = useState({ nombre: "", ruc: "", direccion: "" });
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [total, setTotal] = useState(0);
  const [facturaGenerada, setFacturaGenerada] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Cargar productos desde el backend
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/productos`);
        const data = await res.json();
        setProductosDisponibles(data);
      } catch (error) {
        console.error("Error al obtener productos:", error);
      }
    };
    fetchProductos();
  }, []);

  const handleClienteChange = (e) => {
    const { name, value } = e.target;
    setCliente((prev) => ({ ...prev, [name]: value }));
  };

  const agregarProducto = (producto) => {
    const yaExiste = productosSeleccionados.find((p) => p.id === producto.id);
    let nuevos;
    if (yaExiste) {
      nuevos = productosSeleccionados.map((p) =>
        p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
      );
    } else {
      nuevos = [...productosSeleccionados, { ...producto, cantidad: 1 }];
    }
    setProductosSeleccionados(nuevos);
    calcularTotal(nuevos);
  };

  const eliminarProducto = (id) => {
    const nuevos = productosSeleccionados.filter((p) => p.id !== id);
    setProductosSeleccionados(nuevos);
    calcularTotal(nuevos);
  };

  const cambiarCantidad = (id, cantidad) => {
    const nuevos = productosSeleccionados.map((p) =>
      p.id === id ? { ...p, cantidad: Number(cantidad) } : p
    );
    setProductosSeleccionados(nuevos);
    calcularTotal(nuevos);
  };

  const calcularTotal = (lista) => {
    const totalCalc = lista.reduce((acc, p) => acc + p.cantidad * p.precio, 0);
    setTotal(totalCalc);
  };

  const emitirComprobante = async () => {
    if (!cliente.nombre || !cliente.ruc) {
      alert("Por favor, completa los datos del cliente.");
      return;
    }
    if (productosSeleccionados.length === 0) {
      alert("Debe agregar al menos un producto.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/facturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente,
          detalles: productosSeleccionados.map((p) => ({
            producto: p.nombre,
            cantidad: p.cantidad,
            precio_unitario: p.precio,
            subtotal: p.cantidad * p.precio,
          })),
          total,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Factura generada correctamente");
        setFacturaGenerada(data);
      } else {
        alert("Error al generar la factura: " + data.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">🧾 Emitir Comprobante (Modo BETA)</h2>

      {/* Datos del Cliente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <input type="text" name="nombre" placeholder="Nombre del cliente" value={cliente.nombre} onChange={handleClienteChange} className="p-2 border rounded w-full" />
        <input type="text" name="ruc" placeholder="RUC o DNI" value={cliente.ruc} onChange={handleClienteChange} className="p-2 border rounded w-full" />
        <input type="text" name="direccion" placeholder="Dirección" value={cliente.direccion} onChange={handleClienteChange} className="p-2 border rounded w-full sm:col-span-2" />
      </div>

      {/* Selección de productos */}
      <h3 className="text-lg font-semibold mb-2">Seleccionar Productos</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-5">
        {productosDisponibles.map((prod) => (
          <button key={prod.id} onClick={() => agregarProducto(prod)} className="bg-gray-100 border hover:bg-green-100 rounded p-2 text-sm">
            {prod.nombre} <br /> <span className="text-gray-500">S/ {prod.precio}</span>
          </button>
        ))}
      </div>

      {/* Productos seleccionados */}
      <h3 className="text-lg font-semibold mb-2">Productos seleccionados</h3>
      {productosSeleccionados.map((p) => (
        <div key={p.id} className="grid grid-cols-4 gap-3 mb-2">
          <span className="col-span-2">{p.nombre}</span>
          <input type="number" min="1" value={p.cantidad} onChange={(e) => cambiarCantidad(p.id, e.target.value)} className="border rounded p-1 w-20 text-center" />
          <button onClick={() => eliminarProducto(p.id)} className="bg-red-500 text-white rounded px-3 py-1 hover:bg-red-600">Eliminar</button>
        </div>
      ))}

      {/* Total */}
      <div className="text-right my-4">
        <span className="text-lg font-semibold">Total: S/ {total.toFixed(2)}</span>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-3 justify-between">
        <button onClick={emitirComprobante} disabled={loading} className={`${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"} text-white rounded px-5 py-2 font-semibold`}>
          {loading ? "Generando..." : "Emitir Comprobante"}
        </button>

        <button onClick={() => navigate("/facturas")} className="bg-blue-600 text-white rounded px-5 py-2 font-semibold hover:bg-blue-700">
          Ver Facturas
        </button>
      </div>

      {/* Vista previa PDF */}
      {facturaGenerada && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">📄 Factura Generada</h3>
          <a href={`${BASE_URL}${facturaGenerada.pdf}`} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Ver Factura PDF
          </a>
        </div>
      )}
    </div>
  );
};

export default ComprobanteForm;
