import express from 'express';
import cors from 'cors';
import config from './config';
import quoteRouter from './quote';

const app = express();

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/quote', quoteRouter);

app.listen(config.PORT, () => {
  console.log(`Phoneify API running on http://localhost:${config.PORT}`);
});
