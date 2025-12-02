import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import './Login.css';

const Registro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    usuario: '',
    email: '',
    password: '',
    confirmarPassword: ''
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validarFormulario = () => {
    if (!formData.nombre || !formData.usuario || !formData.email || !formData.password) {
      setError('Por favor completa todos los campos');
      return false;
    }

    if (formData.nombre.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return false;
    }

    if (formData.usuario.trim().length < 3) {
      setError('El usuario debe tener al menos 3 caracteres');
      return false;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('El formato del email no es válido');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    console.log('🔄 Iniciando proceso de registro...');

    if (!validarFormulario()) {
      console.log('❌ Validación fallida');
      return;
    }

    setCargando(true);

    try {
      console.log('📤 Enviando datos de registro...');
      
      const resultado = await authService.registro({
        nombre: formData.nombre.trim(),
        usuario: formData.usuario.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      console.log('✅ Registro completado:', resultado);
      
      // Pequeño delay para que el usuario vea el éxito
      setTimeout(() => {
        navigate('/empresas');
      }, 500);
      
    } catch (error) {
      console.error('❌ Error en el registro:', error);
      
      // Extraer el mensaje de error más específico posible
      let mensajeError = 'Error al registrar usuario';
      
      if (error.response?.data?.error) {
        mensajeError = error.response.data.error;
      } else if (error.response?.data?.message) {
        mensajeError = error.response.data.message;
      } else if (error.message === 'Network Error') {
        mensajeError = 'No se puede conectar con el servidor. Verifica tu conexión.';
      } else if (error.code === 'ECONNABORTED') {
        mensajeError = 'La solicitud tardó demasiado. Intenta nuevamente.';
      } else if (error.message) {
        mensajeError = error.message;
      }
      
      setError(mensajeError);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>📝 Crear Cuenta</h1>
          <p>Regístrate para comenzar</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert alert-error">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="nombre">👤 Nombre Completo</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Juan Pérez"
              disabled={cargando}
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="usuario">🔤 Usuario</label>
            <input
              type="text"
              id="usuario"
              name="usuario"
              value={formData.usuario}
              onChange={handleChange}
              placeholder="juanperez"
              autoComplete="username"
              disabled={cargando}
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">📧 Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="juan@ejemplo.com"
              autoComplete="email"
              disabled={cargando}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">🔒 Contraseña</label>
            <div className="password-input">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={cargando}
                required
                minLength={6}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                tabIndex={-1}
              >
                {mostrarPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmarPassword">🔒 Confirmar Contraseña</label>
            <input
              type={mostrarPassword ? 'text' : 'password'}
              id="confirmarPassword"
              name="confirmarPassword"
              value={formData.confirmarPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={cargando}
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={cargando}
          >
            {cargando ? '⏳ Registrando...' : '✨ Crear Cuenta'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            ¿Ya tienes cuenta? {' '}
            <Link to="/login">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Registro;