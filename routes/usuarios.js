const express  = require('express');
const bcrypt   = require('bcryptjs');
const { db }   = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/usuarios — solo admin
router.get('/', requireRole('admin'), (req, res) => {
  res.json(db.prepare(
    'SELECT id, nombre, email, rol, fecha_registro FROM usuarios ORDER BY fecha_registro DESC'
  ).all());
});

// PUT /api/usuarios/perfil — el propio usuario actualiza sus datos
// OJO: tiene que ir ANTES de /:id para que Express no lo confunda
router.put('/perfil', requireAuth, (req, res) => {
  const { nombre, password_actual, password_nueva } = req.body;

  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (password_nueva) {
    if (!password_actual) return res.status(400).json({ error: 'Introduce tu contraseña actual' });
    if (!bcrypt.compareSync(password_actual, user.password_hash)) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }
    if (password_nueva.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    const hash = bcrypt.hashSync(password_nueva, 10);
    db.prepare('UPDATE usuarios SET nombre = ?, password_hash = ? WHERE id = ?').run(nombre.trim(), hash, req.user.sub);
  } else {
    db.prepare('UPDATE usuarios SET nombre = ? WHERE id = ?').run(nombre.trim(), req.user.sub);
  }

  res.json({ mensaje: 'Perfil actualizado correctamente' });
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