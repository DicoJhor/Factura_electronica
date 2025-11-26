import crypto from 'crypto';
import * as Empresa from '../models/Empresa.js';

function encrypt(text, password) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'facturador_key_2024';

export const listar = async (req, res) => {
  try {
    const empresas = await Empresa.listarPorUsuarioId(req.usuario.usuarioId);

    if (empresas.length === 0) {
      await Empresa.asignarEmpresaPruebas(req.usuario.usuarioId);
      const empresasActualizadas = await Empresa.listarPorUsuarioId(req.usuario.usuarioId);
      return res.json({ empresas: empresasActualizadas });
    }

    res.json({ empresas });
  } catch (error) {
    console.error('Error al listar empresas:', error);
    res.status(500).json({ error: 'Error al listar empresas' });
  }
};

export const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const empresa = await Empresa.buscarPorId(id, req.usuario.usuarioId);

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ empresa });
  } catch (error) {
    console.error('Error al obtener empresa:', error);
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
};

export const crear = async (req, res) => {
  try {
    const {
      ruc, razonSocial, nombreComercial, direccionFiscal,
      ubigeo, departamento, provincia, distrito,
      telefono, email, usuarioSol, claveSol, certificadoPassword, ambiente
    } = req.body;

    if (!ruc || ruc.length !== 11) {
      return res.status(400).json({ error: 'RUC debe tener 11 dígitos' });
    }

    if (!razonSocial || !direccionFiscal) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const empresaExistente = await Empresa.buscarPorRuc(ruc, req.usuario.usuarioId);
    
    if (empresaExistente) {
      return res.status(409).json({ 
        error: 'Ya tienes una empresa registrada con ese RUC' 
      });
    }

    let certificadoData = null;
    let certificadoNombre = null;
    let logoData = null;
    let logoNombre = null;

    if (req.files) {
      if (req.files.certificado) {
        certificadoData = req.files.certificado[0].buffer;
        certificadoNombre = req.files.certificado[0].originalname;
      }
      if (req.files.logo) {
        logoData = req.files.logo[0].buffer;
        logoNombre = req.files.logo[0].originalname;
      }
    }

    const claveSolEncriptada = claveSol ? encrypt(claveSol, ENCRYPTION_KEY) : null;
    const certificadoPasswordEncriptado = certificadoPassword ? 
      encrypt(certificadoPassword, ENCRYPTION_KEY) : null;

    const empresaData = {
      usuarioId: req.usuario.usuarioId,
      tipo: 'PRODUCCION',
      ruc,
      razonSocial,
      nombreComercial: nombreComercial || razonSocial,
      direccionFiscal,
      ubigeo: ubigeo || null,
      departamento: departamento || null,
      provincia: provincia || null,
      distrito: distrito || null,
      telefono: telefono || null,
      email: email || null,
      logo: logoData,
      logoNombre,
      usuarioSol: usuarioSol || null,
      claveSol: claveSolEncriptada,
      certificadoNombre,
      certificadoData,
      certificadoPassword: certificadoPasswordEncriptado,
      ambiente: ambiente || 'BETA',
      esPrincipal: 'NO'
    };

    const empresaId = await Empresa.crearEmpresa(empresaData);

    res.status(201).json({
      mensaje: 'Empresa registrada exitosamente',
      empresaId
    });
  } catch (error) {
    console.error('Error al crear empresa:', error);
    res.status(500).json({ error: 'Error al registrar empresa' });
  }
};

export const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const empresa = await Empresa.buscarPorId(id, req.usuario.usuarioId);

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    if (empresa.tipo === 'PRUEBAS') {
      return res.status(403).json({ 
        error: 'No se puede editar la empresa de pruebas' 
      });
    }

    const {
      ruc, razonSocial, nombreComercial, direccionFiscal,
      ubigeo, departamento, provincia, distrito,
      telefono, email, usuarioSol, claveSol, certificadoPassword, ambiente
    } = req.body;

    let certificadoData = empresa.certificado_data;
    let certificadoNombre = empresa.certificado_nombre;
    let logoData = empresa.logo;
    let logoNombre = empresa.logo_nombre;

    if (req.files) {
      if (req.files.certificado) {
        certificadoData = req.files.certificado[0].buffer;
        certificadoNombre = req.files.certificado[0].originalname;
      }
      if (req.files.logo) {
        logoData = req.files.logo[0].buffer;
        logoNombre = req.files.logo[0].originalname;
      }
    }

    let claveSolFinal = empresa.clave_sol;
    if (claveSol) {
      claveSolFinal = encrypt(claveSol, ENCRYPTION_KEY);
    }

    let certificadoPasswordFinal = empresa.certificado_password;
    if (certificadoPassword) {
      certificadoPasswordFinal = encrypt(certificadoPassword, ENCRYPTION_KEY);
    }

    const empresaData = {
      ruc: ruc || empresa.ruc,
      razonSocial: razonSocial || empresa.razon_social,
      nombreComercial: nombreComercial || empresa.nombre_comercial,
      direccionFiscal: direccionFiscal || empresa.direccion_fiscal,
      ubigeo: ubigeo || empresa.ubigeo,
      departamento: departamento || empresa.departamento,
      provincia: provincia || empresa.provincia,
      distrito: distrito || empresa.distrito,
      telefono: telefono || empresa.telefono,
      email: email || empresa.email,
      logo: logoData,
      logoNombre,
      usuarioSol: usuarioSol || empresa.usuario_sol,
      claveSol: claveSolFinal,
      ambiente: ambiente || empresa.ambiente,
      certificadoNombre,
      certificadoData,
      certificadoPassword: certificadoPasswordFinal
    };

    await Empresa.actualizarEmpresa(id, req.usuario.usuarioId, empresaData);

    res.json({ mensaje: 'Empresa actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar empresa:', error);
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
};

export const establecerPrincipal = async (req, res) => {
  try {
    const { id } = req.params;
    
    const empresa = await Empresa.buscarPorId(id, req.usuario.usuarioId);

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    await Empresa.establecerPrincipal(id, req.usuario.usuarioId);

    res.json({ mensaje: 'Empresa establecida como principal' });
  } catch (error) {
    console.error('Error al establecer empresa principal:', error);
    res.status(500).json({ error: 'Error al establecer empresa principal' });
  }
};

export const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const empresa = await Empresa.buscarPorId(id, req.usuario.usuarioId);

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    if (empresa.tipo === 'PRUEBAS') {
      return res.status(403).json({ 
        error: 'No se puede eliminar la empresa de pruebas' 
      });
    }

    await Empresa.eliminarEmpresa(id, req.usuario.usuarioId);

    res.json({ mensaje: 'Empresa eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
};