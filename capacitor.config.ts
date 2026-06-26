import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.rmbv.sistema',
  appName: 'RMBV',
  webDir: '.next',
  server: {
    url: 'http://localhost:3000',
    cleartext: true,
  },
};

export default config;
