import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { auditActions, clientSource, writeAudit } from './audit.js';
import { publicUser, requireAuth, requireOwner, signUser } from './auth.js';
import { initDb, pool } from './db.js';
import { officialPartyName } from './partyName.js';
import { parseEtRr, toIsoDate } from './parseReceipt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageRoot = path.resolve(__dirname, '../storage/pdfs');
const pendingRoot = path.resolve(__dirname, '../storage/pending');
fs.mkdirSync(storageRoot, { recursive: true });
fs.mkdirSync(pendingRoot, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const type = (file.mimetype || '').toLowerCase();
    const namedPdf = name.endsWith('.pdf');
    const typedPdf = type === 'application/pdf' || type === 'application/x-pdf';
    const unnamed = !type || type === 'application/octet-stream' || type === 'binary/octet-stream';
    if (namedPdf || typedPdf || unnamed) return cb(null, true);
    const error = new Error('Upload a PDF file.');
    error.status = 400;
    return cb(error);
  },
});

const receiptSelect = `
  SELECT
    r.id,
    r.rr_no,
    to_char(r.rr_date, 'DD-MM-YYYY') AS rr_date,
    r.fnr,
    r.station_from,
    r.station_to,
    r.commodity_description,
    r.consignor_code,
    r.consignee_code,
    r.party_name,
    r.shed_no,
    r.file_name,
    r.file_path,
    r.file_hash,
    r.status,
    r.closed_at,
    r.started_at,
    r.uploaded_at,
    r.submitted_at,
    r.uploaded_by,
    u.name AS uploader_name,
    u.username AS uploader_username,
    u.role AS uploader_role,
    (SELECT COUNT(*)::int FROM wagons w WHERE w.receipt_id = r.id) AS wagon_count
  FROM receipts r
  JOIN users u ON u.id = r.uploaded_by
`;

async function savedPartyName(typed) {
  const result = await pool.query(`SELECT name FROM parties WHERE status = 'ACTIVE' ORDER BY name`);
  return officialPartyName(typed, result.rows.map((row) => row.name));
}

function mapReceipt(row, wagons, sets) {
  const receipt = {
    id: row.id,
    rrNo: row.rr_no,
    rrDate: row.rr_date,
    fnr: row.fnr,
    stationFrom: row.station_from,
    stationTo: row.station_to,
    commodityDescription: row.commodity_description,
    consignorCode: row.consignor_code,
    consigneeCode: row.consignee_code,
    partyName: row.party_name || '',
    shedNo: row.shed_no || '',
    fileName: row.file_name,
    status: row.status,
    closed: Boolean(row.closed_at),
    started: Boolean(row.started_at),
    active: Boolean(row.started_at) && !row.closed_at,
    uploadedAt: row.uploaded_at,
    submittedAt: row.submitted_at,
    uploadedBy: {
      id: row.uploaded_by,
      name: row.uploader_name,
      username: row.uploader_username,
      role: row.uploader_role,
    },
    wagonCount: row.wagon_count,
    rrLine: `RR No: ${row.rr_no} RR Date: ${row.rr_date || ''} FNR: ${row.fnr || ''} Station From: ${row.station_from || ''} Station To: ${row.station_to || ''}`.replace(/\s+/g, ' ').trim(),
    commodityLine: `Commodity Description: ${row.commodity_description || ''}`,
  };
  if (wagons) receipt.wagons = wagons;
  if (sets) receipt.sets = sets;
  return receipt;
}

function mapWagon(row) {
  return {
    id: row.id,
    sno: row.sno,
    owningRly: row.owning_rly,
    wagonType: row.wagon_type,
    wagonNo: row.wagon_no,
    articleCount: row.article_count,
    shedNo: row.shed_no || '',
  };
}

async function setsByReceipt(receiptIds) {
  const ids = [...new Set(receiptIds.map(Number).filter(Boolean))];
  const grouped = new Map();
  if (!ids.length) return grouped;
  const [result, wagonResult] = await Promise.all([
    pool.query(
      `SELECT w.receipt_id, w.shed_no AS set_no,
              SUM(w.article_count)::int AS total_bags,
              COALESCE(MAX(used.used_bags), 0)::int AS used_bags
       FROM wagons w
       LEFT JOIN (
         SELECT t.receipt_id, l.set_no::text AS set_no, SUM(l.bags)::int AS used_bags
         FROM loads l
         JOIN trucks t ON t.id = l.truck_id
         WHERE t.receipt_id = ANY($1::int[])
         GROUP BY t.receipt_id, l.set_no
       ) used ON used.receipt_id = w.receipt_id AND used.set_no = w.shed_no
       WHERE w.receipt_id = ANY($1::int[])
       GROUP BY w.receipt_id, w.shed_no
       ORDER BY w.receipt_id,
                CASE WHEN w.shed_no ~ '^[0-9]+$' THEN w.shed_no::int ELSE 999 END,
                w.shed_no`,
      [ids]
    ),
    pool.query(
      `SELECT w.id, w.receipt_id, w.shed_no, w.wagon_no, w.sno, w.article_count,
              COALESCE(SUM(l.bags), 0)::int AS used_bags
       FROM wagons w
       LEFT JOIN loads l ON l.wagon_id = w.id
       WHERE w.receipt_id = ANY($1::int[])
       GROUP BY w.id
       ORDER BY w.sno`,
      [ids]
    ),
  ]);
  for (const row of result.rows) {
    const list = grouped.get(row.receipt_id) || [];
    const wagons = wagonResult.rows
      .filter((wagon) => wagon.receipt_id === row.receipt_id && String(wagon.shed_no) === String(row.set_no))
      .map((wagon) => ({
        id: wagon.id,
        wagonNo: wagon.wagon_no,
        articleCount: wagon.article_count,
        balanceBags: wagon.article_count - wagon.used_bags,
      }));
    list.push({
      setNo: row.set_no,
      totalBags: row.total_bags,
      balanceBags: row.total_bags - row.used_bags,
      wagons,
    });
    grouped.set(row.receipt_id, list);
  }
  return grouped;
}

async function setsFor(receiptId) {
  const grouped = await setsByReceipt([receiptId]);
  return grouped.get(Number(receiptId)) || [];
}

