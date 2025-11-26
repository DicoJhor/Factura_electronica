import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as Usuario from '../models/Usuario.js';

const JWT_SECRET = process.env.JWT_SECRET || 'facturador_secret_2024';

export const registrar = async (req, res) => {
  try {
    const { nombre, usuario, email, password, rol } = req.body;

    if (!nombre || !usuario || !email || !password) {
      return res.status(400).json({ 
        error: 'Nombre, usuario, email y contraseña son requeridos' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    const usuarioExistente = await Usuario.buscarPorEmail(email);
    if (usuarioExistente) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const usuarioExistenteNombre = await Usuario.buscarPorUsuario(usuario);
    if (usuarioExistenteNombre) {
      return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const usuarioId = await Usuario.crearUsuario(nombre, usuario, passwordHash, email, rol || 'cajero');

    const token = jwt.sign(
      { usuarioId, email, rol: rol || 'cajero' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      usuarioId,
      token
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

export const login = async (req, res) => {
  try {
    const { emailOrUsuario, password } = req.body;

    if (!emailOrUsuario || !password) {
      return res.status(400).json({ 
        error: 'Email/Usuario y contraseña son requeridos' 
      });
    }

    let usuario = await Usuario.buscarPorEmail(emailOrUsuario);
    
    if (!usuario) {
      usuario = await Usuario.buscarPorUsuario(emailOrUsuario);
    }

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.clave);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { usuarioId: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      mensaje: 'Login exitoso',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        usuario: usuario.usuario,
        rol: usuario.rol
      },
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

export const verificarToken = async (req, res) => {
  try {
    const usuario = await Usuario.buscarPorId(req.usuario.usuarioId);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ usuario });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ error: 'Error al verificar token' });
  }
};