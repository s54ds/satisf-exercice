// ========================================
// ROUTES AUTHENTIFICATION
// Fichier: backend/routes/authRoutes.js
// ========================================

const express = require('express');
const router = express.Router();
const AuthControleur = require('../controleurs/authControleur');
const { verifierAuthentification } = require('../middleware/authentification');
const { validerConnexion, validerCreationUtilisateur, validerChangementMotDePasse } = require('../middleware/validation');

// ========================================
// ROUTES PUBLIQUES (sans authentification)
// ========================================

/**
 * Connexion d'un utilisateur
 * POST /api/auth/connexion
 * Body: { nomUtilisateur, motDePasse }
 */
router.post('/connexion', validerConnexion, AuthControleur.connexion);

// ========================================
// ROUTES PROTÉGÉES (avec authentification)
// ========================================

/**
 * Déconnexion d'un utilisateur
 * POST /api/auth/deconnexion
 * Headers: x-session-id
 */
router.post('/deconnexion', verifierAuthentification, AuthControleur.deconnexion);

/**
 * Vérification du statut de connexion
 * GET /api/auth/statut
 */
router.get('/statut', verifierAuthentification, AuthControleur.verifierStatut);

/**
 * Changement de mot de passe
 * POST /api/auth/changer-mot-de-passe
 * Body: { ancienMotDePasse, nouveauMotDePasse, confirmerMotDePasse }
 */
router.post('/changer-mot-de-passe', 
    verifierAuthentification, 
    validerChangementMotDePasse, 
    AuthControleur.changerMotDePasse
);

// ========================================
// ROUTES ADMINISTRATEUR SEULEMENT
// ========================================

/**
 * Créer un nouvel utilisateur (admin seulement)
 * POST /api/auth/creer-utilisateur
 * Body: { nomUtilisateur, motDePasse, nom, prenom, email, role }
 */
router.post('/creer-utilisateur', 
    verifierAuthentification, 
    validerCreationUtilisateur, 
    AuthControleur.creerUtilisateur
);

/**
 * Obtenir la liste de tous les utilisateurs (admin seulement)
 * GET /api/auth/utilisateurs
 */
router.get('/utilisateurs', verifierAuthentification, AuthControleur.obtenirUtilisateurs);

/**
 * Mettre à jour un utilisateur (admin seulement)
 * PUT /api/auth/utilisateurs/:id
 * Body: { nom, prenom, email, role, actif }
 */
router.put('/utilisateurs/:id', verifierAuthentification, AuthControleur.mettreAJourUtilisateur);

/**
 * Nettoyer les sessions expirées (admin seulement)
 * POST /api/auth/nettoyer-sessions
 */
router.post('/nettoyer-sessions', verifierAuthentification, AuthControleur.nettoyerSessions);

module.exports = router;