async function wagonsFor(receiptId) {
  const result = await pool.query(
    `SELECT w.id, w.sno, w.owning_rly, w.wagon_type, w.wagon_no,
            GREATEST(w.article_count - COALESCE(SUM(l.bags), 0), 0)::int AS article_count,
            w.shed_no
     FROM wagons w
     LEFT JOIN loads l ON l.wagon_id = w.id
     WHERE w.receipt_id = $1
     GROUP BY w.id
     ORDER BY w.sno`,
    [receiptId]
  );
  return result.rows.map(mapWagon);
}

async function findDuplicate(fileHash, rrNo) {
  const result = await pool.query(
    `${receiptSelect} WHERE r.file_hash = $1 OR r.rr_no = $2 LIMIT 1`,
    [fileHash, rrNo]
  );
  if (result.rowCount) {
    const row = result.rows[0];
    return {
      receiptId: row.id,
      reason: row.file_hash === fileHash ? 'file' : 'rr',
      rrNo: row.rr_no,
      uploadedAt: row.uploaded_at,
      uploadedBy: row.uploader_name,
      status: row.status,
    };
  }
  const master = await pool.query(
    `SELECT m.file_hash, m.rr_no, m.uploaded_at, u.name AS uploader_name
     FROM rr_masters m
     JOIN users u ON u.id = m.uploaded_by
     WHERE m.file_hash = $1 OR ($2 <> '' AND m.rr_no = $2)
     LIMIT 1`,
    [fileHash, rrNo || '']
  );
  if (master.rowCount) {
    const row = master.rows[0];
    return {
      reason: row.file_hash === fileHash ? 'file' : 'rr',
      rrNo: row.rr_no,
      uploadedAt: row.uploaded_at,
      uploadedBy: row.uploader_name,
    };
  }
  const stored = await pool.query(
    `SELECT p.file_hash, p.rr_no, p.uploaded_at, u.name AS uploader_name
     FROM uploaded_pdfs p
     JOIN users u ON u.id = p.uploaded_by
     WHERE p.receipt_id IS NOT NULL
       AND (p.file_hash = $1 OR ($2 <> '' AND p.rr_no = $2))
     LIMIT 1`,
    [fileHash, rrNo || '']
  );
  if (!stored.rowCount) return null;
  const row = stored.rows[0];
  return {
    reason: row.file_hash === fileHash ? 'file' : 'rr',
    rrNo: row.rr_no,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploader_name,
  };
}

async function findPreviousUpload(fileHash, rrNo) {
  const stored = await pool.query(
    `SELECT p.file_hash, p.rr_no, p.uploaded_at, u.name AS uploader_name
     FROM uploaded_pdfs p
     JOIN users u ON u.id = p.uploaded_by
     WHERE p.file_hash = $1 OR ($2 <> '' AND p.rr_no = $2)
     ORDER BY p.uploaded_at
     LIMIT 1`,
    [fileHash, rrNo || '']
  );
  if (!stored.rowCount) return null;
  const row = stored.rows[0];
  return {
    reason: row.file_hash === fileHash ? 'file' : 'rr',
    rrNo: row.rr_no,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploader_name,
  };
}

function duplicateMessage(duplicate) {
  const when = new Date(duplicate.uploadedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const reason = duplicate.reason === 'file'
    ? 'This PDF is already uploaded.'
    : `RR No ${duplicate.rrNo} is already uploaded.`;
  return `${reason} ${duplicate.uploadedBy} uploaded it on ${when}.`;
}

function readPending(pendingId, userId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(pendingId || ''))) return null;
  const metaPath = path.join(pendingRoot, `${pendingId}.json`);
  const pdfPath = path.join(pendingRoot, `${pendingId}.pdf`);
  if (!fs.existsSync(metaPath) || !fs.existsSync(pdfPath)) return null;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (meta.userId !== userId) return null;
  return { meta, pdfPath, metaPath };
}

function removePending(pendingId) {
  fs.rmSync(path.join(pendingRoot, `${pendingId}.pdf`), { force: true });
  fs.rmSync(path.join(pendingRoot, `${pendingId}.json`), { force: true });
}

function safeResolve(relativePath) {
  const root = path.resolve(storageRoot);
  const full = path.resolve(storageRoot, relativePath);
  if (!full.startsWith(root)) return null;
  return full;
}

