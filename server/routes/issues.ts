import { Router } from 'express';
import {
  getIssues,
  getIssueById,
  createOrUpdateIssue,
  updateIssueVersionStatus,
  getPatchChecklist,
  deleteIssue
} from '../db/database.js';

export const issuesRouter = Router();

// Query issues
issuesRouter.get('/', (req, res) => {
  try {
    const { productId, versionId, serviceId, status, fixStatus, search } = req.query;
    const list = getIssues({
      productId: productId ? Number(productId) : undefined,
      versionId: versionId ? Number(versionId) : undefined,
      serviceId: serviceId ? Number(serviceId) : undefined,
      status: status as string,
      fixStatus: fixStatus as string,
      search: search as string
    });
    res.json(list);
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
