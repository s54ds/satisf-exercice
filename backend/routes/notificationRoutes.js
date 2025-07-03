// ========================================
// ROUTES NOTIFICATIONS
// Fichier: backend/routes/notificationRoutes.js
// ========================================

const express = require('express');
const router = express.Router();
const NotificationControleur = require('../controleurs/notificationControleur');
const { verifierAuthentification } = require('../middleware/authentification');

// ========================================
// TOUTES LES ROUTES SONT PROTÉGÉES
// ========================================

// Middleware pour toutes les routes de notifications
router.use(verifierAuthentification);

// ========================================
// ROUTES PRINCIPALES
// ========================================

/**
 * 🔔 Obtenir les notifications non lues pour l'utilisateur connecté
 * GET /api/notifications/non-lues
 */
router.get('/non-lues', NotificationControleur.obtenirNotificationsNonLues);

/**
 * 🔢 Compter les notifications non lues pour l'utilisateur connecté
 * GET /api/notifications/compteur
 */
router.get('/compteur', NotificationControleur.compterNotificationsNonLues);

/**
 * ✅ Marquer une notification comme lue
 * PUT /api/notifications/:id/lue
 */
router.put('/:id/lue', NotificationControleur.marquerCommeLue);

/**
 * ✅ Marquer toutes les notifications comme lues
 * PUT /api/notifications/toutes-lues
 */
router.put('/toutes-lues', NotificationControleur.marquerToutesCommeLues);

/**
 * 📋 Obtenir l'historique des notifications (avec pagination)
 * GET /api/notifications/historique?page=1&limite=20
 */
router.get('/historique', NotificationControleur.obtenirHistorique);

/**
 * 🔄 Endpoint pour le polling temps réel
 * GET /api/notifications/updates
 */
router.get('/updates', NotificationControleur.obtenirMisesAJour);

// ========================================
// ROUTES ADMINISTRATEUR
// ========================================

/**
 * 🔧 Nettoyer les anciennes notifications (admin seulement)
 * DELETE /api/notifications/nettoyage
 */
router.delete('/nettoyage', NotificationControleur.nettoyerAnciennesNotifications);

/**
 * ➕ Créer une notification manuelle (admin seulement)
 * POST /api/notifications/creer
 */
router.post('/creer', NotificationControleur.creerNotificationManuelle);

module.exports = router;