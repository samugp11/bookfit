const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');

const JWT_SECRET = 'bookfit_super_secret_2025';

const db = new Database(path.join(__dirname, '../bookfit.db'));
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         TEXT    NOT NULL,
    email          TEXT    NOT NULL UNIQUE,
    password_hash  TEXT    NOT NULL,
    rol            TEXT    NOT NULL DEFAULT 'cliente'
                   CHECK(rol IN ('admin','entrenador','cliente','invitado')),
    fecha_registro TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clases (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre             TEXT    NOT NULL,
    descripcion        TEXT,
    id_entrenador      INTEGER NOT NULL,
    fecha_hora         TEXT    NOT NULL,
    duracion_min       INTEGER NOT NULL DEFAULT 60,
    plazas_totales     INTEGER NOT NULL DEFAULT 10,
    plazas_disponibles INTEGER NOT NULL DEFAULT 10,
    FOREIGN KEY (id_entrenador) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS reservas (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente    INTEGER NOT NULL,
    id_clase      INTEGER NOT NULL,
    fecha_reserva TEXT    NOT NULL DEFAULT (datetime('now')),
    estado        TEXT    NOT NULL DEFAULT 'confirmada'
                  CHECK(estado IN ('confirmada','cancelada','pendiente')),
    FOREIGN KEY (id_cliente) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_clase)   REFERENCES clases(id)   ON DELETE CASCADE
  );
`);

const { c } = db.prepare('SELECT COUNT(*) AS c FROM usuarios').get();

if (c === 0) {
  const hash = bcrypt.hashSync('password123', 10);

  const addUser = db.prepare(
    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)'
  );
  addUser.run('Admin BookFit', 'admin@bookfit.es',    hash, 'admin');
  addUser.run('Carlos López',  'carlos@bookfit.es',   hash, 'entrenador');
  addUser.run('María García',  'maria@bookfit.es',    hash, 'cliente');
  addUser.run('Invitado Demo', 'invitado@bookfit.es', hash, 'invitado');

  // Fechas dinámicas siempre en el futuro
  const d = (daysFromNow, hour) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return `${date.toISOString().slice(0, 10)} ${hour}:00:00`;
  };

  const addClase = db.prepare(`
    INSERT INTO clases (nombre, descripcion, id_entrenador, fecha_hora, duracion_min, plazas_totales, plazas_disponibles)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  addClase.run('Yoga Matutino',  'Sesión de yoga para empezar el día con energía.',  2, d(2, '08'), 60, 10, 9);
  addClase.run('HIIT Intensivo', 'Entrenamiento de alta intensidad por intervalos.',  2, d(2, '10'), 45,  8, 8);
  addClase.run('Pilates Core',   'Fortalecimiento del core y mejora de la postura.', 2, d(3, '09'), 60, 12, 12);
  addClase.run('Spinning',       'Clase de ciclismo indoor con música motivadora.',   2, d(3, '18'), 45, 15, 15);
  addClase.run('Boxeo Fitness',  'Técnicas de boxeo adaptadas al fitness general.',   2, d(4, '11'), 60, 10, 10);

  db.prepare('INSERT INTO reservas (id_cliente, id_clase, estado) VALUES (?, ?, ?)').run(3, 1, 'confirmada');

  console.log('📦 Base de datos inicializada con datos de prueba.');
}

module.exports = { db, JWT_SECRET };