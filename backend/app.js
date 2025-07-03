// ========================================
// CONFIGURATION EXPRESS PRINCIPALE - VERSION CORRIGÉE POUR TABLEAU DYNAMIQUE
// Fichier: backend/app.js
// ========================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import des routes
const enqueteRoutes = require('./routes/enqueteRoutes');
const authRoutes = require('./routes/authRoutes');
const statistiquesRoutes = require('./routes/statistiquesRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes');


// Import des middlewares
const { sanitiserDonnees } = require('./middleware/validation');

// Créer l'application Express
const app = express();

// ========================================
// MIDDLEWARES DE SÉCURITÉ
// ========================================

// Helmet pour sécuriser les en-têtes HTTP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false // Pour éviter les problèmes avec certains navigateurs
}));

// Configuration CORS
const corsOptions = {
    origin: function (origin, callback) {
        // Origines autorisées
        const originesAutorisees = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'https://satisf-exercice.onrender.com', // ✅ Ajouté ici
    process.env.FRONTEND_URL || 'http://localhost:3000'
];


        // En développement, autoriser les requêtes sans origin (comme Postman)
        if (!origin && process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        if (originesAutorisees.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Non autorisé par CORS'));
        }
    },
    credentials: true,                      // Autoriser les cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
    exposedHeaders: ['x-session-id']        // Exposer l'ID de session
};

// app.use(cors(corsOptions));

// ========================================
// LIMITATION DU TAUX DE REQUÊTES
// ========================================

// Limitation générale
const limitationGenerale = rateLimit({
    windowMs: 15 * 60 * 1000,              // 15 minutes
    max: 100,                              // 100 requêtes par IP par fenêtre
    message: {
        succes: false,
        message: 'Trop de requêtes, veuillez réessayer plus tard',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,                  // Inclure les en-têtes de limitation
    legacyHeaders: false,
});

// Limitation stricte pour les connexions
const limitationConnexion = rateLimit({
    windowMs: 15 * 60 * 1000,              // 15 minutes
    max: 5,                                // 5 tentatives de connexion par IP
    message: {
        succes: false,
        message: 'Trop de tentatives de connexion, veuillez réessayer plus tard',
        code: 'LOGIN_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true,           // Ne pas compter les connexions réussies
});

// Limitation pour les enquêtes publiques
const limitationEnquetes = rateLimit({
    windowMs: 60 * 60 * 1000,              // 1 heure
    max: 10,                               // 10 enquêtes par IP par heure
    message: {
        succes: false,
        message: 'Limite d\'enquêtes atteinte, veuillez réessayer plus tard',
        code: 'SURVEY_RATE_LIMIT_EXCEEDED'
    }
});

// Appliquer la limitation générale
app.use(limitationGenerale);

// ========================================
// MIDDLEWARES DE PARSING
// ========================================

// Parser JSON avec limite de taille
app.use(express.json({ 
    limit: '10mb',
    strict: true
}));

// Parser URL-encoded
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// Middleware de sanitisation des données
app.use(sanitiserDonnees);

// ========================================
// MIDDLEWARES DE LOGGING
// ========================================

// Logger personnalisé pour les requêtes
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';

    console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent.substring(0, 100)}`);
    
    next();
});

// ========================================
// ROUTES PRINCIPALES - VERSION CORRIGÉE
// ========================================

// Route de santé de l'API
app.get('/api/health', (req, res) => {
    res.json({
        succes: true,
        message: 'API Enquête de Satisfaction opérationnelle',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Routes des services (doit être avant les enquêtes)
app.use('/api/services', serviceRoutes);

//Routes des notifications (APRÈS les routes auth)
app.use('/api/notifications', notificationRoutes);

// 🔥 CORRECTION PRINCIPALE : Routes d'authentification en premier
app.use('/api/auth', (req, res, next) => {
    // Appliquer limitation stricte pour connexion
    if (req.method === 'POST' && req.path === '/connexion') {
        return limitationConnexion(req, res, next);
    }
    next();
}, authRoutes);

// 🔥 ROUTE CRITIQUE : Dashboard stats (AVANT les statistiques générales)
app.use('/api/dashboard', dashboardRoutes);

// Routes des statistiques (APRÈS dashboard pour éviter les conflits)
app.use('/api/statistiques', statistiquesRoutes);

// 🔥 ROUTE CRITIQUE : Enquêtes pour le tableau dynamique
app.use('/api/enquetes', (req, res, next) => {
    // Appliquer limitation spéciale pour POST (création d'enquête)
    if (req.method === 'POST' && req.path === '/') {
        return limitationEnquetes(req, res, next);
    }
    next();
}, enqueteRoutes);

// ========================================
// ROUTES DE TEST POUR DEBUGGING
// ========================================

// Route de test pour vérifier l'API des enquêtes
app.get('/api/test/enquetes', (req, res) => {
    res.json({
        succes: true,
        message: 'Route des enquêtes accessible',
        endpoints: [
            'GET /api/enquetes - Lister les enquêtes (authentification requise)',
            'POST /api/enquetes - Créer une enquête',
            'GET /api/enquetes/:id - Obtenir une enquête spécifique',
            'DELETE /api/enquetes/:id - Supprimer une enquête'
        ]
    });
});

// Route de test pour vérifier l'API du dashboard
app.get('/api/test/dashboard', (req, res) => {
    res.json({
        succes: true,
        message: 'Route du dashboard accessible',
        endpoints: [
            'GET /api/dashboard/stats - Statistiques du tableau de bord (authentification requise)',
            'GET /api/dashboard/live - Statistiques en temps réel'
        ]
    });
});

// ========================================
// SERVIR LES FICHIERS STATIQUES (FRONTEND)
// ========================================

// Servir le frontend depuis le dossier frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Route catch-all pour le frontend (SPA routing)
app.get('*', (req, res, next) => {
    // Ne pas intercepter les routes API
    if (req.originalUrl.startsWith('/api')) {
        return next();
    }
    
    // Servir index.html pour toutes les autres routes
    res.sendFile(path.join(__dirname, '../frontend/pages/accueil/index.html'));
});

// ========================================
// GESTION DES ERREURS
// ========================================

// Middleware de gestion des erreurs 404 pour les routes API
app.use('/api/*', (req, res) => {
    console.log(`❌ Endpoint API non trouvé: ${req.method} ${req.originalUrl}`);
    
    res.status(404).json({
        succes: false,
        message: 'Endpoint API non trouvé',
        code: 'ENDPOINT_NOT_FOUND',
        url: req.originalUrl,
        methode: req.method,
        suggestion: 'Vérifiez que l\'URL et la méthode HTTP sont correctes'
    });
});

// Middleware de gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err);

    // Erreur de parsing JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            succes: false,
            message: 'Format JSON invalide',
            code: 'INVALID_JSON'
        });
    }

    // Erreur CORS
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({
            succes: false,
            message: 'Origine non autorisée',
            code: 'CORS_ERROR'
        });
    }

    // Erreur de limite de taille
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            succes: false,
            message: 'Fichier trop volumineux',
            code: 'FILE_TOO_LARGE'
        });
    }

    // Erreur générique
    const statusCode = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Erreur interne du serveur' 
        : err.message;

    res.status(statusCode).json({
        succes: false,
        message: message,
        code: 'INTERNAL_SERVER_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ========================================
// GESTION DES SIGNAUX DE PROCESSUS
// ========================================

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
    console.log('SIGTERM reçu, arrêt du serveur...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT reçu, arrêt du serveur...');
    process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
    console.error('Erreur non capturée:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesse rejetée non gérée:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

module.exports = app;