const app = express();
app.use(cors());
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url} from ${req.socket.remoteAddress}`);
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(auditActions);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Goods Shed' });
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
    const result = await pool.query(
      'SELECT id, name, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];
    const source = clientSource(req);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await writeAudit({
        userName: username || 'Unknown',
        userRole: 'unknown',
        source,
        action: 'Failed sign-in',
        detail: username ? `Username ${username}` : '',
      });
      return res.status(401).json({ error: 'Wrong username or password.' });
    }
    await writeAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      source,
      action: 'Signed in',
      detail: `Username ${user.username}`,
    });
    res.json({ token: signUser(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/password', requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'The new password needs at least 6 characters.' });
    }
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!result.rowCount) return res.status(401).json({ error: 'Login required.' });
    if (!(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
      return res.status(400).json({ error: 'The current password is wrong.' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/audit-logs', requireAuth, requireOwner, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, user_name, user_role, source, action, detail, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 400`
    );
    res.json({
      logs: result.rows.map((row) => ({
        id: row.id,
        name: row.user_name,
        role: row.user_role,
        source: row.source,
        action: row.action,
        detail: row.detail || '',
        at: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, username, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rowCount) return res.status(401).json({ error: 'Login required.' });
    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard', requireAuth, async (req, res, next) => {
  try {
    const stats = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted_count,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_count,
         COUNT(*) FILTER (
           WHERE (uploaded_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         )::int AS today_count,
         COUNT(*) FILTER (WHERE uploaded_by = $1)::int AS mine_count,
         COALESCE(SUM((SELECT COUNT(*) FROM wagons w WHERE w.receipt_id = receipts.id)) FILTER (WHERE status = 'submitted'), 0)::int AS wagon_count
       FROM receipts`,
      [req.user.id]
    );
    const recent = await pool.query(`${receiptSelect} ORDER BY r.uploaded_at DESC LIMIT 8`);
    const managers = req.user.role === 'owner'
      ? await pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'manager'`)
      : { rows: [{ count: 0 }] };
    res.json({
      role: req.user.role,
      stats: {
        ...stats.rows[0],
        managerCount: managers.rows[0].count,
      },
      recent: recent.rows.map((row) => mapReceipt(row)),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users', requireAuth, requireOwner, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.username, u.role, u.created_at,
              COUNT(r.id)::int AS receipt_count
       FROM users u
       LEFT JOIN receipts r ON r.uploaded_by = u.id
       GROUP BY u.id
       ORDER BY u.created_at`
    );
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post('/api/users', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!name || !username || password.length < 6) {
      return res.status(400).json({ error: 'Name, username, and a password of at least 6 characters are required.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, username, password_hash, role)
       VALUES ($1, $2, $3, 'manager')
       RETURNING id, name, username, role, created_at`,
      [name, username, passwordHash]
    );
    res.status(201).json({ user: { ...result.rows[0], receipt_count: 0 } });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That username is already used.' });
    }
    next(error);
  }
});

app.delete('/api/users/:id', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'You cannot remove your own login.' });
    const user = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (!user.rowCount) return res.status(404).json({ error: 'User not found.' });
    if (user.rows[0].role === 'owner') return res.status(400).json({ error: 'The admin login cannot be removed.' });
    const receipts = await pool.query('SELECT id FROM receipts WHERE uploaded_by = $1 LIMIT 1', [id]);
    if (receipts.rowCount) {
      return res.status(400).json({ error: 'This manager has uploaded receipts and cannot be removed.' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/receipts', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const params = [];
    let where = '';
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE r.rr_no ILIKE $1 OR r.fnr ILIKE $1 OR r.party_name ILIKE $1
        OR r.commodity_description ILIKE $1 OR r.station_from ILIKE $1 OR r.station_to ILIKE $1
        OR u.name ILIKE $1`;
    }
    const result = await pool.query(`${receiptSelect} ${where} ORDER BY r.uploaded_at DESC LIMIT 300`, params);
    res.json({ receipts: result.rows.map((row) => mapReceipt(row)) });
  } catch (error) {
    next(error);
  }
});

async function closeReport(id, mark) {
  const receipt = await pool.query(`${receiptSelect} WHERE r.id = $1`, [id]);
  if (!receipt.rowCount) return null;
  const row = receipt.rows[0];
  if (mark) {
    if (row.status !== 'submitted') {
      const error = new Error('Submit the receipt before closing it.');
      error.status = 400;
      throw error;
    }
    await pool.query('UPDATE receipts SET closed_at = COALESCE(closed_at, NOW()) WHERE id = $1', [id]);
  }
  const trucks = await pool.query(
    `SELECT t.sno, t.trip, t.truck_no, l.bags, l.set_no, COALESCE(u.name, '') AS delivery_to
     FROM trucks t
     JOIN loads l ON l.truck_id = t.id
     LEFT JOIN party_units u ON u.id = t.unit_id
     WHERE t.receipt_id = $1
     ORDER BY t.sno`,
    [id]
  );
  const bagsTaken = trucks.rows.reduce((sum, item) => sum + Number(item.bags || 0), 0);
  const missing = await pool.query(
    `SELECT t.sno, t.trip, t.truck_no
     FROM trucks t
     LEFT JOIN loads l ON l.truck_id = t.id
     WHERE t.receipt_id = $1 AND l.id IS NULL
     ORDER BY t.sno`,
    [id]
  );
  return {
    id: row.id,
    rrNo: row.rr_no,
    rrDate: row.rr_date || '',
    fnr: row.fnr || '',
    stationFrom: row.station_from || '',
    stationTo: row.station_to || '',
    rrLine: `RR No: ${row.rr_no} RR Date: ${row.rr_date || ''} FNR: ${row.fnr || ''} Station From: ${row.station_from || ''} Station To: ${row.station_to || ''}`.replace(/\s+/g, ' ').trim(),
    commodity: row.commodity_description || '',
    partyName: row.party_name || '',
    closed: mark || Boolean(row.closed_at),
    totalBagsTaken: bagsTaken,
    trucksTaken: trucks.rowCount,
    missingLoads: missing.rows.map((item) => ({ sno: item.sno, trip: Number(item.trip) || 1, truckNo: item.truck_no })),
    trucks: trucks.rows.map((item) => ({
      sno: item.sno,
      trip: Number(item.trip) || 1,
      truckNo: item.truck_no,
      bags: item.bags,
      setNo: item.set_no,
      deliveryTo: item.delivery_to,
    })),
  };
}

app.get('/api/receipts/:id/close', requireAuth, async (req, res, next) => {
  try {
    const close = await closeReport(req.params.id, false);
    if (!close) return res.status(404).json({ error: 'Receipt not found.' });
    res.json({ close });
  } catch (error) {
    next(error);
  }
});

app.post('/api/receipts/:id/close', requireAuth, async (req, res, next) => {
  try {
    const close = await closeReport(req.params.id, true);
    if (!close) return res.status(404).json({ error: 'Receipt not found.' });
    res.json({ close });
  } catch (error) {
    next(error);
  }
});

app.post('/api/receipts/:id/start', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const existing = await pool.query('SELECT id, status, started_at, closed_at FROM receipts WHERE id = $1', [req.params.id]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Receipt not found.' });
    const row = existing.rows[0];
    if (row.status !== 'submitted') return res.status(400).json({ error: 'Save the RR before starting it.' });
    if (row.closed_at) return res.status(400).json({ error: 'This RR is closed.' });
    if (!row.started_at) {
      const active = await pool.query(`SELECT COUNT(*)::int AS count FROM receipts WHERE status = 'submitted' AND started_at IS NOT NULL AND closed_at IS NULL`);
      if (active.rows[0].count >= 2) return res.status(400).json({ error: 'Two RRs are already active. Close one before starting another.' });
      await pool.query('UPDATE receipts SET started_at = NOW() WHERE id = $1', [req.params.id]);
    }
    const result = await pool.query(`${receiptSelect} WHERE r.id = $1`, [req.params.id]);
    res.json({ receipt: mapReceipt(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/receipts/:id/open', requireAuth, requireOwner, async (req, res, next) => {
  try {
    const existing = await pool.query('SELECT id, status FROM receipts WHERE id = $1', [req.params.id]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Receipt not found.' });
    if (existing.rows[0].status !== 'submitted') return res.status(400).json({ error: 'Submit the receipt before opening it.' });
    await pool.query('UPDATE receipts SET closed_at = NULL WHERE id = $1', [req.params.id]);
    const result = await pool.query(`${receiptSelect} WHERE r.id = $1`, [req.params.id]);
    res.json({ receipt: mapReceipt(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/receipts/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(`${receiptSelect} WHERE r.id = $1`, [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Receipt not found.' });
    const wagons = await wagonsFor(result.rows[0].id);
    const sets = await setsFor(result.rows[0].id);
    res.json({ receipt: mapReceipt(result.rows[0], wagons, sets) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/receipts/:id/file', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT file_name, file_path FROM receipts WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Receipt not found.' });
    const full = safeResolve(result.rows[0].file_path);
    if (!full || !fs.existsSync(full)) return res.status(404).json({ error: 'Stored PDF was not found.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${result.rows[0].file_name.replace(/"/g, '')}"`);
    fs.createReadStream(full).pipe(res);
  } catch (error) {
    next(error);
  }
});

