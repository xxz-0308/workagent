import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, getIssues, createOrUpdateIssue } from '../../db/database.js';

describe('Issues API Route logic tests', () => {
  beforeAll(() => {
    initDatabase();
  });

  it('should filter issues by product, status and search query', () => {
    createOrUpdateIssue({
      title: 'CGPLite 部署在 CSP 时 PT数据库 连接数超限',
      service_name: 'CGPLite',
      severity: 'medium',
      status: 'located',
      version_fixes: [{ product_code: 'csp', version_name: '23.1', fix_status: 'unfixed' }]
    });

    const issues = getIssues({ search: 'PT数据库' });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toContain('PT数据库');
  });
});
