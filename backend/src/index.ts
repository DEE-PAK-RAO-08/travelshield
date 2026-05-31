import app from './app';
import { config } from './config';
import logger from './utils/logger';
import { createServer } from 'http';
import { initializeSocket } from './services/socket.service';

const server = createServer(app);

initializeSocket(server);

server.listen(config.port, () => {
  logger.info(`TravelShield API running on port ${config.port} [${config.nodeEnv}]`);
});
