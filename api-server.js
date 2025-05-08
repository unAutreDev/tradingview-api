import express from 'express';
import puppeteer from 'puppeteer-core';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const app = express();
const port = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;

// Fonction pour trouver le chemin de Chromium
function findChromiumPath() {
  const possiblePaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/opt/chromium/chrome'
  ];
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  
  // Essayer de trouver avec which
  try {
    return execSync('which chromium-browser || which chromium').toString().trim();
  } catch (e) {
    console.error('Chromium non trouvé:', e.message);
    return null;
  }
}

app.get('/check-browser', (req, res) => {
  try {
    const chromiumPath = findChromiumPath();
    
    if (!chromiumPath) {
      return res.status(404).json({ error: 'Chromium non trouvé' });
    }
    
    const info = {
      path: chromiumPath,
      exists: existsSync(chromiumPath)
    };
    
    try {
      info.version = execSync(`${chromiumPath} --version`).toString().trim();
    } catch (e) {
      info.versionError = e.message;
    }
    
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/screenshot', async (req, res) => {
  const clientKey = req.headers['x-api-key'];
  const symbol = req.query.symbol || 'SOLEUR'; // Exemple : BTCUSDT ou SOLEUR

  if (!clientKey || clientKey !== API_KEY) {
    return res.status(403).json({ error: 'Unauthorized – invalid API key' });
  }

  try {
    console.log('📋 Début de la capture d\'écran');
    
    const chromiumPath = findChromiumPath();
    if (!chromiumPath) {
      return res.status(500).json({ error: 'Chromium non trouvé sur le système' });
    }
    
    console.log(`🚀 Lancement de Chromium depuis: ${chromiumPath}`);
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // Crucial pour les environnements à faible mémoire
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--single-process',         // Peut aider pour les environnements à faible mémoire
        '--no-zygote',
        '--mute-audio',
        '--ignore-certificate-errors',
        '--disable-accelerated-2d-canvas',
        '--disable-web-security',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-notifications',
        '--disable-infobars',
        '--window-size=1280,800',
        '--js-flags="--max-old-space-size=256"' // Limite l'utilisation de la mémoire JS
      ],
      executablePath: chromiumPath
    });

    console.log('📄 Création d\'une nouvelle page avec optimisations mémoire');
    const page = await browser.newPage();
    
    // Optimisations pour réduire l'utilisation de la mémoire
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Bloquer les ressources non essentielles pour économiser de la mémoire
      const resourceType = request.resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Limiter la résolution pour économiser de la mémoire
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    
    const url = `https://www.tradingview.com/chart/?symbol=COINBASE:${symbol}`;
    console.log(`🌐 Navigation vers: ${url}`);
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 60000  // 60s timeout
      });
    } catch (navErr) {
      console.warn(`⚠️ Navigation partielle: ${navErr.message}`);
      // Continuer même si la navigation n'est pas complètement terminée
    }
    
    console.log('⏳ Attente de 5 secondes');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Avant la capture, nettoyer la mémoire
    try {
      await page.evaluate(() => {
        if (window.gc) window.gc();
      });
    } catch (e) {
      console.warn('⚠️ Impossible de forcer le GC');
    }

    console.log('📸 Capture d\'écran');
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',  // JPEG au lieu de PNG pour réduire la mémoire utilisée
      quality: 80,   // Qualité légèrement réduite pour économiser de la mémoire
      fullPage: false
    });
    
    console.log('🔒 Fermeture du navigateur');
    await browser.close();

    console.log('✅ Envoi de la capture d\'écran');
    res.set('Content-Type', 'image/jpeg');
    res.send(screenshotBuffer);
  } catch (err) {
    console.error('❌ Erreur dans la capture :', err);
    
    // Tenter de nettoyer en cas d'erreur
    try {
      // Forcer la fermeture de tous les processus chromium
      execSync('pkill -f chromium');
    } catch (e) {
      console.warn('⚠️ Erreur lors du nettoyage:', e.message);
    }
    
    res.status(500).json({
      error: 'Erreur serveur',
      message: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
  
  // Vérifier Chromium au démarrage
  const chromiumPath = findChromiumPath();
  if (chromiumPath) {
    console.log(`✅ Chromium trouvé à: ${chromiumPath}`);
    try {
      const version = execSync(`${chromiumPath} --version`).toString().trim();
      console.log(`📋 Version de Chromium: ${version}`);
    } catch (e) {
      console.error(`❌ Erreur lors de la vérification de la version: ${e.message}`);
    }
  } else {
    console.error('❌ Chromium non trouvé!');
  }
});