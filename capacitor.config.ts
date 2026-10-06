import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cropguard.ai',
  appName: 'CropGuard',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
