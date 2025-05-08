// install-chrome.js
import { install } from '@puppeteer/browsers';
import { mkdirSync } from 'fs';

const cacheDir = '/opt/render/.cache/puppeteer';

(async () => {
  try {
    mkdirSync(cacheDir, { recursive: true });

    await install({
      browser: 'chrome',
      buildId: '118.0.5993.70',
      cacheDir
    });

    console.log('✅ Chrome installé avec succès.');
  } catch (err) {
    console.error('❌ Erreur pendant l’installation de Chrome :', err);
    process.exit(1);
  }
})();
