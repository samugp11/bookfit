const express = require('express');
const { db }  = require('../config/db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/usuarios — solo admin
router.get('/', requireRole('admin'), (req, res) => {
  res.json(db.prepare(
    'SELECT id, nombre, email, rol, fecha_registro FROM usuarios ORDER BY fecha_registro DESC'
  ).all());
});

// PUT /api/usuarios/:id — cambiar rol (solo admin)
router.put('/:id', requireRole('admin'), (req, res) => {
  const { rol } = req.body;
  const validos = ['admin', 'entrenador', 'cliente', 'invitado'];

  if (!rol || !validos.includes(rol)) {
    return res.status(400).json({ error: 'Rol no válido' });
  }

  db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run(rol, req.params.id);
  res.json({ mensaje: 'Rol actualizado correctamente' });
});

// DELETE /api/usuarios/:id — solo admin
router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
  res.json({ mensaje: 'Usuario eliminado correctamente' });
});

module.exports = router;
