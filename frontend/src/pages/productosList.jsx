// frontend/src/pages/ProductosList.jsx
import { useEffect, useState } from "react";
import { getProductos } from "../services/facturaService";

const ProductosList = () => {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    getProductos().then(setProductos);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-3">Productos disponibles</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Nombre</th>
            <th className="border p-2">Precio</th>
            <th className="border p-2">Stock</th>
            <th className="border p-2">Categoría</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id}>
              <td className="border p-2">{p.nombre}</td>
              <td className="border p-2">S/ {p.precio}</td>
              <td className="border p-2">{p.stock}</td>
              <td className="border p-2">{p.categoria}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductosList;