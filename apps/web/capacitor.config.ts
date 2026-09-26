import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.metabolic90.app',
  appName: 'Metabolic-90',
  webDir: 'dist',
  android: { allowMixedContent: false },
};

export default config;
