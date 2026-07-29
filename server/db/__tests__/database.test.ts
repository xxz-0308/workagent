import { describe, it, expect, beforeAll } from 'vitest';
import {
  initDatabase,
  getProducts,
  getVersions,
  getServices,
  getIssues,
  createOrUpdateIssue,
  getPatchChecklist,
  saveRule,
  getRules,
  updateIssueVersionStatus
} from '../database.js';

describe('Database layer tests', () => {
  beforeAll(() => {
    initDatabase();
  });

  it('should initialize and seed default products, versions, and services', () => {
    const products = getProducts();
    expect(products.length).toBeGreaterThanOrEqual(2);

    const csp = products.find(p => p.code === 'csp');
    expect(csp).toBeDefined();

    const versions = getVersions(csp!.id);
    expect(versions.map(v => v.version_name)).toContain('23.1');

    const services = getServices();
    expect(services.map(s => s.name)).toContain('GaussDB');
    expect(services.map(s => s.name)).toContain('PT数据库');
  });

  it('should create and retrieve issues with version statuses', () => {
    const issue = createOrUpdateIssue({
      title: 'PT数据库在 CGPLite 容器场景下锁等待超时',
      description: '高并发写入 PT数据库 出现锁超时',
      service_name: 'PT数据库',
      severity: 'high',
      status: 'analyzing',
      version_fixes: [
        { product_code: 'csp', version_name: '23.1', fix_status: 'unfixed' },
        { product_code: 'csp', version_name: '24.0', fix_status: 'fixed', patch_version: '24.0_P02' }
      ]
    });

    expect(issue.id).toBeDefined();
    expect(issue.service_name).toBe('PT数据库');
    expect(issue.affected_versions?.length).toBeGreaterThanOrEqual(2);
  });

  it('should query patch checklist for CSP 23.1', () => {
    const checklist = getPatchChecklist('csp', '23.1');
    expect(checklist.product).toBe('Cloud Service Platform');
    expect(checklist.version).toBe('23.1');
    expect(checklist.checklist.length).toBeGreaterThan(0);
  });

  it('should update issue fix status', () => {
    const issues = getIssues({ search: 'GaussDB' });
    expect(issues.length).toBeGreaterThan(0);
    const gaussIssue = issues[0];

    const updated = updateIssueVersionStatus({
      issue_id: gaussIssue.id,
      version_name: '23.1',
      product_code: 'csp',
      fix_status: 'patched',
      patch_version: '23.1_P01'
    });

    expect(updated).toBeDefined();
    const ver231 = updated?.affected_versions?.find(v => v.version_name === '23.1');
    expect(ver231?.fix_status).toBe('patched');
    expect(ver231?.patch_version).toBe('23.1_P01');
  });

  it('should save and fetch rules', () => {
    const rule = saveRule('product_structure', 'CGP 和 CSP 共享 PT数据库 服务', { shared: true });
    expect(rule.id).toBeDefined();

    const rules = getRules();
    expect(rules.map(r => r.content)).toContain('CGP 和 CSP 共享 PT数据库 服务');
  });
});
