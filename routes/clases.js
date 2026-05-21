const express = require('express');
const { db }  = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/clases — público
router.get('/', (req, res) => {
  const clases = db.prepare(`
    SELECT c.id, c.nombre, c.descripcion, c.fecha_hora, c.duracion_min,
           c.plazas_totales, c.plazas_disponibles, u.nombre AS entrenador
    FROM clases c
    JOIN usuarios u ON c.id_entrenador = u.id
    ORDER BY c.fecha_hora ASC
  `).all();
  res.json(clases);
});

// GET /api/clases/:id — público
router.get('/:id', (req, res) => {
  const clase = db.prepare(`
    SELECT c.*, u.nombre AS entrenador
    FROM clases c
    JOIN usuarios u ON c.id_entrenador = u.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!clase) return res.status(404).json({ error: 'Clase no encontrada' });
  res.json(clase);
});

// POST /api/clases — entrenador o admin
router.post('/', requireRole('admin', 'entrenador'), (req, res) => {
  const { nombre, descripcion, fecha_hora, duracion_min, plazas_totales, id_entrenador } = req.body;

  if (!nombre || !fecha_hora) {
    return res.status(400).json({ error: 'El nombre y la fecha son obligatorios' });
  }

  // Admin puede asignar cualquier entrenador; entrenador se asigna a sí mismo
  const entrenadorId = req.user.rol === 'admin' && id_entrenador
    ? id_entrenador
    : req.user.sub;

  const plazas = parseInt(plazas_totales) || 10;
  const result = db.prepare(`
    INSERT INTO clases (nombre, descripcion, id_entrenador, fecha_hora, duracion_min, plazas_totales, plazas_disponibles)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    nombre.trim(),
    descripcion?.trim() || '',
    entrenadorId,
    fecha_hora,
    parseInt(duracion_min) || 60,
    plazas,
    plazas
  );

  res.status(201).json({ mensaje: 'Clase creada correctamente', id: result.lastInsertRowid });
});

// PUT /api/clases/:id — entrenador (solo las suyas) o admin
router.put('/:id', requireRole('admin', 'entrenador'), (req, res) => {
  const { nombre, descripcion, fecha_hora, duracion_min, plazas_totales, id_entrenador } = req.body;
  const id = req.params.id;

  if (req.user.rol === 'entrenador') {
    const propia = db.prepare('SELECT id FROM clases WHERE id = ? AND id_entrenador = ?').get(id, req.user.sub);
    if (!propia) return res.status(403).json({ error: 'No puedes editar una clase que no es tuya' });
  }

  const entrenadorId = req.user.rol === 'admin' && id_entrenador
    ? id_entrenador
    : req.user.sub;

  db.prepare(`
    UPDATE clases SET nombre = ?, descripcion = ?, id_entrenador = ?, fecha_hora = ?, duracion_min = ?, plazas_totales = ?
    WHERE id = ?
  `).run(
    nombre.trim(),
    descripcion?.trim() || '',
    entrenadorId,
    fecha_hora,
    parseInt(duracion_min) || 60,
    parseInt(plazas_totales) || 10,
    id
  );

  res.json({ mensaje: 'Clase actualizada correctamente' });
});

// DELETE /api/clases/:id — solo admin
router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM clases WHERE id = ?').run(req.params.id);
  res.json({ mensaje: 'Clase eliminada correctamente' });
});

module.exports = router;