import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ComprobanteForm from "./pages/ComprobanteForm";
import FacturasList from "./pages/FacturasList";

const App = () => {
  return (
    <BrowserRouter>
      {/* min-h-screen y flex-col son para el layout, el fondo viene de app.css */}
      <div className="min-h-screen flex flex-col"> 
        <Navbar />
        
        {/* Contenedor principal de la aplicación: items-start mantiene el contenido arriba */}
        <main className="flex-grow flex justify-center items-start px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          
          {/* Tarjeta de Contenido: Sombra profunda y esquinas redondeadas elegantes */}
          <div className="w-full max-w-7xl bg-white shadow-2xl rounded-xl p-6 lg:p-10 border border-gray-50">
            <Routes>
              <Route path="/emitir" element={<ComprobanteForm />} />
              <Route path="/facturas" element={<FacturasList />} />
            </Routes>
          </div>
        </main>

        {/* Footer con fondo ligeramente transparente y shadow-inner sutil */}
        <footer className="text-center text-sm text-gray-500 py-4 border-t border-gray-200 bg-white/70 backdrop-blur-sm shadow-inner">
          © {new Date().getFullYear()} Facturador Beta — Todos los derechos reservados.
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;