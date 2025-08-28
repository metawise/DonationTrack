import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { createServer } from "vite";
import path from "path";
import fs from "fs";
import apiRoutes from "./routes";
import { storage } from "./storage";

const app = express();
const PORT = 5000;

// Trust proxy for secure cookies behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Simple authentication strategy (you may want to replace with proper user auth)
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    // For demo purposes, accept any email/password combo
    // In production, implement proper authentication
    if (email && password) {
      return done(null, { id: '1', email, name: 'Demo User' });
    }
    return done(null, false);
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // In production, fetch user from database
  done(null, { id, email: 'demo@example.com', name: 'Demo User' });
});

// API routes
app.use('/api', apiRoutes);

// Setup Vite or serve static files
if (process.env.NODE_ENV === 'production') {
  // Serve static files in production
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  const indexPath = path.join(distPath, "index.html");

  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `Could not find the production build. Ensure you've run the build process.`
    );
  }

  app.use(express.static(distPath));
  
  app.get("*", (req, res) => {
    res.sendFile(indexPath);
  });
} else {
  // Setup Vite dev server in development
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
    root: path.resolve(import.meta.dirname, "../client"),
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "../client/src"),
        "@shared": path.resolve(import.meta.dirname, "../shared"),
        "@assets": path.resolve(import.meta.dirname, "../attached_assets"),
      },
    },
  });

  app.use(vite.middlewares);
}

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});