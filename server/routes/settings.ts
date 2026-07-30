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

settingsRouter.post('/test-connection', async (req, res) => {
  try {
    const { apiKey, baseUrl, model } = req.body;
    if (!apiKey) {
      return res.status(400).json({ ok: false, error: 'API Key is required' });
    }

    const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (response.ok) {
      res.json({ ok: true });
    } else {
      const body = await response.text();
      res.json({ ok: false, error: `API returned ${response.status}: ${body.slice(0, 200)}` });
    }
  } catch (err: any) {
    res.json({ ok: false, error: err.message || 'Connection failed' });
  }
});
