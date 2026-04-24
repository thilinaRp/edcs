import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('records.db');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS ledger (
    id TEXT PRIMARY KEY,
    ledgerNumber TEXT NOT NULL,
    epf TEXT,
    zoneSection TEXT,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    district TEXT NOT NULL,
    schoolDepartment TEXT,
    currentHolderId TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (currentHolderId) REFERENCES ledger(id)
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    fileId TEXT NOT NULL,
    fromId TEXT NOT NULL,
    toId TEXT NOT NULL,
    district TEXT NOT NULL,
    schoolDepartment TEXT,
    notes TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (fileId) REFERENCES files(id),
    FOREIGN KEY (toId) REFERENCES ledger(id)
  );
`);

// Simple migration: if people table exists, move data to ledger and drop people
try {
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='people'").get();
  if (tableExists) {
    console.log('Migrating people table to ledger...');
    db.prepare('INSERT OR IGNORE INTO ledger SELECT * FROM people').run();
    db.prepare('DROP TABLE people').run();
    console.log('Migration complete.');
  }

  // Migration: Add schoolDepartment to files if missing
  const columns = db.prepare("PRAGMA table_info(files)").all() as any[];
  if (!columns.find(c => c.name === 'schoolDepartment')) {
    console.log('Adding schoolDepartment column to files table...');
    db.prepare('ALTER TABLE files ADD COLUMN schoolDepartment TEXT').run();
  }

  // Migration: Add schoolDepartment to transfers if missing
  const transferColumns = db.prepare("PRAGMA table_info(transfers)").all() as any[];
  if (!transferColumns.find(c => c.name === 'schoolDepartment')) {
    console.log('Adding schoolDepartment column to transfers table...');
    db.prepare('ALTER TABLE transfers ADD COLUMN schoolDepartment TEXT').run();
  }

  // Migration: Update ledger table columns if they are old
  const ledgerColumns = db.prepare("PRAGMA table_info(ledger)").all() as any[];
  if (ledgerColumns.find(c => c.name === 'accountantName')) {
    console.log('Removing accountantName from ledger table...');
    db.prepare('CREATE TABLE ledger_new (id TEXT PRIMARY KEY, ledgerNumber TEXT NOT NULL, epf TEXT, zoneSection TEXT, createdAt INTEGER NOT NULL)').run();
    db.prepare('INSERT INTO ledger_new (id, ledgerNumber, epf, zoneSection, createdAt) SELECT id, ledgerNumber, epf, zoneSection, createdAt FROM ledger').run();
    db.prepare('DROP TABLE ledger').run();
    db.prepare('ALTER TABLE ledger_new RENAME TO ledger').run();
    console.log('Migration complete.');
  }
} catch (err) {
  console.error('Migration error:', err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---

  // Ledger
  app.get('/api/ledger', (req, res) => {
    const ledger = db.prepare('SELECT * FROM ledger ORDER BY createdAt DESC').all();
    res.json(ledger);
  });

  app.post('/api/ledger', (req, res) => {
    const { id, ledgerNumber, epf, zoneSection, createdAt } = req.body;
    db.prepare('INSERT INTO ledger (id, ledgerNumber, epf, zoneSection, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, ledgerNumber, epf, zoneSection, createdAt);
    res.status(201).json({ success: true });
  });

  app.delete('/api/ledger/:id', (req, res) => {
    db.prepare('DELETE FROM ledger WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put('/api/ledger/:id', (req, res) => {
    const { ledgerNumber, epf, zoneSection } = req.body;
    db.prepare('UPDATE ledger SET ledgerNumber = ?, epf = ?, zoneSection = ? WHERE id = ?')
      .run(ledgerNumber, epf, zoneSection, req.params.id);
    res.json({ success: true });
  });

  // Files
  app.get('/api/files', (req, res) => {
    const files = db.prepare('SELECT * FROM files ORDER BY updatedAt DESC').all();
    res.json(files);
  });

  app.post('/api/files', (req, res) => {
    const { id, name, description, district, schoolDepartment, currentHolderId, createdAt, updatedAt } = req.body;
    db.prepare('INSERT INTO files (id, name, description, district, schoolDepartment, currentHolderId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, description, district, schoolDepartment, currentHolderId, createdAt, updatedAt);
    res.status(201).json({ success: true });
  });

  app.put('/api/files/:id', (req, res) => {
    const { name, description, district, schoolDepartment, currentHolderId, createdAt, updatedAt } = req.body;
    db.prepare('UPDATE files SET name = ?, description = ?, district = ?, schoolDepartment = ?, currentHolderId = ?, createdAt = ?, updatedAt = ? WHERE id = ?')
      .run(name, description, district, schoolDepartment, currentHolderId, createdAt, updatedAt, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/files/:id', (req, res) => {
    db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Transfers
  app.get('/api/transfers', (req, res) => {
    const transfers = db.prepare('SELECT * FROM transfers ORDER BY timestamp DESC').all();
    res.json(transfers);
  });

  app.post('/api/transfers', (req, res) => {
    const { id, fileId, fromId, toId, district, schoolDepartment, notes, timestamp } = req.body;
    db.prepare('INSERT INTO transfers (id, fileId, fromId, toId, district, schoolDepartment, notes, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, fileId, fromId, toId, district, schoolDepartment, notes, timestamp);
    res.status(201).json({ success: true });
  });

  app.delete('/api/transfers/file/:fileId', (req, res) => {
    db.prepare('DELETE FROM transfers WHERE fileId = ?').run(req.params.fileId);
    res.json({ success: true });
  });

  // Data Management
  app.post('/api/clear', (req, res) => {
    db.prepare('DELETE FROM transfers').run();
    db.prepare('DELETE FROM files').run();
    db.prepare('DELETE FROM ledger').run();
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
