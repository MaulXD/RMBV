import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.scs.sistema',
  appName: 'SCS',
  webDir: '.next',
  server: {
    url: 'https://systemscs.vercel.app',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
    },
  },
};

export default config;
