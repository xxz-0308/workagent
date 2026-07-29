import { Router } from 'express';
import {
  getProducts,
  createProduct,
  deleteProduct,
  getVersions,
  createVersion,
  getServices,
  getRules
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
