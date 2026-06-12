const { createClient } = require('@libsql/client');

let _db = null;

async function getDb() {
  if (_db) return _db;

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await client.batch([
    `CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS platform_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      post_id TEXT NOT NULL,
      post_url TEXT NOT NULL,
      linked_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS analytics_cache (
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
    )`,
    `CREATE TABLE IF NOT EXISTS buyrent_manual_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      views INTEGER DEFAULT 0,
      enquiries INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS analytics_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      impressions INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      reach INTEGER DEFAULT 0,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )`,
  ], 'write');

  function rowToObj(row, columns) {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  }

  _db = {
    async execute(sql, args = []) {
      return client.execute({ sql, args });
    },
    prepare(sql) {
      return {
        async get(...params) {
          const args = params.flat();
          const rs = await client.execute({ sql, args });
          if (rs.rows.length === 0) return null;
          return rowToObj(rs.rows[0], rs.columns);
        },
        async all(...params) {
          const args = params.flat();
          const rs = await client.execute({ sql, args });
          return rs.rows.map(row => rowToObj(row, rs.columns));
        },
        async run(...params) {
          const args = params.flat();
          const rs = await client.execute({ sql, args });
          return { lastInsertRowid: Number(rs.lastInsertRowid), changes: rs.rowsAffected };
        },
      };
    },
  };

  return _db;
}

module.exports = { getDb };
