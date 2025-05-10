// install-chrome.js
import { install } from '@puppeteer/browsers';
import { mkdirSync, accessSync, constants } from 'fs';
import { exec } from 'child_process';
import path from 'path';

const cacheDir = '/opt/render/project/src/puppeteer';
const buildId = '136.0.7103.92';

(async () => {
  try {
    console.log(`🔍 Création du répertoire cache: ${cacheDir}`);
    mkdirSync(cacheDir, { recursive: true });
    
    console.log(`⬇️ Installation de Chrome buildId: ${buildId}`);
    await install({
      browser: 'chrome',
      buildId: buildId,
      cacheDir
    });
    
    // Vérifier si l'exécutable existe
    const expectedPath = path.join(cacheDir, 'chrome', `linux-${buildId}`, 'chrome-linux64', 'chrome');
    console.log(`🔍 Vérification du chemin d'exécution: ${expectedPath}`);
    
    try {
      accessSync(expectedPath, constants.X_OK);
      console.log(`✅ Chrome est présent et exécutable à: ${expectedPath}`);
      
      // Vérifier les permissions
      exec(`ls -la ${expectedPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Erreur lors de la vérification des permissions: ${error.message}`);
          return;
        }
        console.log('📄 Permissions du fichier chrome:');
        console.log(stdout);
      });
      
      // Vérifier les dépendances
      exec(`ldd ${expectedPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Erreur lors de la vérification des dépendances: ${error.message}`);
          return;
        }
        console.log('📋 Dépendances de Chrome:');
        console.log(stdout);
      });
    } catch (err) {
      console.error(`❌ Chrome n'est pas accessible à ${expectedPath}: ${err.message}`);
      
      // Lister le contenu du répertoire cache
      exec(`find ${cacheDir} -type f -name "chrome" | xargs ls -la`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Erreur lors de la recherche du binaire chrome: ${error.message}`);
          return;
        }
        console.log('🔍 Recherche des binaires chrome:');
        console.log(stdout || 'Aucun binaire trouvé');
      });
    }
  } catch (err) {
    console.error('❌ Erreur pendant l\'installation de Chrome:', err);
    process.exit(1);
  }
})();