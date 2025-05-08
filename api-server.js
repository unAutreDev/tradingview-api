import express from 'express';
import puppeteer from 'puppeteer-core';
import { computeExecutablePath } from '@puppeteer/browsers';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const cacheDir = '/opt/render/.cache/puppeteer';
const buildId = '136.0.7103.92';

const app = express();
const port = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;

// Endpoint de diagnostic pour vérifier l'état de Chrome
app.get('/check-chrome', (req, res) => {
  try {
    const executablePath = computeExecutablePath({
      browser: 'chrome',
      buildId: buildId,
      cacheDir
    });
    
    const exists = existsSync(executablePath);
    
    let details = {
      executablePath,
      exists,
      debugInfo: {}
    };
    
    if (exists) {
      try {
        // Vérifier les permissions
        const permissions = execSync(`ls -la ${executablePath}`).toString();
        details.debugInfo.permissions = permissions;
        
        // Vérifier les dépendances
        const deps = execSync(`ldd ${executablePath}`).toString();
        details.debugInfo.dependencies = deps;
      } catch (e) {
        details.debugInfo.error = e.message;
      }
    }
    
    res.json(details);
  } catch (err) {
    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
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
    
    const executablePath = computeExecutablePath({
      browser: 'chrome',
      buildId: buildId,
      cacheDir
    });
    
    console.log(`🔍 Chrome path calculé: ${executablePath}`);
    
    if (!existsSync(executablePath)) {
      console.error(`❌ Chrome non trouvé à ${executablePath}`);
      return res.status(500).json({ 
        error: 'Chrome non trouvé', 
        path: executablePath,
        suggestion: 'Vérifiez l\'installation avec /check-chrome'
      });
    }
    
    console.log('🚀 Lancement du navigateur');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // Important sur Render
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--single-process'          // Peut aider sur certains environnements
      ],
      executablePath,
      ignoreDefaultArgs: ['--disable-extensions']  // Éviter les conflits
    });

    console.log('📄 Création d\'une nouvelle page');
    const page = await browser.newPage();
    
    const url = `https://www.tradingview.com/chart/?symbol=COINBASE:${symbol}`;
    console.log(`🌐 Navigation vers: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000  // Augmenter le timeout à 60s
    });
    
    console.log('⏳ Attente de 5 secondes');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📸 Capture d\'écran');
    const screenshotBuffer = await page.screenshot();
    
    console.log('🔒 Fermeture du navigateur');
    await browser.close();

    console.log('✅ Envoi de la capture d\'écran');
    res.set('Content-Type', 'image/png');
    res.send(screenshotBuffer);
  } catch (err) {
    console.error('❌ Erreur dans la capture :', err);
    res.status(500).json({
      error: 'Erreur serveur',
      message: err.message,
      stack: err.stack
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
  
  const executablePath = computeExecutablePath({
    browser: 'chrome',
    buildId: buildId,
    cacheDir
  });
  
  console.log(`📋 Chrome devrait être à: ${executablePath}`);
  console.log(`🔍 Chrome existe: ${existsSync(executablePath)}`);
});