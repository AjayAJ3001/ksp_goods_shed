import { pool } from './db.js';

export function clientSource(req) {
  const value = String(req.get('x-client') || '').toLowerCase();
  return value === 'admin' || value === 'mobile' ? value : 'unknown';
}

export async function writeAudit({ userId = null, userName, userRole, source, action, detail = '' }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, source, action, detail)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, userName || 'Unknown', userRole || 'unknown', source || 'unknown', action, detail || '']
    );
  } catch (error) {
    console.error('Audit log failed', error.message);
  }
}

function text(value) {
  return String(value || '').trim();
}

function actionFor(req) {
  const { method, path } = req;
  const body = req.body || {};
  if (method === 'POST' && path === '/api/auth/logout') return { label: 'Signed out', detail: '' };
  if (method === 'POST' && path === '/api/auth/password') return { label: 'Changed the password', detail: '' };
  if (method === 'POST' && path === '/api/receipts/upload') return { label: 'Uploaded an RR PDF', detail: '' };
  if (method === 'POST' && path === '/api/receipts/submit') return { label: 'Saved an RR', detail: text(body.partyName) ? `Party ${text(body.partyName)}` : '' };
  if (method === 'POST' && /^\/api\/receipts\/\d+\/submit$/.test(path)) return { label: 'Saved an RR', detail: text(body.partyName) ? `Party ${text(body.partyName)}` : '' };
  if (method === 'POST' && /^\/api\/receipts\/\d+\/close$/.test(path)) return { label: 'Closed an RR', detail: '' };
  if (method === 'POST' && /^\/api\/receipts\/\d+\/open$/.test(path)) return { label: 'Reopened an RR', detail: '' };
  if (method === 'POST' && path === '/api/trucks') return { label: 'Added a truck', detail: text(body.truckNo) ? `Truck ${text(body.truckNo)}` : '' };
  if (method === 'POST' && path === '/api/loads') return { label: 'Saved a load entry', detail: body.bags ? `${body.bags} bags, set ${body.setNo || ''}` : '' };
  if (method === 'POST' && path === '/api/parties') return { label: 'Added a party', detail: text(body.name) };
  if (method === 'PUT' && /^\/api\/parties\/\d+$/.test(path)) return { label: 'Updated a party', detail: text(body.name) };
  if (method === 'POST' && /^\/api\/parties\/\d+\/units$/.test(path)) return { label: 'Added a delivery unit', detail: text(body.name) };
  if (method === 'PUT' && /^\/api\/party-units\/\d+$/.test(path)) return { label: 'Updated a delivery unit', detail: text(body.name) };
  if (method === 'POST' && path === '/api/users') return { label: 'Created a user', detail: text(body.username) ? `Username ${text(body.username)}` : '' };
  if (method === 'DELETE' && /^\/api\/users\/\d+$/.test(path)) return { label: 'Removed a user', detail: '' };
  if (method === 'POST' && path === '/api/rr-masters') return { label: 'Stored an original PDF', detail: '' };
  if (method === 'GET' && path === '/api/reports') return { label: 'Viewed the reports', detail: '' };
  if (method === 'GET' && path === '/api/audit-logs') return { label: 'Opened the audit log', detail: '' };
  if (method === 'GET' && /\/file$/.test(path)) return { label: 'Opened a stored PDF', detail: '' };
  return null;
}

export function auditActions(req, res, next) {
  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.user) return;
    const action = actionFor(req);
    if (!action) return;
    writeAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      source: clientSource(req),
      action: action.label,
      detail: action.detail,
    });
  });
  next();
}
