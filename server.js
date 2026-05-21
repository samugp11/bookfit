const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Sirve el frontend como archivos estáticos
app.use(express.static(path.join(__dirname, 'frontend')));

// Rutas de la API
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/clases',   require('./routes/clases'));
app.use('/api/reservas', require('./routes/reservas'));
app.use('/api/usuarios', require('./routes/usuarios'));

// Cualquier otra ruta devuelve el index.html (SPA fallback)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ BookFit corriendo en http://localhost:${PORT}`);
});
