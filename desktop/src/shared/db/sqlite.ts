import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

let dbPath: string | null = null;
function getDbPath() {
  if (!dbPath) dbPath = path.join(app.getPath('userData'), 'pos-offline.db');
  return dbPath;
}

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  const DB_PATH = getDbPath();

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  return db;
}

function persist(database: Database) {
  const data = database.export();
  fs.writeFileSync(getDbPath(), Buffer.from(data));
}

function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS offline_sales (
      id TEXT PRIMARY KEY,
      receipt_number TEXT,
      branch_id TEXT NOT NULL,
      cashier_id TEXT NOT NULL,
      customer_id TEXT,
      subtotal REAL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL,
      status TEXT DEFAULT 'COMPLETED',
      sync_status TEXT DEFAULT 'PENDING',
      created_at TEXT DEFAULT (datetime('now')),
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_cache (
      id TEXT PRIMARY KEY,
      barcode TEXT,
      name TEXT NOT NULL,
      selling_price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      category_id TEXT,
      tax_included INTEGER DEFAULT 1,
      cached_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_product_barcode ON product_cache(barcode);
    CREATE INDEX IF NOT EXISTS idx_sale_sync ON offline_sales(sync_status);
  `);
  persist(database);
}

export const offlineSalesDb = {
  async insert(sale: any) {
    const d = await getDb();
    d.run(
      `INSERT OR IGNORE INTO offline_sales (id, receipt_number, branch_id, cashier_id, customer_id, subtotal, discount_amount, tax_amount, total, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sale.id, sale.receiptNumber, sale.branchId, sale.cashierId, sale.customerId ?? null,
       sale.subtotal, sale.discountAmount, sale.taxAmount, sale.total, JSON.stringify(sale)],
    );
    persist(d);
  },

  async getPending() {
    const d = await getDb();
    const result = d.exec(`SELECT * FROM offline_sales WHERE sync_status = 'PENDING' ORDER BY created_at ASC`);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((row) => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
  },

  async markSynced(id: string) {
    const d = await getDb();
    d.run(`UPDATE offline_sales SET sync_status = 'SYNCED' WHERE id = ?`, [id]);
    persist(d);
  },

  async markFailed(id: string) {
    const d = await getDb();
    d.run(`UPDATE offline_sales SET sync_status = 'FAILED' WHERE id = ?`, [id]);
    persist(d);
  },
};

export const productCache = {
  async upsertMany(products: any[]) {
    const d = await getDb();
    for (const p of products) {
      d.run(
        `INSERT OR REPLACE INTO product_cache (id, barcode, name, selling_price, cost_price, category_id, tax_included)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.barcode ?? null, p.name, p.sellingPrice, p.costPrice, p.categoryId ?? null, p.taxIncluded ? 1 : 0],
      );
    }
    persist(d);
  },

  async findByBarcode(barcode: string) {
    const d = await getDb();
    const result = d.exec(`SELECT * FROM product_cache WHERE barcode = ? LIMIT 1`, [barcode]);
    if (!result.length || !result[0].values.length) return null;
    const { columns, values } = result[0];
    return Object.fromEntries(columns.map((col, i) => [col, values[0][i]]));
  },

  async search(query: string) {
    const d = await getDb();
    const result = d.exec(`SELECT * FROM product_cache WHERE name LIKE ? LIMIT 20`, [`%${query}%`]);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((row) => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
  },
};
