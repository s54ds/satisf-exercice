// ========================================
// CONTRÔLEUR ENQUÊTES CORRIGÉ
// Fichier: backend/controleurs/enqueteControleur.js
// ========================================

const Enquete = require('../modeles/Enquete');
const Utilisateur = require('../modeles/Utilisateur');

class EnqueteControleur {

    /**
     * Crée une nouvelle enquête de satisfaction - VERSION CORRIGÉE
     * POST /api/enquetes
     */
    static async creerEnquete(req, res) {
        try {
            console.log('📝 Réception nouvelle enquête:', req.body);
            
            // CORRECTION 1: Mapping correct des données du frontend
            const donneesEnquete = {
                // Combiner date et heure de visite
                dateHeureVisite: req.body.dateVisite && req.body.heureVisite 
                    ? `${req.body.dateVisite} ${req.body.heureVisite}:00`
                    : new Date().toISOString().slice(0, 19).replace('T', ' '),
                
                // Données personnelles (mapping frontend -> backend)
                nomVisiteur: req.body.nom,
                prenomVisiteur: req.body.prenom || null,
                telephone: req.body.telephone,
                email: req.body.email || null,
                
                // Données de la visite
                raisonPresence: req.body.raisonPresence,
                niveauSatisfaction: req.body.satisfaction, // Frontend envoie "satisfaction"
                
                // CORRECTION 2: Service - obtenir l'ID par le nom (méthode statique)
                idService: await EnqueteControleur.obtenirIdServiceParNom(req.body.serviceConcerne),
                
                // Commentaires
                commentaires: req.body.commentaires || null,
                recommandations: req.body.recommandations || null,
                
                // Données techniques
                adresseIP: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent')
            };

            console.log('🔍 Données mappées pour la DB:', donneesEnquete);

            // CORRECTION 3: Vérifier que l'ID service a été trouvé
            if (!donneesEnquete.idService) {
                console.error('❌ Service non trouvé:', req.body.serviceConcerne);
                return res.status(400).json({
                    succes: false,
                    message: 'Service non trouvé',
                    erreurs: ['Le service spécifié n\'existe pas']
                });
            }

            // CORRECTION 4: Valider les données
            const validation = Enquete.validerDonneesEnquete(donneesEnquete);
            
            if (!validation.valide) {
                console.error('❌ Validation échouée:', validation.erreurs);
                return res.status(400).json({
                    succes: false,
                    message: 'Données invalides',
                    erreurs: validation.erreurs
                });
            }

            // CORRECTION 5: Créer l'enquête
            const resultat = await Enquete.creerEnquete(donneesEnquete);

            console.log('✅ Enquête créée avec succès:', resultat.idEnquete);

            res.status(201).json({
                succes: true,
                message: 'Enquête soumise avec succès',
                data: {
                    idEnquete: resultat.idEnquete
                }
            });

        } catch (erreur) {
            console.error('❌ Erreur création enquête:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la création de l\'enquête',
                erreur: erreur.message
            });
        }
    }

    /**
     * CORRECTION 6: Méthode statique pour obtenir l'ID d'un service par son nom
     */
    static async obtenirIdServiceParNom(nomService) {
        try {
            const { executerRequete } = require('../config/database');
            
            console.log('🔍 Recherche service:', nomService);
            
            const resultats = await executerRequete(
                'SELECT id_service FROM services WHERE nom_service = ? AND actif = 1',
                [nomService]
            );
            
            if (resultats && resultats.length > 0) {
                console.log('✅ Service trouvé:', resultats[0].id_service);
                return resultats[0].id_service;
            } else {
                console.error('❌ Service non trouvé dans la base:', nomService);
                return null;
            }
        } catch (erreur) {
            console.error('❌ Erreur récupération ID service:', erreur);
            return null;
        }
    }

    /**
     * CORRECTION 7: Récupère toutes les enquêtes avec pagination - POUR LE TABLEAU
     * GET /api/enquetes?page=1&limite=20
     */
    static async obtenirToutesEnquetes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limite = parseInt(req.query.limite) || 20;

            console.log(`📋 Récupération enquêtes - Page: ${page}, Limite: ${limite}`);

            // Vérifier les permissions
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            // CORRECTION 8: Vérifier les permissions avec la méthode statique correcte
            if (!EnqueteControleur.verifierPermissionUtilisateur(req.utilisateur.role, 'voir_enquetes')) {
                return res.status(403).json({
                    succes: false,
                    message: 'Permission insuffisante'
                });
            }

            const resultats = await Enquete.obtenirToutesEnquetes(page, limite);

            // CORRECTION 9: Enregistrer l'action dans les logs (si pas SuperAdmin)
            if (req.utilisateur.id_utilisateur !== 'superadmin') {
                await Utilisateur.enregistrerLog(
                    req.utilisateur.id_utilisateur,
                    'consultation_enquetes',
                    `Consultation page ${page}`,
                    req.ip,
                    req.get('User-Agent')
                );
            }

            console.log(`✅ ${resultats.enquetes.length} enquêtes récupérées`);

            res.json({
                succes: true,
                message: 'Enquêtes récupérées avec succès',
                data: resultats.enquetes,
                pagination: resultats.pagination
            });

        } catch (erreur) {
            console.error('❌ Erreur récupération enquêtes:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la récupération des enquêtes',
                erreur: erreur.message
            });
        }
    }

    /**
     * CORRECTION 10: Méthode helper pour vérifier les permissions
     */
    static verifierPermissionUtilisateur(role, permission) {
        // SuperAdmin a toutes les permissions
        if (role === 'SuperAdmin') {
            return true;
        }
        
        // Définir les permissions par rôle
        const PERMISSIONS = {
            'Administrateur': [
                'voir_enquetes',
                'exporter_donnees',
                'voir_statistiques',
                'gerer_utilisateurs',
                'gerer_services',
                'voir_logs'
            ],
            'Responsable Qualité': [
                'voir_enquetes',
                'exporter_donnees',
                'voir_statistiques'
            ],
            'Directrice Générale': [
                'voir_enquetes',
                'exporter_donnees',
                'voir_statistiques',
                'voir_logs'
            ]
        };
        
        return PERMISSIONS[role] && PERMISSIONS[role].includes(permission);
    }

    /**
     * Récupère une enquête spécifique par ID
     * GET /api/enquetes/:id
     */
    static async obtenirEnqueteParId(req, res) {
        try {
            const idEnquete = parseInt(req.params.id);

            // Vérifier les permissions
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            if (!EnqueteControleur.verifierPermissionUtilisateur(req.utilisateur.role, 'voir_enquetes')) {
                return res.status(403).json({
                    succes: false,
                    message: 'Permission insuffisante'
                });
            }

            const enquete = await Enquete.obtenirEnqueteParId(idEnquete);

            if (!enquete) {
                return res.status(404).json({
                    succes: false,
                    message: 'Enquête non trouvée'
                });
            }

            res.json({
                succes: true,
                message: 'Enquête récupérée avec succès',
                data: enquete
            });

        } catch (erreur) {
            console.error('❌ Erreur récupération enquête:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la récupération de l\'enquête',
                erreur: erreur.message
            });
        }
    }

    /**
     * Filtre les enquêtes selon des critères
     * POST /api/enquetes/filtrer
     */
    static async filtrerEnquetes(req, res) {
        try {
            // Vérifier les permissions
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            if (!EnqueteControleur.verifierPermissionUtilisateur(req.utilisateur.role, 'voir_enquetes')) {
                return res.status(403).json({
                    succes: false,
                    message: 'Permission insuffisante'
                });
            }

            const filtres = {
                dateDebut: req.body.dateDebut,
                dateFin: req.body.dateFin,
                niveauSatisfaction: req.body.niveauSatisfaction,
                idService: req.body.idService,
                raisonPresence: req.body.raisonPresence
            };

            // Supprimer les filtres vides
            Object.keys(filtres).forEach(key => {
                if (!filtres[key]) delete filtres[key];
            });

            const enquetes = await Enquete.filtrerEnquetes(filtres);

            // Enregistrer l'action
            if (req.utilisateur.id_utilisateur !== 'superadmin') {
                await Utilisateur.enregistrerLog(
                    req.utilisateur.id_utilisateur,
                    'filtrage_enquetes',
                    `Filtres appliqués: ${JSON.stringify(filtres)}`,
                    req.ip,
                    req.get('User-Agent')
                );
            }

            res.json({
                succes: true,
                message: 'Enquêtes filtrées avec succès',
                data: {
                    enquetes: enquetes,
                    nombreResultats: enquetes.length,
                    filtresAppliques: filtres
                }
            });

        } catch (erreur) {
            console.error('❌ Erreur filtrage enquêtes:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors du filtrage des enquêtes',
                erreur: erreur.message
            });
        }
    }

    /**
     * Supprime une enquête (admin seulement)
     * DELETE /api/enquetes/:id
     */
    static async supprimerEnquete(req, res) {
        try {
            const idEnquete = parseInt(req.params.id);

            // Vérifier les permissions admin
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            if (req.utilisateur.role !== 'Administrateur' && req.utilisateur.role !== 'SuperAdmin') {
                return res.status(403).json({
                    succes: false,
                    message: 'Seuls les administrateurs peuvent supprimer des enquêtes'
                });
            }

            const resultat = await Enquete.supprimerEnquete(idEnquete);

            if (!resultat.succes) {
                return res.status(404).json(resultat);
            }

            // Enregistrer l'action
            if (req.utilisateur.id_utilisateur !== 'superadmin') {
                await Utilisateur.enregistrerLog(
                    req.utilisateur.id_utilisateur,
                    'suppression_enquete',
                    `Enquête ID ${idEnquete} supprimée`,
                    req.ip,
                    req.get('User-Agent')
                );
            }

            res.json({
                succes: true,
                message: 'Enquête supprimée avec succès'
            });

        } catch (erreur) {
            console.error('❌ Erreur suppression enquête:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la suppression de l\'enquête',
                erreur: erreur.message
            });
        }
    }

    /**
     * Obtient les services disponibles pour le formulaire - CORRIGÉ
     * GET /api/enquetes/services
     */
    static async obtenirServices(req, res) {
        try {
            const { executerRequete } = require('../config/database');
            
            console.log('🏥 Récupération des services...');
            
            const services = await executerRequete(
                'SELECT id_service, nom_service as nom, description_service as description FROM services WHERE actif = 1 ORDER BY nom_service'
            );

            console.log(`✅ ${services.length} services trouvés`);

            res.json({
                succes: true,
                message: 'Services récupérés avec succès',
                data: services
            });

        } catch (erreur) {
            console.error('❌ Erreur récupération services:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la récupération des services',
                erreur: erreur.message
            });
        }
    }

    /**
     * Valide les données d'une enquête
     * POST /api/enquetes/valider
     */
    static async validerDonnees(req, res) {
        try {
            const donneesEnquete = req.body;
            const validation = Enquete.validerDonneesEnquete(donneesEnquete);

            res.json({
                succes: validation.valide,
                message: validation.valide ? 'Données valides' : 'Données invalides',
                erreurs: validation.erreurs || []
            });

        } catch (erreur) {
            console.error('❌ Erreur validation données:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la validation',
                erreur: erreur.message
            });
        }
    }

    /**
     * Obtient le nombre total d'enquêtes (pour le dashboard)
     * GET /api/enquetes/total
     */
    static async obtenirTotalEnquetes(req, res) {
        try {
            // Vérifier les permissions
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            if (!EnqueteControleur.verifierPermissionUtilisateur(req.utilisateur.role, 'voir_enquetes')) {
                return res.status(403).json({
                    succes: false,
                    message: 'Permission insuffisante'
                });
            }

            const { executerRequete } = require('../config/database');
            
            const [total] = await executerRequete('SELECT COUNT(*) as total FROM enquetes');

            res.json({
                succes: true,
                message: 'Total des enquêtes récupéré',
                data: {
                    totalEnquetes: total.total
                }
            });

        } catch (erreur) {
            console.error('❌ Erreur total enquêtes:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors du calcul du total',
                erreur: erreur.message
            });
        }
    }
}

module.exports = EnqueteControleur;