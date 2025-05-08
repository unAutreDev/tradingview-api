import express from 'express';
import puppeteer from 'puppeteer';
import { computeExecutablePath } from '@puppeteer/browsers';

const cacheDir = '/opt/render/.cache/puppeteer';
const buildId = '138.0.7156.3'

const app = express();
const port = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;

app.get('/screenshot', async (req, res) => {
  const clientKey = req.headers['x-api-key'];
  const symbol = req.query.symbol || 'SOLEUR'; // Exemple : BTCUSDT ou SOLEUR

  if (!clientKey || clientKey !== API_KEY) {
    return res.status(403).json({ error: 'Unauthorized – invalid API key' });
  }

  try {

    const executablePath = computeExecutablePath({
      browser: 'chromium',
      buildId: buildId,
      cacheDir
    });
   
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      executablePath
    });

    const page = await browser.newPage();
    const url = `https://www.tradingview.com/chart/?symbol=COINBASE:${symbol}`;
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const screenshotBuffer = await page.screenshot();
    await browser.close();

    res.set('Content-Type', 'image/png');
    res.send(screenshotBuffer);
  } catch (err) {
    console.error('Erreur dans la capture :', err);
    res.status(500).send('Erreur serveur');
  }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
