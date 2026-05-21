const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/db');

// Verifica que la petición lleva un token JWT válido
function requireAuth(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Verifica autenticación Y que el rol esté entre los permitidos
function requireRole(...roles) {
  return [
    requireAuth,
    (req, res, next) => {
      if (!roles.includes(req.user.rol)) {
        return res.status(403).json({ error: 'No tienes permisos para esta acción' });
      }
      next();
    },
  ];
}

module.exports = { requireAuth, requireRole };
