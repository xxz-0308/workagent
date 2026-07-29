import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase, getIssues } from '../../db/database.js';
import { executeTool } from '../tools.js';

describe('Agent Tools tests', () => {
  beforeAll(() => {
    initDatabase();
  });

  it('should record issue via tool', async () => {
    const res = await executeTool('record_issue', {
      title: 'GaussDB 内存占用高场景下进程 Crash',
      service_name: 'GaussDB',
      description: '大表 HashJoin OOM',
      severity: 'high',
      status: 'analyzing',
      version_fixes: [
        { product_code: 'csp', version_name: '23.1', fix_status: 'unfixed' }
      ]
    });

    expect(res.success).toBe(true);
    expect(res.issue.id).toBeDefined();
    expect(res.issue.title).toContain('GaussDB');
  });

  it('should fetch patch checklist via tool', async () => {
    const res = await executeTool('get_patch_checklist', {
      product_code: 'csp',
      version_name: '23.1'
    });

    expect(res.product).toBe('Cloud Service Platform');
    expect(res.version).toBe('23.1');
    expect(Array.isArray(res.checklist)).toBe(true);
  });

  it('should save and query rules via tool', async () => {
    const saveRes = await executeTool('save_rule', {
      category: 'product_structure',
      content: 'CSP 与 CGP 使用统一的版本发布节奏'
    });
    expect(saveRes.success).toBe(true);

    const getRes = await executeTool('get_rules', {});
    expect(getRes.rules.some((r: any) => r.content.includes('统一的版本发布节奏'))).toBe(true);
  });

  it('should query issues with search filter', async () => {
    const res = await executeTool('query_issues', { search: 'GaussDB' });
    expect(res.total).toBeGreaterThan(0);
  });
});
