import React, { useEffect, useState } from "react";
import axios from "axios";

const FacturasList = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacturas = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/facturas");
        setFacturas(response.data || []);
      } catch (error) {
        console.error("Error al cargar las facturas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFacturas();
  }, []);

  if (loading) {
    return <p className="text-center text-gray-500">Cargando facturas...</p>;
  }

  if (facturas.length === 0) {
    return <p className="text-center text-gray-500">No hay facturas registradas.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-700 text-center">📋 Listado de Facturas</h1>

      <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">#</th>
              <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Cliente</th>
              <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">RUC/DNI</th>
              <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Total (S/)</th>
              <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((factura, index) => (
              <tr
                key={factura.id || index}
                className="border-b hover:bg-gray-50 transition"
              >
                <td className="py-3 px-4 text-sm text-gray-700">{index + 1}</td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  {factura.cliente_nombre || "—"}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  {factura.cliente_documento || "—"}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  {factura.total?.toFixed(2) || "0.00"}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  {new Date(factura.fecha_emision).toLocaleDateString("es-PE")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FacturasList;
