import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.512d6d6cfced463fb582c26358161fb9',
  appName: 'A Lovable project',
  bundledWebRuntime: false,
  webDir: 'dist',
  server: {
    url: 'https://512d6d6c-fced-463f-b582-c26358161fb9.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
