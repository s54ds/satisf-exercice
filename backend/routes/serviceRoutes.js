// ========================================
// ROUTES SERVICES
// Fichier: backend/routes/serviceRoutes.js
// ========================================

const express = require('express');
const router = express.Router();

/**
 * Obtenir la liste des services disponibles pour le formulaire
 * GET /api/services
 */
router.get('/', async (req, res) => {
    try {
        const { executerRequete } = require('../config/database');
        
        const services = await executerRequete(
            'SELECT id_service as id, nom_service as nom, description_service as description FROM services WHERE actif = 1 ORDER BY nom_service'
        );

        console.log('Services récupérés:', services);

        res.json({
            succes: true,
            message: 'Services récupérés avec succès',
            data: services
        });

    } catch (erreur) {
        console.error('Erreur récupération services:', erreur);
        res.status(500).json({
            succes: false,
            message: 'Erreur lors de la récupération des services',
            erreur: erreur.message
        });
    }
});

module.exports = router;