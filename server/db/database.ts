import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import type {
  Product,
  Version,
  ServiceItem,
  Issue,
  Rule,
  Conversation,
  Message,
  AppSettings
} from '../types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'workagent.db');
const db = new DatabaseSync(DB_PATH);

// Enable foreign keys, WAL mode, and busy timeout for concurrent access
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      version_format TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      version_name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, version_name)
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS product_services (
      product_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      PRIMARY KEY (product_id, service_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      root_cause TEXT,
      service_id INTEGER NOT NULL,
      severity TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'analyzing',
      impact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS issue_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      version_id INTEGER NOT NULL,
      fix_status TEXT DEFAULT 'unfixed',
      patch_version TEXT,
      fixed_at DATETIME,
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
      FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE,
      UNIQUE(issue_id, version_id)
    );

    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      structured_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT,
      tool_calls TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  seedDefaultData();
}

function seedDefaultData() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM products');
  const row = countStmt.get() as { count: number } | undefined;
  if (row && row.count > 0) return;

  // Insert default products
  const insertProd = db.prepare('INSERT INTO products (name, code, version_format, description) VALUES (?, ?, ?, ?)');
  insertProd.run('Cloud Service Platform', 'csp', '23.0, 23.1, 24.0, 24.1', '云服务基础平台，包含分布式数据库与微服务容器');
  insertProd.run('Cloud Grid Platform', 'cgp', '22.0, 23.0, 24.0', '网格核心平台，支持小型化CGPLite作为容器服务部署到CSP');

  const cspRow = db.prepare("SELECT id FROM products WHERE code = 'csp'").get() as { id: number };
  const cgpRow = db.prepare("SELECT id FROM products WHERE code = 'cgp'").get() as { id: number };

  // Insert default versions
  const insertVer = db.prepare('INSERT INTO versions (product_id, version_name) VALUES (?, ?)');
  ['23.0', '23.1', '24.0', '24.1'].forEach(v => insertVer.run(cspRow.id, v));
  ['22.0', '23.0', '24.0'].forEach(v => insertVer.run(cgpRow.id, v));

  // Insert default services
  const insertSvc = db.prepare('INSERT INTO services (name, description) VALUES (?, ?)');
  insertSvc.run('GaussDB', 'CSP 核心云原生分布式关系型数据库服务');
  insertSvc.run('CGPLite', 'CGP小型化容器服务，可部署在CSP平台中');
  insertSvc.run('PT数据库', '共享关系型数据库服务，存在于CGP与CGPLite中');

  const gaussRow = db.prepare("SELECT id FROM services WHERE name = 'GaussDB'").get() as { id: number };
  const cgpLiteRow = db.prepare("SELECT id FROM services WHERE name = 'CGPLite'").get() as { id: number };
  const ptRow = db.prepare("SELECT id FROM services WHERE name = 'PT数据库'").get() as { id: number };

  // Bind product-services
  const insertPS = db.prepare('INSERT INTO product_services (product_id, service_id) VALUES (?, ?)');
  insertPS.run(cspRow.id, gaussRow.id);
  insertPS.run(cspRow.id, cgpLiteRow.id);
  insertPS.run(cspRow.id, ptRow.id); // via CGPLite
  insertPS.run(cgpRow.id, ptRow.id);

  // Default rule
  const insertRule = db.prepare('INSERT INTO rules (category, content, structured_data) VALUES (?, ?, ?)');
  insertRule.run(
    'product_structure',
    'CSP 的版本格式为 23.0, 23.1, 24.0, 24.1。GaussDB 是 CSP 上的服务；CGPLite 是 CGP 的小型化版本，作为容器服务部署在 CSP 中；PT数据库存在于 CGP 和 CGPLite 中。',
    JSON.stringify({
      products: ['CSP', 'CGP'],
      csp_versions: ['23.0', '23.1', '24.0', '24.1'],
      services: { GaussDB: ['CSP'], CGPLite: ['CSP'], PT数据库: ['CGP', 'CSP(via CGPLite)'] }
    })
  );

  // Sample issue
  const insertIssue = db.prepare(`
    INSERT INTO issues (title, description, root_cause, service_id, severity, status, impact)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertIssue.run(
    'GaussDB 高并发连接池泄漏导致的查询超时',
    '在 23.1 压测场景下出现连接未正确释放，导致业务请求堆积超时',
    '配置连接回收超时时间未生效，长连接在连接池溢出时未触发强制关闭',
    gaussRow.id,
    'high',
    'located',
    '业务 API 响应延时飙升，概率出现 504 错误'
  );

  const issueId = (db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id;
  const ver231 = db.prepare("SELECT id FROM versions WHERE product_id = ? AND version_name = '23.1'").get(cspRow.id) as { id: number };
  const ver240 = db.prepare("SELECT id FROM versions WHERE product_id = ? AND version_name = '24.0'").get(cspRow.id) as { id: number };

  const insertIV = db.prepare('INSERT INTO issue_versions (issue_id, version_id, fix_status, patch_version) VALUES (?, ?, ?, ?)');
  insertIV.run(issueId, ver231.id, 'unfixed', null);
  insertIV.run(issueId, ver240.id, 'fixed', '24.0_P01');

  // Default settings
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('apiKey', '');
  insertSetting.run('baseUrl', 'https://api.openai.com/v1');
  insertSetting.run('model', 'gpt-4o');
  insertSetting.run('theme', 'dark');
  insertSetting.run('language', 'zh');
}

// Data Access Methods

export function getProducts(): Product[] {
  return db.prepare('SELECT * FROM products ORDER BY name ASC').all() as Product[];
}

export function getProductByCode(code: string): Product | undefined {
  return db.prepare('SELECT * FROM products WHERE LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)').get(code, code) as Product | undefined;
}

export function getVersions(productId?: number): Version[] {
  if (productId) {
    return db.prepare(`
      SELECT v.*, p.name as product_name
      FROM versions v
      JOIN products p ON p.id = v.product_id
      WHERE v.product_id = ?
      ORDER BY v.version_name ASC
    `).all(productId) as Version[];
  }
  return db.prepare(`
    SELECT v.*, p.name as product_name
    FROM versions v
    JOIN products p ON p.id = v.product_id
    ORDER BY p.name ASC, v.version_name ASC
  `).all() as Version[];
}

export function getServices(productId?: number): ServiceItem[] {
  if (productId) {
    return db.prepare(`
      SELECT s.*
      FROM services s
      JOIN product_services ps ON ps.service_id = s.id
      WHERE ps.product_id = ?
      ORDER BY s.name ASC
    `).all(productId) as ServiceItem[];
  }
  return db.prepare('SELECT * FROM services ORDER BY name ASC').all() as ServiceItem[];
}

export function createProduct(data: {
  name: string;
  code: string;
  version_format?: string;
  description?: string;
  initial_versions?: string[];
}): Product {
  const codeLower = data.code.trim().toLowerCase();
  const existing = getProductByCode(codeLower);
  if (existing) {
    throw new Error(`产品代码 '${data.code}' 或名称 '${data.name}' 已存在`);
  }

  const info = db.prepare(`
    INSERT INTO products (name, code, version_format, description)
    VALUES (?, ?, ?, ?)
  `).run(data.name.trim(), codeLower, data.version_format || '', data.description || '');

  const prodId = Number(info.lastInsertRowid);

  if (data.initial_versions && data.initial_versions.length > 0) {
    const insertVer = db.prepare('INSERT INTO versions (product_id, version_name) VALUES (?, ?)');
    for (const v of data.initial_versions) {
      if (v && v.trim()) {
        try {
          insertVer.run(prodId, v.trim());
        } catch {}
      }
    }
  }

  return getProductByCode(codeLower)!;
}

export function createVersion(productId: number, versionName: string): Version {
  db.prepare('INSERT INTO versions (product_id, version_name) VALUES (?, ?)').run(productId, versionName.trim());
  const info = db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
  return db.prepare('SELECT v.*, p.name as product_name FROM versions v JOIN products p ON p.id = v.product_id WHERE v.id = ?').get(info.id) as Version;
}

export function getIssues(params?: {
  productId?: number;
  versionId?: number;
  serviceId?: number;
  status?: string;
  fixStatus?: string;
  search?: string;
}): Issue[] {
  let query = `
    SELECT DISTINCT i.*, s.name as service_name
    FROM issues i
    JOIN services s ON s.id = i.service_id
    LEFT JOIN issue_versions iv ON iv.issue_id = i.id
    LEFT JOIN versions v ON v.id = iv.version_id
    WHERE 1=1
  `;
  const args: any[] = [];

  if (params?.productId) {
    query += ` AND (v.product_id = ? OR i.service_id IN (SELECT service_id FROM product_services WHERE product_id = ?))`;
    args.push(params.productId, params.productId);
  }
  if (params?.versionId) {
    query += ` AND iv.version_id = ?`;
    args.push(params.versionId);
  }
  if (params?.serviceId) {
    query += ` AND i.service_id = ?`;
    args.push(params.serviceId);
  }
  if (params?.status) {
    query += ` AND i.status = ?`;
    args.push(params.status);
  }
  if (params?.fixStatus) {
    query += ` AND iv.fix_status = ?`;
    args.push(params.fixStatus);
  }
  if (params?.search) {
    query += ` AND (i.title LIKE ? OR i.description LIKE ? OR i.root_cause LIKE ? OR s.name LIKE ?)`;
    const searchPattern = `%${params.search}%`;
    args.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  query += ` ORDER BY i.updated_at DESC`;

  const issues = db.prepare(query).all(...args) as any[];

  // Attach affected versions and product names for each issue
  const ivStmt = db.prepare(`
    SELECT iv.*, v.version_name, p.name as product_name, p.code as product_code
    FROM issue_versions iv
    JOIN versions v ON v.id = iv.version_id
    JOIN products p ON p.id = v.product_id
    WHERE iv.issue_id = ?
  `);

  return issues.map(iss => {
    const affected = ivStmt.all(iss.id) as any[];

    const prodNamesSet = new Set<string>();

    // 1. If issue has specific affected versions attached, use their product names
    if (affected.length > 0) {
      affected.forEach(a => {
        if (a.product_code) prodNamesSet.add(a.product_code.toUpperCase());
        else if (a.product_name) prodNamesSet.add(a.product_name);
      });
    }

    // 2. Fallback to service's bound products if no affected versions attached yet
    if (prodNamesSet.size === 0) {
      const svcProds = db.prepare(`
        SELECT p.name, p.code FROM products p
        JOIN product_services ps ON ps.product_id = p.id
        WHERE ps.service_id = ?
      `).all(iss.service_id) as any[];
      svcProds.forEach(p => prodNamesSet.add(p.code ? p.code.toUpperCase() : p.name));
    }

    const prodSummary = Array.from(prodNamesSet).join(', ');

    return {
      ...iss,
      product_summary: prodSummary || '通用/跨产品',
      affected_versions: affected
    };
  });
}

export function getIssueById(id: number): Issue | undefined {
  const iss = db.prepare(`
    SELECT i.*, s.name as service_name
    FROM issues i
    JOIN services s ON s.id = i.service_id
    WHERE i.id = ?
  `).get(id) as any;

  if (!iss) return undefined;

  const affected = db.prepare(`
    SELECT iv.*, v.version_name, p.name as product_name
    FROM issue_versions iv
    JOIN versions v ON v.id = iv.version_id
    JOIN products p ON p.id = v.product_id
    WHERE iv.issue_id = ?
  `).all(iss.id) as any[];

  return {
    ...iss,
    affected_versions: affected
  };
}

export function createOrUpdateIssue(data: {
  id?: number;
  title: string;
  description?: string;
  root_cause?: string;
  service_name: string;
  product_id?: number;
  product_ids?: number[];
  severity?: 'high' | 'medium' | 'low';
  status?: 'analyzing' | 'located' | 'closed';
  impact?: string;
  version_fixes?: { product_code?: string; version_name: string; fix_status: 'unfixed' | 'fixed' | 'patched'; patch_version?: string }[];
}): Issue {
  // Ensure service exists
  let svc = db.prepare('SELECT id FROM services WHERE LOWER(name) = LOWER(?)').get(data.service_name) as { id: number } | undefined;
  if (!svc) {
    db.prepare('INSERT INTO services (name, description) VALUES (?, ?)').run(data.service_name, `${data.service_name} 服务`);
    svc = db.prepare('SELECT id FROM services WHERE LOWER(name) = LOWER(?)').get(data.service_name) as { id: number };
  }

  // Bind service to products if product_id or product_ids provided
  const prodIdsToBind = new Set<number>();
  if (data.product_id) prodIdsToBind.add(data.product_id);
  if (data.product_ids && Array.isArray(data.product_ids)) {
    data.product_ids.forEach(pid => prodIdsToBind.add(pid));
  }

  const bindStmt = db.prepare('INSERT OR IGNORE INTO product_services (product_id, service_id) VALUES (?, ?)');
  for (const pid of prodIdsToBind) {
    bindStmt.run(pid, svc.id);
  }

  let issueId = data.id;
  if (issueId) {
    db.prepare(`
      UPDATE issues
      SET title = ?, description = COALESCE(?, description), root_cause = COALESCE(?, root_cause),
          service_id = ?, severity = COALESCE(?, severity), status = COALESCE(?, status),
          impact = COALESCE(?, impact), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.title, data.description, data.root_cause, svc.id, data.severity, data.status, data.impact, issueId);
  } else {
    db.prepare(`
      INSERT INTO issues (title, description, root_cause, service_id, severity, status, impact)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.title,
      data.description || '',
      data.root_cause || '',
      svc.id,
      data.severity || 'medium',
      data.status || 'analyzing',
      data.impact || ''
    );
    issueId = (db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id;
  }

  // Update version fixes if provided
  if (data.version_fixes && data.version_fixes.length > 0) {
    const findVerStmt = db.prepare(`
      SELECT v.id FROM versions v
      JOIN products p ON p.id = v.product_id
      WHERE (LOWER(p.code) = LOWER(?) OR LOWER(p.name) = LOWER(?) OR ? IS NULL OR ? = '')
        AND v.version_name = ?
    `);

    const upsertIV = db.prepare(`
      INSERT INTO issue_versions (issue_id, version_id, fix_status, patch_version, fixed_at)
      VALUES (?, ?, ?, ?, CASE WHEN ? IN ('fixed', 'patched') THEN CURRENT_TIMESTAMP ELSE NULL END)
      ON CONFLICT(issue_id, version_id) DO UPDATE SET
        fix_status = excluded.fix_status,
        patch_version = COALESCE(excluded.patch_version, issue_versions.patch_version),
        fixed_at = CASE WHEN excluded.fix_status IN ('fixed', 'patched') THEN CURRENT_TIMESTAMP ELSE issue_versions.fixed_at END
    `);

    for (const vf of data.version_fixes) {
      const pCode = vf.product_code || '';
      const verRow = findVerStmt.get(pCode, pCode, pCode, pCode, vf.version_name) as { id: number } | undefined;
      if (verRow) {
        upsertIV.run(issueId, verRow.id, vf.fix_status, vf.patch_version || null, vf.fix_status);
      }
    }
  }

  return getIssueById(issueId!)!;
}

export function updateIssueVersionStatus(params: {
  issue_id: number;
  version_name: string;
  product_code?: string;
  fix_status: 'unfixed' | 'fixed' | 'patched';
  patch_version?: string;
}) {
  const pCode = params.product_code || '';
  const verRow = db.prepare(`
    SELECT v.id FROM versions v
    JOIN products p ON p.id = v.product_id
    WHERE (LOWER(p.code) = LOWER(?) OR LOWER(p.name) = LOWER(?) OR ? IS NULL OR ? = '')
      AND v.version_name = ?
  `).get(pCode, pCode, pCode, pCode, params.version_name) as { id: number } | undefined;

  if (!verRow) {
    throw new Error(`找不到版本 ${params.version_name}${params.product_code ? ` (产品: ${params.product_code})` : ''}`);
  }

  db.prepare(`
    INSERT INTO issue_versions (issue_id, version_id, fix_status, patch_version, fixed_at)
    VALUES (?, ?, ?, ?, CASE WHEN ? IN ('fixed', 'patched') THEN CURRENT_TIMESTAMP ELSE NULL END)
    ON CONFLICT(issue_id, version_id) DO UPDATE SET
      fix_status = excluded.fix_status,
      patch_version = COALESCE(excluded.patch_version, issue_versions.patch_version),
      fixed_at = CASE WHEN excluded.fix_status IN ('fixed', 'patched') THEN CURRENT_TIMESTAMP ELSE issue_versions.fixed_at END
  `).run(params.issue_id, verRow.id, params.fix_status, params.patch_version || null, params.fix_status);

  return getIssueById(params.issue_id);
}

export function getPatchChecklist(productCode: string, versionName: string) {
  const prod = getProductByCode(productCode);
  if (!prod) {
    throw new Error(`未找到产品: ${productCode}`);
  }

  const verRow = db.prepare('SELECT id FROM versions WHERE product_id = ? AND version_name = ?').get(prod.id, versionName) as { id: number } | undefined;
  if (!verRow) {
    throw new Error(`未找到产品 ${prod.name} 的版本 ${versionName}`);
  }

  // Get issues that affect this version and are 'unfixed'
  const issues = db.prepare(`
    SELECT i.*, s.name as service_name, iv.fix_status, iv.patch_version
    FROM issues i
    JOIN services s ON s.id = i.service_id
    JOIN issue_versions iv ON iv.issue_id = i.id
    WHERE iv.version_id = ? AND iv.fix_status = 'unfixed'
    ORDER BY i.severity DESC, s.name ASC
  `).all(verRow.id) as any[];

  // Also check if any issue is fixed in other versions of the same product, but unfixed/not-patched in this version!
  const checklist = issues.map(iss => {
    const otherVerFixes = db.prepare(`
      SELECT v.version_name, iv.fix_status, iv.patch_version
      FROM issue_versions iv
      JOIN versions v ON v.id = iv.version_id
      WHERE iv.issue_id = ? AND v.product_id = ? AND v.id != ?
    `).all(iss.id, prod.id, verRow.id) as any[];

    const fixedInOtherVersions = otherVerFixes.filter(f => f.fix_status === 'fixed' || f.fix_status === 'patched');

    return {
      issue_id: iss.id,
      title: iss.title,
      service_name: iss.service_name,
      severity: iss.severity,
      status: iss.status,
      current_version_status: iss.fix_status,
      root_cause: iss.root_cause,
      fixed_in_other_versions: fixedInOtherVersions.map(f => `${f.version_name} (${f.fix_status}${f.patch_version ? ` in ${f.patch_version}` : ''})`)
    };
  });

  return {
    product: prod.name,
    version: versionName,
    total_count: checklist.length,
    checklist
  };
}

export function saveRule(category: string, content: string, structuredData?: any): Rule {
  db.prepare('INSERT INTO rules (category, content, structured_data) VALUES (?, ?, ?)').run(
    category,
    content,
    structuredData ? JSON.stringify(structuredData) : null
  );
  const id = (db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id;
  return db.prepare('SELECT * FROM rules WHERE id = ?').get(id) as Rule;
}

export function getRules(): Rule[] {
  return db.prepare('SELECT * FROM rules ORDER BY created_at DESC').all() as Rule[];
}

export function getConversations(): Conversation[] {
  return db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all() as Conversation[];
}

export function getMessages(conversationId: string): Message[] {
  return db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC').all(conversationId) as Message[];
}

export function saveMessage(msg: Message) {
  // Ensure conversation exists
  const conv = db.prepare('SELECT id FROM conversations WHERE id = ?').get(msg.conversation_id);
  if (!conv) {
    db.prepare('INSERT INTO conversations (id, title) VALUES (?, ?)').run(
      msg.conversation_id,
      msg.content.slice(0, 30) || '新对话'
    );
  } else {
    db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(msg.conversation_id);
  }

  db.prepare('INSERT INTO messages (conversation_id, role, content, tool_calls) VALUES (?, ?, ?, ?)').run(
    msg.conversation_id,
    msg.role,
    msg.content,
    msg.tool_calls || null
  );
}

export function getSettings(): AppSettings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const setObj: any = {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    theme: 'dark',
    language: 'zh'
  };
  rows.forEach(r => {
    setObj[r.key] = r.value;
  });
  return setObj;
}

export function updateSettings(settings: Partial<AppSettings>): AppSettings {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(settings)) {
    if (v !== undefined) {
      stmt.run(k, String(v));
    }
  }
  return getSettings();
}

export function deleteIssue(id: number) {
  db.prepare('DELETE FROM issues WHERE id = ?').run(id);
}

export function deleteProduct(id: number): void {
  db.prepare('DELETE FROM versions WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM product_services WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
}
