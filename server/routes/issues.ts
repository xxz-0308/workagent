import { Router } from 'express';
import {
  getIssues,
  getIssueById,
  getIssueStats,
  createOrUpdateIssue,
  updateIssueVersionStatus,
  getPatchChecklist,
  deleteIssue
} from '../db/database.js';

export const issuesRouter = Router();

// Get dashboard stats
issuesRouter.get('/stats', (req, res) => {
  try {
    const stats = getIssueStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Query issues
issuesRouter.get('/', (req, res) => {
  try {
    const { productId, versionId, serviceId, status, fixStatus, tag, search, page, pageSize } = req.query;
    const result = getIssues({
      productId: productId ? Number(productId) : undefined,
      versionId: versionId ? Number(versionId) : undefined,
      serviceId: serviceId ? Number(serviceId) : undefined,
      status: status as string,
      fixStatus: fixStatus as string,
      tag: tag as string,
      search: search as string,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export issues
issuesRouter.get('/export', (req, res) => {
  try {
    const { productId, versionId, serviceId, status, fixStatus, tag, search, format } = req.query;

    const filters = {
      productId: productId ? Number(productId) : undefined,
      versionId: versionId ? Number(versionId) : undefined,
      serviceId: serviceId ? Number(serviceId) : undefined,
      status: status as string,
      fixStatus: fixStatus as string,
      tag: tag as string,
      search: search as string,
      page: 1,
      pageSize: 0  // fetch all, no pagination
    };

    const { issues } = getIssues(filters);

    if (format === 'csv') {
      // Columns matching the UI: Chinese headers, all issue fields + version fixes
      const columns: { key: string; label: string }[] = [
        { key: 'id', label: '问题ID' },
        { key: 'title', label: '问题标题' },
        { key: 'service_name', label: '所属服务' },
        { key: 'severity', label: '严重程度' },
        { key: 'status', label: '定位状态' },
        { key: 'impact', label: '影响范围' },
        { key: 'tags', label: '标签' },
        { key: 'root_cause', label: '根因分析' },
        { key: 'description', label: '现象描述' },
        { key: 'product_summary', label: '关联产品' },
        { key: 'version_fixes', label: '版本修复状态' },
        { key: 'created_at', label: '创建时间' },
        { key: 'updated_at', label: '更新时间' },
      ];

      const escapeCsv = (val: any): string => {
        const str = val == null ? '' : String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Format version fixes as readable string
      const fmtVersions = (iss: any) => {
        const av = iss.affected_versions;
        if (!av || !Array.isArray(av) || av.length === 0) return '';
        return av.map((v: any) => `${v.product_name || ''} ${v.version_name}:${v.fix_status}${v.patch_version ? '(' + v.patch_version + ')' : ''}`).join('; ');
      };

      // Map status/severity to Chinese labels
      const statusMap: Record<string, string> = { analyzing: '分析中', located: '已定位', closed: '已关闭' };
      const severityMap: Record<string, string> = { high: '高', medium: '中', low: '低' };

      const csvRows = [columns.map(c => escapeCsv(c.label)).join(',')];
      for (const iss of issues) {
        const row = columns.map(c => {
          if (c.key === 'version_fixes') return escapeCsv(fmtVersions(iss));
          if (c.key === 'status') return escapeCsv(statusMap[iss.status] || iss.status);
          if (c.key === 'severity') return escapeCsv(severityMap[iss.severity] || iss.severity);
          return escapeCsv((iss as any)[c.key] ?? '');
        });
        csvRows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="issues-export.csv"');
      res.send('﻿' + csvRows.join('\n'));
    } else {
      // JSON export
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="issues-export.json"');
      res.json(issues);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get issue by ID
issuesRouter.get('/:id', (req, res) => {
  try {
    const issue = getIssueById(Number(req.params.id));
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create or Update Issue
issuesRouter.post('/', (req, res) => {
  try {
    const issue = createOrUpdateIssue(req.body);
    res.json(issue);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update Issue by ID (PUT)
issuesRouter.put('/:id', (req, res) => {
  try {
    const issueId = Number(req.params.id);
    const issue = createOrUpdateIssue({ ...req.body, id: issueId });
    res.json(issue);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update issue version fix status
issuesRouter.post('/:id/version-status', (req, res) => {
  try {
    const issueId = Number(req.params.id);
    const { version_name, product_code, fix_status, patch_version } = req.body;
    const updated = updateIssueVersionStatus({
      issue_id: issueId,
      version_name,
      product_code,
      fix_status,
      patch_version
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Patch Checklist
issuesRouter.get('/patch-checklist/:productCode/:versionName', (req, res) => {
  try {
    const checklist = getPatchChecklist(req.params.productCode, req.params.versionName);
    res.json(checklist);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Issue
issuesRouter.delete('/:id', (req, res) => {
  try {
    deleteIssue(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
