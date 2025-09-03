import express from 'express';
import { createServer } from 'http';
import next from 'next';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const app = express();
const server = createServer(app);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Dynamically import and handle API routes
app.use('/api', async (req, res, next) => {
  try {
    const apiPath = req.path === '/' ? '/index' : req.path;
    const routePath = path.join(process.cwd(), 'api', `${apiPath.slice(1)}.ts`);
    
    try {
      const handler = await import(`file://${routePath}`);
      const apiHandler = handler.default || handler;
      
      if (typeof apiHandler === 'function') {
        // Convert Express req/res to Vercel-style format
        const vercelReq = {
          ...req,
          query: { ...req.query, ...req.params },
          body: req.body
        };
        
        await apiHandler(vercelReq, res);
      } else {
        res.status(404).json({ error: 'API handler not found' });
      }
    } catch (importError) {
      console.error(`Failed to import API route ${routePath}:`, importError);
      res.status(404).json({ error: 'API route not found' });
    }
  } catch (error) {
    console.error('API route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle API routes with dynamic segments (like /api/transactions/[id]/refund)
app.use('/api/:segment/:id/:action', async (req, res) => {
  try {
    const { segment, id, action } = req.params;
    const routePath = path.join(process.cwd(), 'api', segment, '[id]', `${action}.ts`);
    
    try {
      const handler = await import(`file://${routePath}`);
      const apiHandler = handler.default || handler;
      
      if (typeof apiHandler === 'function') {
        const vercelReq = {
          ...req,
          query: { ...req.query, id },
          body: req.body
        };
        
        await apiHandler(vercelReq, res);
      } else {
        res.status(404).json({ error: 'API handler not found' });
      }
    } catch (importError) {
      console.error(`Failed to import API route ${routePath}:`, importError);
      res.status(404).json({ error: 'API route not found' });
    }
  } catch (error) {
    console.error('API route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle all other requests with Next.js
app.all('*', (req, res) => {
  return handle(req, res);
});

const PORT = process.env.PORT || 5000;

// Start Next.js, then start the server
nextApp.prepare().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Next.js server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 API endpoints available at http://0.0.0.0:${PORT}/api/*`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});

export default app;