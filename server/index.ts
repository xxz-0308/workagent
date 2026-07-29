import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import { chatRouter } from './routes/chat.js';
import { issuesRouter } from './routes/issues.js';
import { productsRouter } from './routes/products.js';
import { settingsRouter } from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
initDatabase();

// Mount Routes
app.use('/api/chat', chatRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/topology', productsRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'WorkAgent', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 WorkAgent Backend server running on http://localhost:${PORT}`);
});
