import jwt from 'jsonwebtoken';

export function signUser(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.role === 'owner' ? 'Admin' : user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.role === 'owner' ? 'Admin' : user.name,
    username: user.username,
    role: user.role,
  };
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Login required.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please login again.' });
  }
}

export function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Only the admin can do that.' });
  }
  return next();
}
