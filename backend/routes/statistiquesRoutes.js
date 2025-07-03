// ========================================
// ROUTES STATISTIQUES AVEC EXPORT EXCEL
// Fichier: backend/routes/statistiquesRoutes.js
// ========================================

const express = require('express');
const router = express.Router();
const StatistiquesControleur = require('../controleurs/statistiquesControleur');
const { verifierAuthentification } = require('../middleware/authentification');
const { validerPeriodeStats } = require('../middleware/validation');

// ========================================
// TOUTES LES ROUTES SONT PROTÉGÉES
// (Nécessitent une authentification)
// ========================================

// Middleware pour toutes les routes de statistiques
router.use(verifierAuthentification);

// ========================================
// ROUTES STATISTIQUES GÉNÉRALES
// ========================================

/**
 * Obtenir toutes les statistiques pour le dashboard
 * GET /api/statistiques/dashboard
 */
router.get('/dashboard', StatistiquesControleur.obtenirStatistiquesDashboard);

/**
 * Obtenir un résumé rapide pour le header du dashboard
 * GET /api/statistiques/resume
 */
router.get('/resume', StatistiquesControleur.obtenirResume);

/**
 * Obtenir les statistiques de satisfaction
 * GET /api/statistiques/satisfaction
 */
router.get('/satisfaction', StatistiquesControleur.obtenirStatistiquesSatisfaction);

/**
 * Obtenir les statistiques par service
 * GET /api/statistiques/services
 */
router.get('/services', StatistiquesControleur.obtenirStatistiquesServices);

/**
 * Obtenir les statistiques par raison de présence
 * GET /api/statistiques/raisons
 */
router.get('/raisons', StatistiquesControleur.obtenirStatistiquesRaisons);

/**
 * Obtenir les statistiques mensuelles
 * GET /api/statistiques/mensuelles?mois=6
 */
router.get('/mensuelles', StatistiquesControleur.obtenirStatistiquesMensuelles);

/**
 * Obtenir les statistiques pour une période personnalisée
 * POST /api/statistiques/periode
 * Body: { dateDebut, dateFin }
 */
router.post('/periode', validerPeriodeStats, StatistiquesControleur.obtenirStatistiquesPeriode);

// ========================================
// ROUTES EXPORT DE DONNÉES - VERSION COMPLÈTE
// ========================================

/**
 * 🔥 NOUVELLE ROUTE: Export direct Excel/CSV avec téléchargement
 * GET /api/statistiques/export?format=excel&type=enquetes
 * Query params:
 * - format: excel|csv (défaut: excel)
 * - type: enquetes|statistiques|complet (défaut: enquetes)
 * - nom: nom personnalisé du fichier (optionnel)
 */
router.get('/export', StatistiquesControleur.exporterFichier);

/**
 * 🔥 NOUVELLE ROUTE: Export en JSON pour prévisualisation
 * GET /api/statistiques/export-preview?type=enquetes
 * Retourne les données formatées en JSON pour prévisualisation
 */
router.get('/export-preview', StatistiquesControleur.previsualiserExport);

/**
 * 🔥 NOUVELLE ROUTE: Export par période avec filtres
 * POST /api/statistiques/export-periode
 * Body: { dateDebut, dateFin, format, includeStats }
 */
router.post('/export-periode', validerPeriodeStats, StatistiquesControleur.exporterPeriode);

// ========================================
// ROUTES LOGS ET AUDIT
// ========================================

/**
 * Obtenir les logs d'activité (admin et directrice seulement)
 * GET /api/statistiques/logs?page=1&limite=50
 */
router.get('/logs', StatistiquesControleur.obtenirLogs);

module.exports = router;