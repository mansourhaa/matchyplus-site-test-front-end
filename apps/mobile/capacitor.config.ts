import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell around the Next.js member app (`apps/app`).
 *
 * Primary mode is remote URL (server.url): Next runs as `output: 'standalone'`,
 * so Cap loads the live app host rather than a static export. See apps/mobile/README.md.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.matchy.app',
  appName: 'Matchy+',
  // Placeholder only — runtime content comes from CAPACITOR_SERVER_URL when set.
  webDir: 'www',
  plugins: {
    Camera: {
      permissions: ['camera', 'photos'],
    },
    Geolocation: {
      permissions: ['coarseLocation', 'fineLocation'],
    },
  },
};

if (serverUrl) {
  config.server = {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
  };
}

export default config;
