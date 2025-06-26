import express from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('Server');
const app = express();
const PORT = process.env.PORT || 3000;

export async function startServer() {
  app.get('/', (req, res) => {
    res.send('Federal Contract Notifier is running!');
  });

  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
} 