import app from './app.js';
import { initScheduler } from './services/scheduler.service.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 WorkLy API running on port ${PORT}`);
    initScheduler();
});