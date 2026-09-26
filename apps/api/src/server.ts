import { createApp } from './app';
import { config } from './config';
import { startPushWorker } from './push';

createApp().listen(config.port, () => console.log(`Metabolic-90 API listening on :${config.port}`));
startPushWorker();
