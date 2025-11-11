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

  // 🔹 Estados para la consulta SUNAT
  const [numeroConsulta, setNumeroConsulta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState("");

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

  // 🔹 NUEVA FUNCIÓN: Consultar datos en SUNAT
  const consultarSUNAT = async () => {
    if (!numeroConsulta.trim()) {
      setErrorConsulta("Por favor ingrese un RUC o DNI");
      return;
    }

    if (numeroConsulta.length !== 8 && numeroConsulta.length !== 11) {
      setErrorConsulta("El RUC debe tener 11 dígitos o el DNI 8 dígitos");
      return;
    }

    setConsultando(true);
    setErrorConsulta("");

    try {
      const response = await fetch(`${BASE_URL}/api/sunat/consultar-ruc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ numero: numeroConsulta.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        // Llenar automáticamente los datos del cliente
        setCliente({
          nombre: result.data.razonSocial || result.data.nombre,
          ruc: result.data.numero,
          direccion: result.data.direccion || "",
        });

        // Limpiar el campo de consulta
        setNumeroConsulta("");
        
        // Mostrar mensaje de éxito
        alert(`✅ Datos cargados: ${result.data.razonSocial || result.data.nombre}`);
      } else {
        setErrorConsulta(result.message || "No se encontraron datos");
      }
    } catch (err) {
      console.error("Error en la consulta:", err);
      setErrorConsulta("Error al conectar con el servidor");
    } finally {
      setConsultando(false);
    }
  };

  const handleKeyPressConsulta = (e) => {
    if (e.key === "Enter") {
      consultarSUNAT();
    }
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
        alert("✅ Factura generada correctamente");
        setFacturaGenerada(data);
      } else {
        alert("❌ Error al generar la factura: " + data.error);
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

      {/* ========== NUEVA SECCIÓN: CONSULTA SUNAT ========== */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 border-2 border-blue-200">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          🔍 Consultar Cliente en SUNAT
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={numeroConsulta}
            onChange={(e) => setNumeroConsulta(e.target.value.replace(/\D/g, ""))}
            onKeyPress={handleKeyPressConsulta}
            placeholder="Ingrese RUC (11 dígitos) o DNI (8 dígitos)"
            maxLength="11"
            disabled={consultando}
            className="flex-1 p-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={consultarSUNAT}
            disabled={consultando || !numeroConsulta}
            className={`${
              consultando || !numeroConsulta
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white rounded-lg px-6 py-3 font-semibold transition-colors duration-200 min-w-[140px]`}
          >
            {consultando ? "⏳ Buscando..." : "🔍 Buscar"}
          </button>
        </div>

        {errorConsulta && (
          <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorConsulta}</span>
          </div>
        )}
      </div>

      {/* Datos del Cliente */}
      <h3 className="text-lg font-semibold mb-3">👤 Datos del Cliente</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          name="nombre"
          placeholder="Nombre del cliente"
          value={cliente.nombre}
          onChange={handleClienteChange}
          className="p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-full"
        />
        <input
          type="text"
          name="ruc"
          placeholder="RUC o DNI"
          value={cliente.ruc}
          onChange={handleClienteChange}
          className="p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-full"
        />
        <input
          type="text"
          name="direccion"
          placeholder="Dirección"
          value={cliente.direccion}
          onChange={handleClienteChange}
          className="p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-full sm:col-span-2"
        />
      </div>

      {/* Selección de productos */}
      <h3 className="text-lg font-semibold mb-3">🛒 Seleccionar Productos</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-5">
        {productosDisponibles.map((prod) => (
          <button
            key={prod.id}
            onClick={() => agregarProducto(prod)}
            className="bg-gray-100 border-2 border-gray-300 hover:bg-green-100 hover:border-green-400 rounded-lg p-3 text-sm transition-all duration-200"
          >
            {prod.nombre} <br />
            <span className="text-gray-600 font-semibold">S/ {prod.precio}</span>
          </button>
        ))}
      </div>

      {/* Productos seleccionados */}
      {productosSeleccionados.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mb-3">📦 Productos Seleccionados</h3>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            {productosSeleccionados.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-4 gap-3 mb-3 items-center bg-white p-3 rounded-lg shadow-sm"
              >
                <span className="col-span-2 font-medium">{p.nombre}</span>
                <input
                  type="number"
                  min="1"
                  value={p.cantidad}
                  onChange={(e) => cambiarCantidad(p.id, e.target.value)}
                  className="border-2 border-gray-300 rounded-lg p-2 w-20 text-center focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => eliminarProducto(p.id)}
                  className="bg-red-500 text-white rounded-lg px-3 py-2 hover:bg-red-600 transition-colors duration-200"
                >
                  🗑️ Eliminar
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Total */}
      <div className="text-right my-6 bg-green-50 p-4 rounded-lg border-2 border-green-200">
        <span className="text-2xl font-bold text-green-700">
          Total: S/ {total.toFixed(2)}
        </span>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-3 justify-between">
        <button
          onClick={emitirComprobante}
          disabled={loading}
          className={`${
            loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          } text-white rounded-lg px-6 py-3 font-semibold transition-colors duration-200`}
        >
          {loading ? "⏳ Generando..." : "✅ Emitir Comprobante"}
        </button>

        <button
          onClick={() => navigate("/facturas")}
          className="bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700 transition-colors duration-200"
        >
          📋 Ver Facturas
        </button>
      </div>

      {/* Vista previa PDF */}
      {facturaGenerada && (
        <div className="mt-6 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-3">📄 Factura Generada</h3>
          <a
            href={`${BASE_URL}${facturaGenerada.pdf}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold"
          >
            📥 Ver Factura PDF
          </a>
        </div>
      )}
    </div>
  );
};

export default ComprobanteForm;