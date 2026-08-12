import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import fs from 'fs';

const logPlugin = () => ({
  name: 'log-plugin',
  configureServer(server) {
    server.middlewares.use('/api/log', (req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        fs.appendFileSync('simulation.log', new Date().toISOString() + ' - ' + body + '\n');
        res.end('ok');
      });
    });

    server.middlewares.use('/api/save-defaults', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const newSettings = JSON.parse(body);
          const defaultsFilePath = path.resolve(__dirname, 'src/hooks/SimulationDefaults.ts');
          let content = fs.readFileSync(defaultsFilePath, 'utf8');
          const startStr = 'export const DEFAULTS: Record<string, any> = ';
          const startIdx = content.indexOf(startStr);
          const endStr = ';\n\nexport const DEFAULT_PALETTE';
          const endIdx = content.indexOf(endStr);
          if (startIdx !== -1 && endIdx !== -1) {
            const currentDefaults = JSON.parse(content.slice(startIdx + startStr.length, endIdx));
            const mergedDefaults = { ...currentDefaults, ...newSettings };
            const defaultsStr = JSON.stringify(mergedDefaults, null, 2);
            content = content.slice(0, startIdx + startStr.length) + defaultsStr + content.slice(endIdx);
            fs.writeFileSync(defaultsFilePath, content, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Defaults successfully saved to SimulationDefaults.ts' }));
            return;
          }
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'Could not find DEFAULTS anchor in SimulationDefaults.ts' }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: String(err) }));
        }
      });
    });
  }
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/LifeSim/',
    plugins: [react(), tailwindcss(), logPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
