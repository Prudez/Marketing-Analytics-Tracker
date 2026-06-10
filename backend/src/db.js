const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'analytics.db');

let _db = null;

async function getDb() {
  if (_db) return _db;

  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    sqlDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    sqlDb = new SQL.Database();
  }

  function save() {
    fs.writeFileSync(DB_PATH, Buffer.from(sqlDb.export()));
  }

  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS platform_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      post_id TEXT NOT NULL,
      post_url TEXT NOT NULL,
      linked_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )
  `);
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS analytics_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      impressions INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      reach INTEGER DEFAULT 0,
      extra_json TEXT,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )
  `);
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS buyrent_manual_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      views INTEGER DEFAULT 0,
      enquiries INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )
  `);
  save();

  _db = {
    prepare(sql) {
      const isWrite = /^\s*(INSERT|UPDATE|DELETE)/i.test(sql);
      return {
        get(...args) {
          const params = args.flat();
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          const hasRow = stmt.step();
          const row = hasRow ? stmt.getAsObject() : null;
          stmt.free();
          return row;
        },
        all(...args) {
          const params = args.flat();
          const rows = [];
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows;
        },
        run(...args) {
          const params = args.flat();
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          stmt.step();
          stmt.free();
          if (isWrite) save();
          const lastId = sqlDb.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] ?? 0;
          return { lastInsertRowid: lastId, changes: sqlDb.getRowsModified() };
        },
      };
    },
  };

  return _db;
}

module.exports = { getDb };
