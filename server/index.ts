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
  // Setup Vite dev server for frontend with explicit host allowance
  const vite = await createServer({
    configFile: false, // Disable vite.config.ts to override settings
    server: { 
      middlewareMode: true,
      host: true, // This allows all hosts as per Replit documentation
      port: 5000,
      origin: 'http://0.0.0.0:5000',
      strictPort: false,
      fs: {
        strict: false,
        allow: ['..']
      }
    },
    define: {
      'process.env.REPL_SLUG': JSON.stringify(process.env.REPL_SLUG || ''),
      'process.env.REPL_OWNER': JSON.stringify(process.env.REPL_OWNER || ''),
    },
    appType: "spa",
    root: path.resolve(process.cwd(), "client"),
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "client/src"),
        "@shared": path.resolve(process.cwd(), "shared"),
        "@assets": path.resolve(process.cwd(), "attached_assets"),
      },
    },
    plugins: [
      (await import("@vitejs/plugin-react")).default(),
    ],
  });

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

  // Use Vite middleware for frontend
  app.use(vite.middlewares);

  // Set additional headers for Replit compatibility
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Development server running on http://0.0.0.0:${PORT}`);
    console.log(`📱 Frontend: Vite dev server`);
    console.log(`🔌 API: Vercel-compatible handlers`);
    console.log(`🌐 Replit URL: https://${process.env.REPL_SLUG || 'repl'}-${process.env.REPL_OWNER || 'user'}.replit.dev`);
  });
}

setupDevServer().catch(console.error);