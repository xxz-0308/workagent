import { Router } from 'express';
import {
  getProducts,
  createProduct,
  deleteProduct,
  getVersions,
  createVersion,
  updateVersion,
  deleteVersion,
  getServices,
  getRules,
  updateRule,
  deleteRule
} from '../db/database.js';

export const productsRouter = Router();

// Products list
productsRouter.get('/products', (req, res) => {
  try {
    res.json(getProducts());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
productsRouter.post('/products', (req, res) => {
  try {
    const prod = createProduct(req.body);
    res.json(prod);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete product
productsRouter.delete('/products/:id', (req, res) => {
  try {
    deleteProduct(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Versions list (all or by product)
productsRouter.get('/versions', (req, res) => {
  try {
    const productId = req.query.productId ? Number(req.query.productId) : undefined;
    res.json(getVersions(productId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create version
productsRouter.post('/versions', (req, res) => {
  try {
    const { productId, versionName } = req.body;
    const ver = createVersion(Number(productId), versionName);
    res.json(ver);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update version name
productsRouter.patch('/versions/:id', (req, res) => {
  try {
    const { versionName } = req.body;
    if (!versionName || !versionName.trim()) {
      return res.status(400).json({ error: 'versionName is required' });
    }
    const ver = updateVersion(Number(req.params.id), versionName);
    res.json(ver);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete version
productsRouter.delete('/versions/:id', (req, res) => {
  try {
    deleteVersion(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Services list
productsRouter.get('/services', (req, res) => {
  try {
    const productId = req.query.productId ? Number(req.query.productId) : undefined;
    res.json(getServices(productId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rules list
productsRouter.get('/rules', (req, res) => {
  try {
    res.json(getRules());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update rule
productsRouter.patch('/rules/:id', (req, res) => {
  try {
    const { category, content } = req.body;
    if (!category || !content) {
      return res.status(400).json({ error: 'category and content are required' });
    }
    const rule = updateRule(Number(req.params.id), category, content);
    res.json(rule);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete rule
productsRouter.delete('/rules/:id', (req, res) => {
  try {
    deleteRule(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
