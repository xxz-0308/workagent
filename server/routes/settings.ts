import { Router } from 'express';
import { getSettings, updateSettings } from '../db/database.js';

export const settingsRouter = Router();

settingsRouter.get('/', (req, res) => {
  try {
    const s = getSettings();
    // Mask key for security when sending to client UI
    const masked = {
      ...s,
      apiKeyMasked: s.apiKey ? `sk-...${s.apiKey.slice(-4)}` : ''
    };
    res.json(masked);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

settingsRouter.post('/', (req, res) => {
  try {
    const updated = updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
