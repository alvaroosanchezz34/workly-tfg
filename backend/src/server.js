import app from './app.js';
import { assertProductionSecrets } from './config/secrets.js';
import { initScheduler } from './services/scheduler.service.js';
import { startVerifactuWorker } from './services/verifactu/worker.js';
import { logger } from './utils/logger.js';

assertProductionSecrets();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info('API en marcha', { port: Number(PORT) });
    initScheduler();
    startVerifactuWorker();
});