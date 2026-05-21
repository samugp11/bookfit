const express = require('express');
const { db }  = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/reservas — autenticado (admin ve todas, cliente solo las suyas)
router.get('/', requireAuth, (req, res) => {
  if (req.user.rol === 'admin') {
    return res.json(db.prepare(`
      SELECT r.id, r.estado, r.fecha_reserva,
             c.nombre AS clase, c.fecha_hora,
             u.nombre AS cliente
      FROM reservas r
      JOIN clases c   ON r.id_clase   = c.id
      JOIN usuarios u ON r.id_cliente = u.id
      ORDER BY r.fecha_reserva DESC
    `).all());
  }

  res.json(db.prepare(`
    SELECT r.id, r.estado, r.fecha_reserva,
           c.nombre AS clase, c.fecha_hora
    FROM reservas r
    JOIN clases c ON r.id_clase = c.id
    WHERE r.id_cliente = ?
    ORDER BY r.fecha_reserva DESC
  `).all(req.user.sub));
});

// POST /api/reservas — cliente o admin
router.post('/', requireRole('cliente', 'admin'), (req, res) => {
  const { id_clase } = req.body;
  if (!id_clase) return res.status(400).json({ error: 'El id de la clase es obligatorio' });

  const clase = db.prepare('SELECT * FROM clases WHERE id = ?').get(id_clase);
  if (!clase) return res.status(404).json({ error: 'La clase no existe' });
  if (clase.plazas_disponibles <= 0) return res.status(409).json({ error: 'No quedan plazas disponibles' });

  const yaReservado = db.prepare(
    "SELECT id FROM reservas WHERE id_cliente = ? AND id_clase = ? AND estado = 'confirmada'"
  ).get(req.user.sub, id_clase);
  if (yaReservado) return res.status(409).json({ error: 'Ya tienes una reserva activa en esta clase' });

  db.transaction(() => {
    db.prepare('INSERT INTO reservas (id_cliente, id_clase) VALUES (?, ?)').run(req.user.sub, id_clase);
    db.prepare('UPDATE clases SET plazas_disponibles = plazas_disponibles - 1 WHERE id = ?').run(id_clase);
  })();

  res.status(201).json({ mensaje: 'Reserva realizada correctamente' });
});

// DELETE /api/reservas/:id — cancelar (cliente solo la suya, admin cualquiera)
router.delete('/:id', requireAuth, (req, res) => {
  const reserva = db.prepare('SELECT * FROM reservas WHERE id = ?').get(req.params.id);
  if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });

  if (req.user.rol !== 'admin' && reserva.id_cliente !== req.user.sub) {
    return res.status(403).json({ error: 'No puedes cancelar una reserva que no es tuya' });
  }

  db.transaction(() => {
    db.prepare("UPDATE reservas SET estado = 'cancelada' WHERE id = ?").run(req.params.id);
    db.prepare('UPDATE clases SET plazas_disponibles = plazas_disponibles + 1 WHERE id = ?').run(reserva.id_clase);
  })();

  res.json({ mensaje: 'Reserva cancelada correctamente' });
});

module.exports = router;