app.post('/api/receipts/upload', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a PDF to upload.' });
    if (!req.file.buffer.subarray(0, 5).toString().includes('%PDF')) {
      return res.status(400).json({ error: 'That file is not a valid PDF.' });
    }

    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const parsed = await parseEtRr(req.file.buffer);
    const pendingId = crypto.randomUUID();
    const originalName = req.file.originalname || `${parsed.rrNo}.pdf`;
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dir = path.join(storageRoot, day);
    fs.mkdirSync(dir, { recursive: true });
    const relative = `${day}/upload-${pendingId}.pdf`;
    fs.writeFileSync(path.join(dir, `upload-${pendingId}.pdf`), req.file.buffer);
    const stored = await pool.query(
      `INSERT INTO uploaded_pdfs (file_name, file_path, file_hash, rr_no, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [originalName, relative, fileHash, parsed.rrNo, req.user.id]
    );
    fs.writeFileSync(path.join(pendingRoot, `${pendingId}.pdf`), req.file.buffer);
    fs.writeFileSync(path.join(pendingRoot, `${pendingId}.json`), JSON.stringify({
      userId: req.user.id,
      hash: fileHash,
      originalName,
      parsed,
      uploadedPdfId: stored.rows[0].id,
    }));
    res.status(201).json({
      receipt: {
        pendingId,
        rrNo: parsed.rrNo,
        rrDate: parsed.rrDate,
        fnr: parsed.fnr,
        stationFrom: parsed.stationFrom,
        stationTo: parsed.stationTo,
        commodityDescription: parsed.commodityDescription,
        rrLine: parsed.rrLine,
        commodityLine: parsed.commodityLine,
        partyName: '',
        status: 'preview',
        wagonCount: parsed.wagons.length,
        wagons: parsed.wagons.map((wagon) => ({ ...wagon, id: wagon.sno })),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/receipts/submit', requireAuth, async (req, res, next) => {
  let movedTo = null;
  try {
    const pending = readPending(req.body.pendingId, req.user.id);
    if (!pending) return res.status(400).json({ error: 'Upload the PDF again, then enter the set no.' });

    const partyName = await savedPartyName(req.body.partyName);
    const sheds = Array.isArray(req.body.sheds) ? req.body.sheds : [];
    if (!partyName) return res.status(400).json({ error: 'Enter the party name.' });
    const shedBySno = new Map(sheds.map((item) => [Number(item.sno ?? item.id), String(item.shedNo || '').trim()]));
    if (pending.meta.parsed.wagons.some((wagon) => !shedBySno.get(wagon.sno))) {
      return res.status(400).json({ error: 'Enter the set no for each wagon.' });
    }

    const duplicate = await findDuplicate(pending.meta.hash, pending.meta.parsed.rrNo);
    if (duplicate) {
      console.log(`Note: RR ${pending.meta.parsed.rrNo} was previously uploaded. Allowing re-upload.`);
    }

    const parsed = pending.meta.parsed;
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dir = path.join(storageRoot, day);
    fs.mkdirSync(dir, { recursive: true });
    const storedName = `${parsed.rrNo}-${req.body.pendingId}.pdf`;
    const relative = `${day}/${storedName}`;
    movedTo = path.join(dir, storedName);
    fs.renameSync(pending.pdfPath, movedTo);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO receipts (
           rr_no, rr_date, fnr, station_from, station_to, commodity_description,
           consignor_code, consignee_code, party_name, file_name, file_path, file_hash,
           status, submitted_at, uploaded_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'submitted', NOW(), $13)
         RETURNING id`,
        [
          parsed.rrNo,
          toIsoDate(parsed.rrDate),
          parsed.fnr,
          parsed.stationFrom,
          parsed.stationTo,
          parsed.commodityDescription,
          parsed.consignorCode,
          parsed.consigneeCode,
          partyName,
          pending.meta.originalName,
          relative,
          pending.meta.hash,
          req.user.id,
        ]
      );
      const receiptId = inserted.rows[0].id;
      for (const wagon of parsed.wagons) {
        await client.query(
          `INSERT INTO wagons (receipt_id, sno, owning_rly, wagon_type, wagon_no, article_count, shed_no)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [receiptId, wagon.sno, wagon.owningRly, wagon.wagonType, wagon.wagonNo, wagon.articleCount, shedBySno.get(wagon.sno)]
        );
      }
      await client.query(
        `INSERT INTO rr_masters (file_name, file_path, file_hash, rr_no, uploaded_by, receipt_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (file_hash) DO UPDATE SET receipt_id = COALESCE(rr_masters.receipt_id, EXCLUDED.receipt_id)`,
        [pending.meta.originalName, relative, pending.meta.hash, parsed.rrNo, req.user.id, receiptId]
      );
      if (pending.meta.uploadedPdfId) {
        await client.query('UPDATE uploaded_pdfs SET receipt_id = $1 WHERE id = $2', [receiptId, pending.meta.uploadedPdfId]);
      }
      await client.query('COMMIT');
      fs.rmSync(pending.metaPath, { force: true });
      const saved = await pool.query(`${receiptSelect} WHERE r.id = $1`, [receiptId]);
      res.status(201).json({ receipt: mapReceipt(saved.rows[0], await wagonsFor(receiptId), await setsFor(receiptId)) });
    } catch (error) {
      await client.query('ROLLBACK');
      if (movedTo) fs.rmSync(movedTo, { force: true });
      if (error.code === '23505') {
        removePending(req.body.pendingId);
        return res.status(409).json({ error: 'This PDF is already uploaded.' });
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

app.post('/api/receipts/:id/submit', requireAuth, async (req, res, next) => {
  try {
    const existing = await pool.query('SELECT id, uploaded_by, status FROM receipts WHERE id = $1', [req.params.id]);
    if (!existing.rowCount) return res.status(404).json({ error: 'Receipt not found.' });
    const receipt = existing.rows[0];
    const partyName = await savedPartyName(req.body.partyName);
    const sheds = Array.isArray(req.body.sheds) ? req.body.sheds : [];
    if (!partyName) return res.status(400).json({ error: 'Enter the party name.' });

    const wagons = await pool.query('SELECT id FROM wagons WHERE receipt_id = $1 ORDER BY sno', [receipt.id]);
    const shedById = new Map(sheds.map((item) => [Number(item.id), String(item.shedNo || '').trim()]));
    if (wagons.rows.some((wagon) => !shedById.get(wagon.id))) {
      return res.status(400).json({ error: 'Enter the set no for each wagon.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const wagon of wagons.rows) {
        await client.query('UPDATE wagons SET shed_no = $1 WHERE id = $2', [shedById.get(wagon.id), wagon.id]);
      }
      await client.query(
        `UPDATE receipts
         SET party_name = $1,
             shed_no = NULL,
             status = 'submitted',
             submitted_at = COALESCE(submitted_at, NOW())
         WHERE id = $2`,
        [partyName, receipt.id]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const saved = await pool.query(`${receiptSelect} WHERE r.id = $1`, [receipt.id]);
    res.json({ receipt: mapReceipt(saved.rows[0], await wagonsFor(receipt.id), await setsFor(receipt.id)) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/uploaded-pdfs', requireAuth, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.file_name, p.rr_no, p.uploaded_at, p.receipt_id, u.name AS uploader_name
       FROM uploaded_pdfs p
       JOIN users u ON u.id = p.uploaded_by
       ORDER BY p.uploaded_at DESC`
    );
    res.json({
      pdfs: result.rows.map((row) => ({
        id: row.id,
        fileName: row.file_name,
        rrNo: row.rr_no || '',
        uploadedAt: row.uploaded_at,
        receiptId: row.receipt_id,
        uploadedBy: row.uploader_name,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/uploaded-pdfs/:id/file', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT file_name, file_path FROM uploaded_pdfs WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Uploaded PDF was not found.' });
    const full = safeResolve(result.rows[0].file_path);
    if (!full || !fs.existsSync(full)) return res.status(404).json({ error: 'Stored PDF was not found.' });
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${result.rows[0].file_name.replace(/"/g, '')}"`);
    fs.createReadStream(full).pipe(res);
  } catch (error) {
    next(error);
  }
});

app.get('/api/rr-masters', requireAuth, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.id, m.file_name, m.rr_no, m.uploaded_at, m.receipt_id, u.name AS uploader_name
       FROM rr_masters m
       JOIN users u ON u.id = m.uploaded_by
       ORDER BY m.uploaded_at DESC`
    );
    res.json({
      masters: result.rows.map((row) => ({
        id: row.id,
        fileName: row.file_name,
        rrNo: row.rr_no || '',
        uploadedAt: row.uploaded_at,
        receiptId: row.receipt_id,
        uploadedBy: row.uploader_name,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/rr-masters/:id/file', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT file_name, file_path FROM rr_masters WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Original PDF was not found.' });
    const full = safeResolve(result.rows[0].file_path);
    if (!full || !fs.existsSync(full)) return res.status(404).json({ error: 'Stored PDF was not found.' });
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${result.rows[0].file_name.replace(/"/g, '')}"`);
    fs.createReadStream(full).pipe(res);
  } catch (error) {
    next(error);
  }
});

app.post('/api/rr-masters', requireAuth, upload.single('file'), async (req, res, next) => {
  let storedPath = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose the original PDF.' });
    if (!req.file.buffer.subarray(0, 5).toString().includes('%PDF')) {
      return res.status(400).json({ error: 'That file is not a valid PDF.' });
    }
    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    let rrNo = '';
    try {
      rrNo = (await parseEtRr(req.file.buffer)).rrNo || '';
    } catch {
      rrNo = '';
    }
    const duplicate = await findDuplicate(fileHash, rrNo);
    if (duplicate) return res.status(409).json({ error: duplicateMessage(duplicate) });

    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dir = path.join(storageRoot, day);
    fs.mkdirSync(dir, { recursive: true });
    const originalName = req.file.originalname || 'rr-master.pdf';
    const storedName = `master-${crypto.randomUUID()}.pdf`;
    const relative = `${day}/${storedName}`;
    storedPath = path.join(dir, storedName);
    fs.writeFileSync(storedPath, req.file.buffer);

    const inserted = await pool.query(
      `INSERT INTO rr_masters (file_name, file_path, file_hash, rr_no, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, file_name, rr_no, uploaded_at`,
      [originalName, relative, fileHash, rrNo || null, req.user.id]
    );
    const row = inserted.rows[0];
    res.status(201).json({
      master: {
        id: row.id,
        fileName: row.file_name,
        rrNo: row.rr_no || '',
        uploadedAt: row.uploaded_at,
        receiptId: null,
        uploadedBy: req.user.name,
      },
    });
  } catch (error) {
    if (storedPath) fs.rmSync(storedPath, { force: true });
    if (error.code === '23505') return res.status(409).json({ error: 'This PDF is already uploaded.' });
    next(error);
  }
});

function todayInIndia() {
  const iso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [year, month, day] = iso.split('-');
  return { iso, display: `${day}-${month}-${year}` };
}

function mapSource(row) {
  return {
    id: row.id,
    rrNo: row.rr_no,
    rrDate: row.rr_date || '',
    fnr: row.fnr || '',
    stationFrom: row.station_from || '',
    stationTo: row.station_to || '',
    rrLine: `RR No: ${row.rr_no} RR Date: ${row.rr_date || ''} FNR: ${row.fnr || ''} Station From: ${row.station_from || ''} Station To: ${row.station_to || ''}`.replace(/\s+/g, ' ').trim(),
    commodity: row.commodity_description || '',
    partyName: row.party_name || '',
    deliveryTo: row.station_to || '',
    closed: Boolean(row.closed_at),
  };
}

const truckSelect = `
  SELECT t.id, t.sno, t.trip, t.truck_date::text AS truck_date, t.truck_no,
         r.rr_no, to_char(r.rr_date, 'DD-MM-YYYY') AS rr_date, r.fnr,
         r.station_from, r.station_to, r.commodity_description,
         COALESCE(p.name, '') AS party_name,
         COALESCE(u.name, '') AS delivery_to,
         t.receipt_id
  FROM trucks t
  JOIN receipts r ON r.id = t.receipt_id
  LEFT JOIN parties p ON p.id = t.party_id
  LEFT JOIN party_units u ON u.id = t.unit_id
`;

function mapTruck(row) {
  const [year, month, day] = String(row.truck_date).slice(0, 10).split('-');
  return {
    id: row.id,
    sno: row.sno,
    trip: Number(row.trip) || 1,
    receiptId: row.receipt_id,
    date: day && month && year ? `${day}-${month}-${year}` : row.truck_date,
    truckNo: row.truck_no,
    commodity: row.commodity_description || '',
    partyName: row.party_name || '',
    deliveryTo: row.delivery_to || '',
    rrNo: row.rr_no,
    rrDate: row.rr_date || '',
    fnr: row.fnr || '',
    stationFrom: row.station_from || '',
    stationTo: row.station_to || '',
    rrLine: `RR No: ${row.rr_no} RR Date: ${row.rr_date || ''} FNR: ${row.fnr || ''} Station From: ${row.station_from || ''} Station To: ${row.station_to || ''}`.replace(/\s+/g, ' ').trim(),
  };
}

app.get('/api/trucks', requireAuth, async (_req, res, next) => {
  try {
    const sources = await pool.query(
      `SELECT id, rr_no, to_char(rr_date, 'DD-MM-YYYY') AS rr_date, fnr,
              station_from, station_to, commodity_description, party_name
       FROM receipts
       WHERE status = 'submitted' AND started_at IS NOT NULL AND closed_at IS NULL
       ORDER BY started_at DESC NULLS LAST, id DESC`
    );
    const trucks = await pool.query(`${truckSelect} ORDER BY t.sno DESC`);
    const partyRows = await pool.query(
      `SELECT p.id AS party_id, p.name AS party_name, u.id AS unit_id, u.name AS unit_name
       FROM parties p
       LEFT JOIN party_units u ON u.party_id = p.id AND u.status = 'ACTIVE'
       WHERE p.status = 'ACTIVE'
       ORDER BY p.name, u.name`
    );
    const parties = [];
    for (const row of partyRows.rows) {
      let party = parties.find((item) => item.id === row.party_id);
      if (!party) {
        party = { id: row.party_id, name: row.party_name, units: [] };
        parties.push(party);
      }
      if (row.unit_id) party.units.push({ id: row.unit_id, name: row.unit_name });
    }
    const next = await pool.query(
      `SELECT r.id, COALESCE(MAX(t.sno), 0) + 1 AS next_sno
       FROM receipts r
       LEFT JOIN trucks t ON t.receipt_id = r.id
       WHERE r.status = 'submitted' AND r.started_at IS NOT NULL AND r.closed_at IS NULL
       GROUP BY r.id`
    );
    res.json({
      nextByReceipt: Object.fromEntries(next.rows.map((row) => [row.id, row.next_sno])),
      date: todayInIndia().display,
      sources: sources.rows.map(mapSource),
      parties,
      trucks: trucks.rows.map(mapTruck),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/trucks', requireAuth, async (req, res, next) => {
  try {
    const truckNo = String(req.body.truckNo || '').trim();
    const receiptId = Number(req.body.receiptId);
    const partyId = Number(req.body.partyId);
    const unitId = Number(req.body.unitId);
    if (!truckNo) return res.status(400).json({ error: 'Enter the truck number.' });
    const source = await pool.query(
      `SELECT id FROM receipts WHERE id = $1 AND status = 'submitted' AND started_at IS NOT NULL AND closed_at IS NULL`,
      [receiptId]
    );
    if (!source.rowCount) return res.status(400).json({ error: 'The admin has to start this RR before truck entry.' });
    const unit = await pool.query(
      `SELECT id FROM party_units WHERE id = $1 AND party_id = $2 AND status = 'ACTIVE'`,
      [unitId, partyId]
    );
    if (!unit.rowCount) return res.status(400).json({ error: 'Choose the party, then choose a delivery unit.' });

    const date = todayInIndia().iso;
    const clientTrip = Number(req.body.trip) || null;
    const inserted = await pool.query(
      `INSERT INTO trucks (sno, trip, truck_date, truck_no, receipt_id, party_id, unit_id, created_by)
       VALUES (
         (SELECT COALESCE(MAX(sno), 0) + 1 FROM trucks WHERE receipt_id = $3),
         COALESCE($7, (SELECT COALESCE(COUNT(*), 0) + 1 FROM trucks WHERE receipt_id = $3 AND UPPER(TRIM(truck_no)) = UPPER(TRIM($2)))),
         $1, $2, $3, $4, $5, $6
       )
       RETURNING id`,
      [date, truckNo, receiptId, partyId, unitId, req.user.id, clientTrip]
    );
    const saved = await pool.query(`${truckSelect} WHERE t.id = $1`, [inserted.rows[0].id]);
    res.status(201).json({ truck: mapTruck(saved.rows[0]) });
  } catch (error) {
    next(error);
  }
});

const loadSelect = `
  SELECT t.id, t.sno, t.trip, t.truck_date::text AS truck_date, t.truck_no,
         r.rr_no, to_char(r.rr_date, 'DD-MM-YYYY') AS rr_date, r.fnr,
         r.station_from, r.station_to, r.commodity_description,
         COALESCE(p.name, '') AS party_name,
         COALESCE(u.name, '') AS delivery_to,
         r.id AS receipt_id, r.closed_at,
         l.id AS load_id, l.bags, l.set_no, l.wagon_id, w.wagon_no
  FROM trucks t
  JOIN receipts r ON r.id = t.receipt_id
  LEFT JOIN parties p ON p.id = t.party_id
  LEFT JOIN party_units u ON u.id = t.unit_id
  LEFT JOIN loads l ON l.truck_id = t.id
  LEFT JOIN wagons w ON w.id = l.wagon_id
`;

function mapLoad(row, sets = []) {
  const truck = mapTruck(row);
  return {
    ...truck,
    receiptId: row.receipt_id,
    closed: Boolean(row.closed_at),
    sets,
    load: row.load_id ? {
      id: row.load_id,
      bags: row.bags,
      setNo: row.set_no,
      wagonId: row.wagon_id,
      wagonNo: row.wagon_no || '',
    } : null,
  };
}

app.get('/api/reports', requireAuth, requireOwner, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT t.sno, t.trip, t.truck_no, t.truck_date::text AS truck_date,
              r.id AS receipt_id, r.rr_no, to_char(r.rr_date, 'DD-MM-YYYY') AS rr_date, r.fnr,
              r.station_from, r.station_to, r.commodity_description,
              COALESCE(p.name, '') AS party_name,
              COALESCE(u.name, '') AS delivery_to,
              l.bags, l.set_no, l.wagon_id, w.wagon_no
       FROM loads l
       JOIN trucks t ON t.id = l.truck_id
       JOIN receipts r ON r.id = t.receipt_id
       LEFT JOIN parties p ON p.id = t.party_id
       LEFT JOIN party_units u ON u.id = t.unit_id
       LEFT JOIN wagons w ON w.id = l.wagon_id
       ORDER BY t.truck_date DESC, t.sno`
    );
    const sets = await setsByReceipt(result.rows.map((row) => row.receipt_id));
    res.json({
      rows: result.rows.map((row) => {
        const [year, month, day] = String(row.truck_date).slice(0, 10).split('-');
        const selected = (sets.get(row.receipt_id) || []).find((set) => String(set.setNo) === String(row.set_no));
        const wagon = (selected?.wagons || []).find((item) => item.id === row.wagon_id) || null;
        return {
          sno: row.sno,
          trip: Number(row.trip) || 1,
          truckNo: row.truck_no,
          date: day && month && year ? `${day}-${month}-${year}` : row.truck_date,
          rrNo: row.rr_no,
          rrDate: row.rr_date || '',
          fnr: row.fnr || '',
          stationFrom: row.station_from || '',
          stationTo: row.station_to || '',
          commodity: row.commodity_description || '',
          partyName: row.party_name || '',
          deliveryTo: row.delivery_to || '',
          bags: row.bags,
          setNo: row.set_no,
          wagonNo: row.wagon_no || wagon?.wagonNo || '',
          totalBags: wagon?.articleCount ?? selected?.totalBags ?? '',
          balanceBags: wagon?.balanceBags ?? selected?.balanceBags ?? '',
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/loads', requireAuth, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `${loadSelect}
       WHERE r.status = 'submitted' AND r.started_at IS NOT NULL AND r.closed_at IS NULL
       ORDER BY t.sno`
    );
    const sources = await pool.query(
      `SELECT id, rr_no, to_char(rr_date, 'DD-MM-YYYY') AS rr_date, fnr,
              station_from, station_to, commodity_description, party_name
       FROM receipts
       WHERE status = 'submitted' AND started_at IS NOT NULL AND closed_at IS NULL
       ORDER BY started_at DESC NULLS LAST, id DESC`
    );
    const closed = await pool.query(
      `SELECT id, rr_no, to_char(rr_date, 'DD-MM-YYYY') AS rr_date,
              station_from, station_to, party_name
       FROM receipts
       WHERE status = 'submitted' AND closed_at IS NOT NULL
       ORDER BY closed_at DESC, id DESC`
    );
    const sets = await setsByReceipt(result.rows.map((row) => row.receipt_id));
    res.json({
      sources: sources.rows.map(mapSource),
      trucks: result.rows.map((row) => mapLoad(row, sets.get(row.receipt_id) || [])),
      closed: closed.rows.map((row) => ({
        id: row.id,
        rrNo: row.rr_no,
        rrDate: row.rr_date || '',
        stationFrom: row.station_from || '',
        stationTo: row.station_to || '',
        partyName: row.party_name || '',
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/loads/closed/:id', requireAuth, async (req, res, next) => {
  try {
    const receipt = await pool.query(
      `SELECT id, rr_no, to_char(rr_date, 'DD-MM-YYYY') AS rr_date, fnr,
              station_from, station_to, commodity_description, party_name, closed_at
       FROM receipts
       WHERE id = $1 AND status = 'submitted'`,
      [req.params.id]
    );
    if (!receipt.rowCount || !receipt.rows[0].closed_at) return res.status(404).json({ error: 'Closed RR not found.' });
    const row = receipt.rows[0];
    const sets = await setsFor(row.id);
    const trucks = await pool.query(
      `SELECT t.sno, t.trip, t.truck_no, COALESCE(u.name, '') AS delivery_to,
              l.bags, l.set_no, w.wagon_no
       FROM trucks t
       LEFT JOIN loads l ON l.truck_id = t.id
       LEFT JOIN wagons w ON w.id = l.wagon_id
       LEFT JOIN party_units u ON u.id = t.unit_id
       WHERE t.receipt_id = $1
       ORDER BY t.sno`,
      [row.id]
    );
    const totalBags = sets.reduce((sum, set) => sum + Number(set.totalBags || 0), 0);
    const balanceBags = sets.reduce((sum, set) => sum + Number(set.balanceBags || 0), 0);
    const gone = trucks.rows.filter((item) => item.bags != null);
    res.json({
      report: {
        id: row.id,
        rrNo: row.rr_no,
        rrDate: row.rr_date || '',
        fnr: row.fnr || '',
        stationFrom: row.station_from || '',
        stationTo: row.station_to || '',
        commodity: row.commodity_description || '',
        partyName: row.party_name || '',
        trucksGone: gone.length,
        totalBags,
        bagsTaken: gone.reduce((sum, item) => sum + Number(item.bags || 0), 0),
        balanceBags,
        sets,
        trucks: trucks.rows.map((item) => ({
          sno: item.sno,
          trip: Number(item.trip) || 1,
          truckNo: item.truck_no,
          deliveryTo: item.delivery_to || '',
          bags: item.bags,
          setNo: item.set_no,
          wagonNo: item.wagon_no || '',
          entered: item.bags != null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/loads', requireAuth, async (req, res, next) => {
  const truckId = Number(req.body.truckId);
  const bags = Number(req.body.bags);
  const setNo = Number(req.body.setNo);
  const wagonId = Number(req.body.wagonId);
  if (!Number.isInteger(bags) || bags < 1) return res.status(400).json({ error: 'Enter the number of bags.' });
  if (!Number.isInteger(setNo) || setNo < 1 || setNo > 18) return res.status(400).json({ error: 'Choose a set number from 1 to 18.' });
  if (!Number.isInteger(wagonId) || wagonId < 1) return res.status(400).json({ error: 'Choose the wagon number.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const truck = await client.query('SELECT id, receipt_id FROM trucks WHERE id = $1', [truckId]);
    if (!truck.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose a truck entry.' });
    }
    const receiptId = truck.rows[0].receipt_id;
    const closed = await client.query('SELECT closed_at, started_at FROM receipts WHERE id = $1', [receiptId]);
    if (closed.rows[0]?.closed_at) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This RR is closed.' });
    }
    if (!closed.rows[0]?.started_at) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'The admin has to start this RR before load entry.' });
    }
    const wagon = await client.query(
      `SELECT id, wagon_no, article_count, shed_no
       FROM wagons
       WHERE id = $1 AND receipt_id = $2
       FOR UPDATE`,
      [wagonId, receiptId]
    );
    if (!wagon.rowCount || String(wagon.rows[0].shed_no) !== String(setNo)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose a wagon from the selected set.' });
    }
    const used = await client.query(
      'SELECT COALESCE(SUM(bags), 0)::int AS used_bags FROM loads WHERE wagon_id = $1',
      [wagonId]
    );
    const balanceBags = wagon.rows[0].article_count - used.rows[0].used_bags;
    if (bags > balanceBags) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Wagon ${wagon.rows[0].wagon_no} has ${balanceBags} bags left.` });
    }
    const inserted = await client.query(
      `INSERT INTO loads (truck_id, bags, set_no, wagon_id, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [truckId, bags, setNo, wagonId, req.user.id]
    );
    await client.query('COMMIT');
    const saved = await pool.query(`${loadSelect} WHERE t.id = $1`, [truckId]);
    const sets = await setsFor(receiptId);
    res.status(201).json({ truck: mapLoad(saved.rows[0], sets), loadId: inserted.rows[0].id });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'This truck already has a load entry.' });
    next(error);
  } finally {
    client.release();
  }
});

function mapParty(row) {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person || '',
    mobileNumber: row.mobile_number || '',
    address: row.address || '',
    status: row.status,
    unitCount: row.unit_count ?? 0,
  };
}

function mapUnit(row) {
  return {
    id: row.id,
    partyId: row.party_id,
    name: row.name,
    rate: Number(row.rate),
    status: row.status,
  };
}

app.get('/api/parties', requireAuth, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, COUNT(u.id)::int AS unit_count
       FROM parties p
       LEFT JOIN party_units u ON u.party_id = p.id
       GROUP BY p.id
       ORDER BY p.name`
    );
    res.json({ parties: result.rows.map(mapParty) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/parties', requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Enter the party name.' });
    const result = await pool.query(
      `INSERT INTO parties (name, contact_person, mobile_number, address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, String(req.body.contactPerson || '').trim() || null, String(req.body.mobileNumber || '').trim() || null, String(req.body.address || '').trim() || null]
    );
    res.status(201).json({ party: mapParty({ ...result.rows[0], unit_count: 0 }) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That party is already saved.' });
    next(error);
  }
});

app.put('/api/parties/:id', requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Enter the party name.' });
    const status = req.body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const result = await pool.query(
      `UPDATE parties
       SET name = $1, contact_person = $2, mobile_number = $3, address = $4, status = $5
       WHERE id = $6
       RETURNING *`,
      [name, String(req.body.contactPerson || '').trim() || null, String(req.body.mobileNumber || '').trim() || null, String(req.body.address || '').trim() || null, status, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Party not found.' });
    const count = await pool.query('SELECT COUNT(*)::int AS unit_count FROM party_units WHERE party_id = $1', [req.params.id]);
    res.json({ party: mapParty({ ...result.rows[0], unit_count: count.rows[0].unit_count }) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That party is already saved.' });
    next(error);
  }
});

app.get('/api/parties/:id/units', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, party_id, name, rate, status FROM party_units WHERE party_id = $1 ORDER BY name`,
      [req.params.id]
    );
    res.json({ units: result.rows.map(mapUnit) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/parties/:id/units', requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Enter the unit name.' });
    const party = await pool.query('SELECT id FROM parties WHERE id = $1', [req.params.id]);
    if (!party.rowCount) return res.status(404).json({ error: 'Party not found.' });
    const result = await pool.query(
      `INSERT INTO party_units (party_id, name) VALUES ($1, $2) RETURNING *`,
      [req.params.id, name]
    );
    res.status(201).json({ unit: mapUnit(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That unit is already saved for this party.' });
    next(error);
  }
});

app.put('/api/party-units/:id', requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Enter the unit name.' });
    const status = req.body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const result = await pool.query(
      `UPDATE party_units SET name = $1, status = $2 WHERE id = $3 RETURNING *`,
      [name, status, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Unit not found.' });
    res.json({ unit: mapUnit(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That unit is already saved for this party.' });
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'PDF must be 20 MB or smaller.' });
  }
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server.' : error.message });
});

const port = Number(process.env.PORT || 4000);
await initDb();
app.listen(port, '0.0.0.0', () => {
  console.log(`KSP Goods Shed API listening on http://localhost:${port}`);
});
