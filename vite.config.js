import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// Custom local API serverless function runner for local development
const localApiPlugin = () => ({
  name: 'local-api-plugin',
  configureServer(server) {
    // Load all environment variables from .env files and populate process.env
    const env = loadEnv(server.config.mode, server.config.root, '');
    Object.assign(process.env, env);

    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/api/')) {
        const apiName = req.url.split('?')[0].replace('/api/', '');
        const apiPath = path.resolve(server.config.root, `./api/${apiName}.js`);
        
        if (fs.existsSync(apiPath)) {
          try {
            // Read request body for POST/PUT/PATCH requests
            let body = '';
            await new Promise((resolve) => {
              req.on('data', chunk => { body += chunk; });
              req.on('end', resolve);
            });
            
            if (body) {
              try {
                req.body = JSON.parse(body);
              } catch (e) {
                req.body = body;
              }
            } else {
              req.body = {};
            }
            
            // Mock Express-like response object
            const mockRes = {
              status(code) {
                res.statusCode = code;
                return this;
              },
              json(data) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return this;
              },
              setHeader(name, val) {
                res.setHeader(name, val);
                return this;
              }
            };
            
            // Import and run the serverless function handler using Vite's SSR loading
            const { default: handler } = await server.ssrLoadModule(apiPath);
            await handler(req, mockRes);
            return;
          } catch (err) {
            console.error(`Error in local API handler /api/${apiName}:`, err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Internal Server Error', error: err.message }));
            return;
          }
        }
      }
      next();
    });
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'Kanchan Homoeo Hall',
        short_name: 'Kanchan',
        description: 'Trusted Holistic Healing & Authentic Homoeopathic Remedies',
        theme_color: '#115E59',
        background_color: '#FDFBF7',
        display: 'standalone',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    }),
  ],
})
