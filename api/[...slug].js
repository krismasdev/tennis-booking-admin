const express = require('express');

// Dynamic imports for ES modules
let registerRoutes, dotenv;

async function initializeModules() {
  if (!registerRoutes) {
    try {
      const routesModule = await import('../server/routes.js');
      registerRoutes = routesModule.registerRoutes;
      
      dotenv = await import('dotenv');
      dotenv.config();
      
      // Validate essential environment variables
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
      }
      
      console.log('Environment variables loaded successfully');
    } catch (error) {
      console.error('Failed to initialize modules:', error);
      throw error;
    }
  }
}

let app;

async function createApp() {
  if (!app) {
    await initializeModules();
    
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: false, limit: '10mb' }));

    // Add CORS headers for development
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      next();
    });

    // Add middleware for request logging
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse && res.statusCode >= 400) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }

          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "…";
          }

          console.log(logLine);
        }
      });

      next();
    });

    // Register all routes
    registerRoutes(app);

    // Add error handler
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('API Error:', {
        message: err.message,
        stack: err.stack,
        status
      });
      
      res.status(status).json({ 
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });
  }
  return app;
}

module.exports = async function handler(req, res) {
  try {
    console.log(`${req.method} ${req.url}`);
    const app = await createApp();
    return app(req, res);
  } catch (error) {
    console.error('Handler initialization error:', {
      message: error.message,
      stack: error.stack
    });
    
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Internal Server Error', 
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }
}; 