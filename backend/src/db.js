import bcrypt from 'bcryptjs';
import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  rr_no TEXT NOT NULL UNIQUE,
  rr_date DATE,
  fnr TEXT,
  station_from TEXT,
  station_to TEXT,
  commodity_description TEXT,
  consignor_code TEXT,
  consignee_code TEXT,
  party_name TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  shed_no TEXT,
  uploaded_by INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS rr_masters (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL UNIQUE,
  rr_no TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  receipt_id INTEGER REFERENCES receipts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS trucks (
  id SERIAL PRIMARY KEY,
  sno INTEGER NOT NULL UNIQUE,
  truck_date DATE NOT NULL,
  truck_no TEXT NOT NULL,
  receipt_id INTEGER NOT NULL REFERENCES receipts(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loads (
  id SERIAL PRIMARY KEY,
  truck_id INTEGER NOT NULL UNIQUE REFERENCES trucks(id),
  bags INTEGER NOT NULL CHECK (bags > 0),
  set_no INTEGER NOT NULL CHECK (set_no BETWEEN 1 AND 18),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  mobile_number TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS party_units (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (party_id, name)
);

CREATE TABLE IF NOT EXISTS wagons (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  sno INTEGER NOT NULL,
  owning_rly TEXT NOT NULL,
  wagon_type TEXT NOT NULL,
  wagon_no TEXT NOT NULL,
  article_count INTEGER NOT NULL,
  shed_no TEXT,
  UNIQUE (receipt_id, sno)
);
`;

async function seedUsers() {
  const seeds = [
    ['Owner', 'admin', 'admin123', 'owner'],
    ['Shed Manager', 'manager', 'manager123', 'manager'],
  ];
  for (const [name, username, password, role] of seeds) {
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rowCount) continue;
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, $4)`,
      [name, username, passwordHash, role]
    );
  }
}

const kspParties = [
  'KRISHI NUTRITION COMPANY',
  'KUPPANNA POULTRY FARM',
  'SWAMI FEEDS',
  'VENKATESHWARA HATCHERIES',
  'SENTHIL ANDAVAR FEEDS',
];

const kspUnits = [
  ['KRISHI NUTRITION COMPANY', 'SIPCOT', 300],
  ['KRISHI NUTRITION COMPANY', 'RGS-VAVIKADAI', 300],
  ['KRISHI NUTRITION COMPANY', 'GOBI-SAKTHI FEEDS', 400],
  ['KRISHI NUTRITION COMPANY', 'PALLADAM-PPK HATCHERIES', 550],
  ['KRISHI NUTRITION COMPANY', 'PAPPAMPATTI-VALARMATHI FEEDS', 595],
  ['KRISHI NUTRITION COMPANY', 'NACHIPALAYAM-SUGUNA FEEDS', 650],
  ['KRISHI NUTRITION COMPANY', 'NAMAKKAL', 465],
  ['KRISHI NUTRITION COMPANY', 'PUDHUCHATHARAM', 465],
  ['KRISHI NUTRITION COMPANY', 'VENNANTHUR', 445],
  ['KUPPANNA POULTRY FARM', 'MUTHUR', 350],
  ['KUPPANNA POULTRY FARM', 'VELLAKOOIL', 400],
  ['KUPPANNA POULTRY FARM', 'MULLANUR', 490],
  ['SWAMI FEEDS', 'MULLANUR', 475],
  ['VENKATESHWARA HATCHERIES', 'KUNDADAM', 450],
  ['SENTHIL ANDAVAR FEEDS', 'PALANI', 600],
];

async function seedParties() {
  for (const name of kspParties) {
    await pool.query(
      `INSERT INTO parties (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [name]
    );
  }
  for (const [partyName, unitName, rate] of kspUnits) {
    await pool.query(
      `INSERT INTO party_units (party_id, name, rate)
       SELECT id, $2, $3 FROM parties WHERE name = $1
       ON CONFLICT (party_id, name) DO NOTHING`,
      [partyName, unitName, rate]
    );
  }
}

export async function initDb() {
  await pool.query(schema);
  await pool.query('ALTER TABLE receipts ADD COLUMN IF NOT EXISTS shed_no TEXT');
  await pool.query('ALTER TABLE receipts ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE trucks ADD COLUMN IF NOT EXISTS party_id INTEGER REFERENCES parties(id)');
  await pool.query('ALTER TABLE trucks ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES party_units(id)');
  await seedParties();
  await pool.query(`
    INSERT INTO rr_masters (file_name, file_path, file_hash, rr_no, uploaded_at, uploaded_by, receipt_id)
    SELECT file_name, file_path, file_hash, rr_no, uploaded_at, uploaded_by, id
    FROM receipts
    ON CONFLICT (file_hash) DO NOTHING
  `);
  await seedUsers();
}
