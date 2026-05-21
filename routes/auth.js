const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { db, JWT_SECRET } = require('../config/db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'El email y la contraseña son obligatorios' });
  }

  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email.trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    { sub: user.id, nombre: user.nombre, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, rol: user.rol, nombre: user.nombre, id: user.id });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email.trim());
  if (existe) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)').run(
    nombre.trim(), email.trim(), hash, 'cliente'
  );

  res.status(201).json({ mensaje: 'Cuenta creada correctamente. Ya puedes iniciar sesión.' });
});

module.exports = router;
