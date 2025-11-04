import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

// 🔹 Icono de menú (hamburguesa)
const MenuIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-6 h-6"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

// 🔹 Icono de cerrar (X)
const XMarkIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-6 h-6"
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const links = [
    { path: "/", label: "Productos" },
    { path: "/emitir", label: "Nuevo Comprobante" },
    { path: "/facturas", label: "Listado de Facturas" },
  ];

  return (
    <nav
      aria-label="Navegación principal de la aplicación"
      className="bg-white/95 backdrop-blur-md shadow-2xl border-b border-gray-50 sticky top-0 z-50 transition-shadow duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* 🔹 LOGO */}
          <Link to="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 tracking-tight">
              <span className="text-indigo-600 text-3xl">🧾</span>
              Facturador
              <span className="text-xs font-medium text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full uppercase ml-1 opacity-90">
                Beta
              </span>
            </h1>
          </Link>

          {/* 🔹 Menú Escritorio */}
          <ul className="hidden md:flex gap-4 lg:gap-6 text-gray-700 font-medium">
            {links.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`
                    transition-all duration-300 p-2 rounded-xl text-sm lg:text-base whitespace-nowrap
                    ${
                      location.pathname === link.path
                        ? "text-indigo-700 bg-indigo-50 font-semibold shadow-inner border border-indigo-100"
                        : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                    }
                  `}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* 🔹 Botón Hamburguesa */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-600 hover:text-indigo-600 p-2 rounded-md transition-colors duration-200"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
          >
            {isMenuOpen ? <XMarkIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* 🔹 Menú Móvil */}
      <div
        id="mobile-menu"
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? "max-h-60 opacity-100 py-2" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="flex flex-col space-y-2 px-4 sm:px-6">
          {links.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`
                  block w-full p-3 rounded-md text-base font-medium transition-colors duration-200
                  ${
                    location.pathname === link.path
                      ? "text-indigo-700 bg-indigo-100 font-bold shadow-sm"
                      : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                  }
                `}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
