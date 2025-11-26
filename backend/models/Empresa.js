import { pool } from '../config/db.js';

export const crearEmpresa = async (empresaData) => {
  const query = `
    INSERT INTO empresas 
    (usuario_id, tipo, ruc, razon_social, nombre_comercial, direccion_fiscal, 
     ubigeo, departamento, provincia, distrito, telefono, email, logo, logo_nombre,
     usuario_sol, clave_sol, certificado_nombre, certificado_data, certificado_password, 
     ambiente, es_principal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const [result] = await pool.execute(query, [
    empresaData.usuarioId,
    empresaData.tipo || 'PRODUCCION',
    empresaData.ruc,
    empresaData.razonSocial,
    empresaData.nombreComercial,
    empresaData.direccionFiscal,
    empresaData.ubigeo,
    empresaData.departamento,
    empresaData.provincia,
    empresaData.distrito,
    empresaData.telefono,
    empresaData.email,
    empresaData.logo,
    empresaData.logoNombre,
    empresaData.usuarioSol,
    empresaData.claveSol,
    empresaData.certificadoNombre,
    empresaData.certificadoData,
    empresaData.certificadoPassword,
    empresaData.ambiente || 'BETA',
    empresaData.esPrincipal || 'NO'
  ]);
  
  return result.insertId;
};

export const listarPorUsuarioId = async (usuarioId) => {
  const query = `
    SELECT id, tipo, ruc, razon_social, nombre_comercial, 
           direccion_fiscal, ubigeo, departamento, provincia, distrito,
           telefono, email, logo_nombre, usuario_sol, certificado_nombre, 
           ambiente, activo, es_principal, creado_en
    FROM empresas 
    WHERE usuario_id = ? AND activo = 'SI'
    ORDER BY es_principal DESC, creado_en DESC
  `;
  const [rows] = await pool.execute(query, [usuarioId]);
  return rows;
};

export const buscarPorId = async (id, usuarioId) => {
  const query = `
    SELECT * FROM empresas 
    WHERE id = ? AND usuario_id = ? AND activo = 'SI'
  `;
  const [rows] = await pool.execute(query, [id, usuarioId]);
  return rows[0];
};

export const actualizarEmpresa = async (id, usuarioId, empresaData) => {
  const query = `
    UPDATE empresas 
    SET ruc = ?, razon_social = ?, nombre_comercial = ?, direccion_fiscal = ?,
        ubigeo = ?, departamento = ?, provincia = ?, distrito = ?,
        telefono = ?, email = ?, logo = ?, logo_nombre = ?,
        usuario_sol = ?, clave_sol = ?, ambiente = ?,
        certificado_nombre = ?, certificado_data = ?, certificado_password = ?
    WHERE id = ? AND usuario_id = ?
  `;
  
  await pool.execute(query, [
    empresaData.ruc,
    empresaData.razonSocial,
    empresaData.nombreComercial,
    empresaData.direccionFiscal,
    empresaData.ubigeo,
    empresaData.departamento,
    empresaData.provincia,
    empresaData.distrito,
    empresaData.telefono,
    empresaData.email,
    empresaData.logo,
    empresaData.logoNombre,
    empresaData.usuarioSol,
    empresaData.claveSol,
    empresaData.ambiente,
    empresaData.certificadoNombre,
    empresaData.certificadoData,
    empresaData.certificadoPassword,
    id,
    usuarioId
  ]);
};

export const establecerPrincipal = async (id, usuarioId) => {
  await pool.execute(
    'UPDATE empresas SET es_principal = "NO" WHERE usuario_id = ?',
    [usuarioId]
  );
  
  await pool.execute(
    'UPDATE empresas SET es_principal = "SI" WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
};

export const eliminarEmpresa = async (id, usuarioId) => {
  const query = 'UPDATE empresas SET activo = "NO" WHERE id = ? AND usuario_id = ?';
  await pool.execute(query, [id, usuarioId]);
};

export const buscarPorRuc = async (ruc, usuarioId) => {
  const query = `
    SELECT * FROM empresas 
    WHERE ruc = ? AND usuario_id = ? AND activo = "SI"
  `;
  const [rows] = await pool.execute(query, [ruc, usuarioId]);
  return rows[0];
};

export const asignarEmpresaPruebas = async (usuarioId) => {
  const empresaPruebas = {
    usuarioId,
    tipo: 'PRUEBAS',
    ruc: '20000000000',
    razonSocial: 'EMPRESA DE PRUEBAS',
    nombreComercial: 'NOMBRE LEGAL DE LA EMPRESA SAC',
    direccionFiscal: 'AV. PRUEBAS 123, LIMA',
    ubigeo: '150101',
    departamento: 'LIMA',
    provincia: 'LIMA',
    distrito: 'LIMA',
    telefono: null,
    email: null,
    logo: null,
    logoNombre: null,
    usuarioSol: null,
    claveSol: null,
    certificadoNombre: null,
    certificadoData: null,
    certificadoPassword: null,
    ambiente: 'BETA',
    esPrincipal: 'SI'
  };

  return await crearEmpresa(empresaPruebas);
};