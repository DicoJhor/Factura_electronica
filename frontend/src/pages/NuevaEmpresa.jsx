import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { empresaService } from '../services/empresaService';
import Navbar from '../components/Navbar';
import './NuevaEmpresa.css';

const NuevaEmpresa = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    direccionFiscal: '',
    ubigeo: '',
    departamento: '',
    provincia: '',
    distrito: '',
    telefono: '',
    email: '',
    usuarioSol: '',
    claveSol: '',
    certificadoPassword: '',
    ambiente: 'BETA'
  });
  
  const [archivos, setArchivos] = useState({
    logo: null,
    certificado: null
  });

  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [consultandoRuc, setConsultandoRuc] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setArchivos({
        ...archivos,
        [name]: files[0]
      });
    }
  };

  const consultarRUC = async () => {
    if (formData.ruc.length !== 11) {
      setError('El RUC debe tener 11 dígitos');
      return;
    }

    setConsultandoRuc(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sunat/consultar-ruc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ numero: formData.ruc })
      });

      const result = await response.json();

      if (result.success) {
        setFormData({
          ...formData,
          razonSocial: result.data.razonSocial || result.data.nombre,
          nombreComercial: result.data.razonSocial || result.data.nombre,
          direccionFiscal: result.data.direccion || '',
          departamento: result.data.departamento || '',
          provincia: result.data.provincia || '',
          distrito: result.data.distrito || '',
          ubigeo: result.data.ubigeo || ''
        });
      } else {
        setError(result.message || 'No se encontraron datos del RUC');
      }
    } catch (err) {
      console.error('Error consultando RUC:', err);
      setError('Error al consultar RUC. Puedes continuar ingresando los datos manualmente.');
    } finally {
      setConsultandoRuc(false);
    }
  };

  const validarFormulario = () => {
    if (!formData.ruc || formData.ruc.length !== 11) {
      setError('El RUC debe tener 11 dígitos');
      return false;
    }

    if (!formData.razonSocial) {
      setError('La razón social es requerida');
      return false;
    }

    if (!formData.direccionFiscal) {
      setError('La dirección fiscal es requerida');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validarFormulario()) {
      return;
    }

    setCargando(true);

    try {
      const formDataToSend = new FormData();
      
      // Datos básicos
      formDataToSend.append('ruc', formData.ruc);
      formDataToSend.append('razonSocial', formData.razonSocial);
      formDataToSend.append('nombreComercial', formData.nombreComercial || formData.razonSocial);
      formDataToSend.append('direccionFiscal', formData.direccionFiscal);
      
      // Datos opcionales
      if (formData.ubigeo) formDataToSend.append('ubigeo', formData.ubigeo);
      if (formData.departamento) formDataToSend.append('departamento', formData.departamento);
      if (formData.provincia) formDataToSend.append('provincia', formData.provincia);
      if (formData.distrito) formDataToSend.append('distrito', formData.distrito);
      if (formData.telefono) formDataToSend.append('telefono', formData.telefono);
      if (formData.email) formDataToSend.append('email', formData.email);
      
      // Datos SUNAT
      if (formData.usuarioSol) formDataToSend.append('usuarioSol', formData.usuarioSol);
      if (formData.claveSol) formDataToSend.append('claveSol', formData.claveSol);
      if (formData.certificadoPassword) formDataToSend.append('certificadoPassword', formData.certificadoPassword);
      formDataToSend.append('ambiente', formData.ambiente);
      
      // Archivos
      if (archivos.logo) formDataToSend.append('logo', archivos.logo);
      if (archivos.certificado) formDataToSend.append('certificado', archivos.certificado);

      await empresaService.crear(formDataToSend);
      
      navigate('/empresas');
    } catch (error) {
      console.error('Error al crear empresa:', error);
      setError(error.response?.data?.error || 'Error al registrar empresa');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="nueva-empresa-container">
      <Navbar showBackButton={true} backUrl="/empresas" />

      <div className="nueva-empresa-content">
        <div className="nueva-empresa-header">
          <h2>➕ Agregar Nueva Empresa</h2>
          <p>Completa los datos de tu empresa para comenzar a emitir comprobantes</p>
        </div>

        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="empresa-form">
          {/* Sección 1: Datos de RUC */}
          <div className="form-section">
            <h3>📋 Datos del RUC</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ruc">RUC *</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    id="ruc"
                    name="ruc"
                    value={formData.ruc}
                    onChange={handleChange}
                    placeholder="20123456789"
                    maxLength="11"
                    required
                    disabled={cargando}
                  />
                  <button
                    type="button"
                    onClick={consultarRUC}
                    disabled={consultandoRuc || formData.ruc.length !== 11}
                    className="btn btn-secondary btn-consultar"
                  >
                    {consultandoRuc ? '⏳' : '🔍'} Consultar
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="razonSocial">Razón Social *</label>
              <input
                type="text"
                id="razonSocial"
                name="razonSocial"
                value={formData.razonSocial}
                onChange={handleChange}
                placeholder="EMPRESA S.A.C."
                required
                disabled={cargando}
              />
            </div>

            <div className="form-group">
              <label htmlFor="nombreComercial">Nombre Comercial</label>
              <input
                type="text"
                id="nombreComercial"
                name="nombreComercial"
                value={formData.nombreComercial}
                onChange={handleChange}
                placeholder="Nombre comercial (opcional)"
                disabled={cargando}
              />
            </div>
          </div>

          {/* Sección 2: Dirección */}
          <div className="form-section">
            <h3>📍 Dirección Fiscal</h3>
            
            <div className="form-group">
              <label htmlFor="direccionFiscal">Dirección Completa *</label>
              <textarea
                id="direccionFiscal"
                name="direccionFiscal"
                value={formData.direccionFiscal}
                onChange={handleChange}
                placeholder="Av. Principal 123, Lima"
                rows="2"
                required
                disabled={cargando}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="departamento">Departamento</label>
                <input
                  type="text"
                  id="departamento"
                  name="departamento"
                  value={formData.departamento}
                  onChange={handleChange}
                  placeholder="Lima"
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="provincia">Provincia</label>
                <input
                  type="text"
                  id="provincia"
                  name="provincia"
                  value={formData.provincia}
                  onChange={handleChange}
                  placeholder="Lima"
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="distrito">Distrito</label>
                <input
                  type="text"
                  id="distrito"
                  name="distrito"
                  value={formData.distrito}
                  onChange={handleChange}
                  placeholder="Miraflores"
                  disabled={cargando}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ubigeo">Ubigeo</label>
                <input
                  type="text"
                  id="ubigeo"
                  name="ubigeo"
                  value={formData.ubigeo}
                  onChange={handleChange}
                  placeholder="150101"
                  maxLength="6"
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono">Teléfono</label>
                <input
                  type="text"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="987654321"
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="empresa@ejemplo.com"
                  disabled={cargando}
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Credenciales SUNAT */}
          <div className="form-section">
            <h3>🔐 Credenciales SUNAT (Opcional)</h3>
            <p className="form-help">Para emitir comprobantes necesitarás configurar estas credenciales</p>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="usuarioSol">Usuario SOL</label>
                <input
                  type="text"
                  id="usuarioSol"
                  name="usuarioSol"
                  value={formData.usuarioSol}
                  onChange={handleChange}
                  placeholder="MODDATOS"
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="claveSol">Clave SOL</label>
                <input
                  type="password"
                  id="claveSol"
                  name="claveSol"
                  value={formData.claveSol}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ambiente">Ambiente</label>
                <select
                  id="ambiente"
                  name="ambiente"
                  value={formData.ambiente}
                  onChange={handleChange}
                  disabled={cargando}
                >
                  <option value="BETA">Beta (Pruebas)</option>
                  <option value="PRODUCCION">Producción</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección 4: Archivos */}
          <div className="form-section">
            <h3>📎 Archivos (Opcional)</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="logo">Logo de la Empresa</label>
                <input
                  type="file"
                  id="logo"
                  name="logo"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={cargando}
                />
                <span className="form-help">PNG, JPG o JPEG (máx. 2MB)</span>
              </div>

              <div className="form-group">
                <label htmlFor="certificado">Certificado Digital (.pfx)</label>
                <input
                  type="file"
                  id="certificado"
                  name="certificado"
                  accept=".pfx,.p12"
                  onChange={handleFileChange}
                  disabled={cargando}
                />
                <span className="form-help">Archivo .pfx o .p12</span>
              </div>
            </div>

            {archivos.certificado && (
              <div className="form-group">
                <label htmlFor="certificadoPassword">Contraseña del Certificado</label>
                <input
                  type="password"
                  id="certificadoPassword"
                  name="certificadoPassword"
                  value={formData.certificadoPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={cargando}
                />
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/empresas')}
              disabled={cargando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={cargando}
            >
              {cargando ? '⏳ Guardando...' : '💾 Guardar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevaEmpresa;