import express from "express";
import { createServer } from "vite";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 5000;

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

async function setupDevServer() {
  // Check if we have a build directory, if not build first
  const distPath = path.resolve(process.cwd(), "dist/public");
  if (!fs.existsSync(distPath)) {
    console.log("📦 Building frontend first...");
    const { exec } = await import('child_process');
    await new Promise((resolve, reject) => {
      exec('npm run build', (error, stdout, stderr) => {
        if (error) {
          console.error('Build failed:', error);
          reject(error);
        } else {
          console.log('Build completed successfully');
          resolve(stdout);
        }
      });
    });
  }

  // Handle API routes by dynamically importing the handlers
  app.all('/api/*', async (req, res) => {
    try {
      const apiPath = req.path.replace('/api/', '');
      const handlerPath = path.resolve(process.cwd(), 'api', `${apiPath}.ts`);
      
      // Check if specific handler exists
      if (fs.existsSync(handlerPath)) {
        const { default: handler } = await import(handlerPath);
        return handler(req, res);
      }
      
      // Check for nested routes (like auth/me, dashboard/metrics)
      const nestedPath = path.resolve(process.cwd(), 'api', `${apiPath}.ts`);
      if (fs.existsSync(nestedPath)) {
        const { default: handler } = await import(nestedPath);
        return handler(req, res);
      }
      
      // Route not found
      res.status(404).json({ error: 'API route not found' });
    } catch (error) {
      console.error('API handler error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Serve static files from the build directory
  app.use(express.static(distPath));

  // Set additional headers for Replit compatibility
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  // Handle SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Development server running on http://0.0.0.0:${PORT}`);
    console.log(`📱 Frontend: Static build (no host restrictions)`);
    console.log(`🔌 API: Vercel-compatible handlers`);
    console.log(`🌐 Replit URL: https://${process.env.REPL_SLUG || 'repl'}-${process.env.REPL_OWNER || 'user'}.replit.dev`);
  });
}

setupDevServer().catch(console.error);