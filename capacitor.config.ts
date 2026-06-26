import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.rmbv.sistema',
  appName: 'RMBV',
  webDir: '.next',
  server: {
    url: 'https://rmbv.vercel.app',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
    },
  },
};

export default config;
