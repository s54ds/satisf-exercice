// ========================================
// CONTRÔLEUR AUTHENTIFICATION
// Fichier: backend/controleurs/authControleur.js
// ========================================

const Utilisateur = require('../modeles/Utilisateur');
const { genererToken, validerMotDePasse } = require('../config/auth');

class AuthControleur {

    /**
     * Connexion d'un utilisateur - VERSION CORRIGÉE
     * POST /api/auth/connexion
     */
    static async connexion(req, res) {
        try {
            const { nomUtilisateur, motDePasse } = req.body;

            if (!nomUtilisateur || !motDePasse) {
                return res.status(400).json({
                    succes: false,
                    message: 'Nom d\'utilisateur et mot de passe requis'
                });
            }

            console.log('🔐 Tentative de connexion pour:', nomUtilisateur);

            // --- Vérification SUPER ADMIN ---
            const superNom = process.env.SUPERADMIN_USERNAME;
            const superMdp = process.env.SUPERADMIN_PASSWORD;
            const superRole = process.env.SUPERADMIN_ROLE || 'SuperAdmin';

            console.log('🔍 Variables SuperAdmin:', { superNom, superRole, hasPassword: !!superMdp });

            if (nomUtilisateur === superNom && motDePasse === superMdp) {
                console.log('✅ Connexion SuperAdmin réussie');
                
                const utilisateur = {
                    id_utilisateur: 'superadmin',
                    nom_utilisateur: superNom,
                    nom: 'Super',
                    prenom: 'Admin',
                    email: superNom,
                    role: superRole
                };

                const token = genererToken(utilisateur);

                return res.json({
                    succes: true,
                    message: 'Connexion super administrateur réussie',
                    data: {
                        utilisateur,
                        token,
                        session: null
                    }
                });
            }

            console.log('❌ Échec SuperAdmin, tentative utilisateur normal...');

            // --- Sinon : Connexion utilisateur normal ---
            const resultatAuth = await Utilisateur.authentifier(nomUtilisateur, motDePasse);

            if (!resultatAuth.succes) {
                console.log('❌ Authentification utilisateur échouée:', resultatAuth.message);
                return res.status(401).json({
                    succes: false,
                    message: resultatAuth.message
                });
            }

            console.log('✅ Authentification utilisateur réussie');

            const utilisateur = resultatAuth.utilisateur;

            const idSession = await Utilisateur.creerSession(utilisateur.id_utilisateur, {
                adresseIP: req.ip,
                userAgent: req.get('User-Agent')
            });

            const token = genererToken(utilisateur);

            await Utilisateur.enregistrerLog(
                utilisateur.id_utilisateur,
                'connexion',
                'Connexion réussie',
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                succes: true,
                message: 'Connexion réussie',
                data: {
                    utilisateur: {
                        id: utilisateur.id_utilisateur,
                        nomUtilisateur: utilisateur.nom_utilisateur,
                        nom: utilisateur.nom,
                        prenom: utilisateur.prenom,
                        email: utilisateur.email,
                        role: utilisateur.role
                    },
                    token: token,
                    session: idSession
                }
            });

        } catch (erreur) {
            console.error('❌ Erreur connexion:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la connexion',
                erreur: erreur.message
            });
        }
    }

    /**
     * Déconnexion d'un utilisateur
     * POST /api/auth/deconnexion
     */
    static async deconnexion(req, res) {
        try {
            const idSession = req.headers['x-session-id'];

            if (idSession) {
                // Supprimer la session
                await Utilisateur.supprimerSession(idSession);

                // Enregistrer l'action de déconnexion (sauf pour SuperAdmin)
                if (req.utilisateur && req.utilisateur.id_utilisateur !== 'superadmin') {
                    await Utilisateur.enregistrerLog(
                        req.utilisateur.id_utilisateur,
                        'deconnexion',
                        'Déconnexion manuelle',
                        req.ip,
                        req.get('User-Agent')
                    );
                }
            }

            res.json({
                succes: true,
                message: 'Déconnexion réussie'
            });

        } catch (erreur) {
            console.error('Erreur déconnexion:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la déconnexion',
                erreur: erreur.message
            });
        }
    }

    /**
     * Vérification du statut de connexion
     * GET /api/auth/statut
     */
    static async verifierStatut(req, res) {
        try {
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Non connecté'
                });
            }

            // Si SuperAdmin, retourner directement
            if (req.utilisateur.id_utilisateur === 'superadmin') {
                return res.json({
                    succes: true,
                    message: 'SuperAdmin connecté',
                    data: {
                        utilisateur: req.utilisateur
                    }
                });
            }

            // Récupérer les infos utilisateur à jour
            const utilisateur = await Utilisateur.obtenirUtilisateurParId(req.utilisateur.id_utilisateur);

            if (!utilisateur || !utilisateur.actif) {
                return res.status(401).json({
                    succes: false,
                    message: 'Utilisateur inactif ou supprimé'
                });
            }

            res.json({
                succes: true,
                message: 'Utilisateur connecté',
                data: {
                    utilisateur: {
                        id: utilisateur.id_utilisateur,
                        nomUtilisateur: utilisateur.nom_utilisateur,
                        nom: utilisateur.nom,
                        prenom: utilisateur.prenom,
                        email: utilisateur.email,
                        role: utilisateur.role,
                        derniereConnexion: utilisateur.derniere_connexion
                    }
                }
            });

        } catch (erreur) {
            console.error('Erreur vérification statut:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la vérification du statut',
                erreur: erreur.message
            });
        }
    }

    /**
     * Changement de mot de passe
     * POST /api/auth/changer-mot-de-passe
     */
    static async changerMotDePasse(req, res) {
        try {
            const { ancienMotDePasse, nouveauMotDePasse, confirmerMotDePasse } = req.body;

            // Vérifier l'authentification
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            // Interdire le changement de mot de passe pour SuperAdmin
            if (req.utilisateur.id_utilisateur === 'superadmin') {
                return res.status(403).json({
                    succes: false,
                    message: 'Le mot de passe SuperAdmin ne peut pas être modifié via cette interface'
                });
            }

            // Validation des données
            if (!ancienMotDePasse || !nouveauMotDePasse || !confirmerMotDePasse) {
                return res.status(400).json({
                    succes: false,
                    message: 'Tous les champs sont requis'
                });
            }

            if (nouveauMotDePasse !== confirmerMotDePasse) {
                return res.status(400).json({
                    succes: false,
                    message: 'Les mots de passe ne correspondent pas'
                });
            }

            // Valider la force du nouveau mot de passe
            const validationMdp = validerMotDePasse(nouveauMotDePasse);
            if (!validationMdp.valide) {
                return res.status(400).json({
                    succes: false,
                    message: validationMdp.message,
                    regles: validationMdp.regles
                });
            }

            // Changer le mot de passe
            const resultat = await Utilisateur.changerMotDePasse(
                req.utilisateur.id_utilisateur,
                ancienMotDePasse,
                nouveauMotDePasse
            );

            if (!resultat.succes) {
                return res.status(400).json({
                    succes: false,
                    message: resultat.message
                });
            }

            // Enregistrer l'action
            await Utilisateur.enregistrerLog(
                req.utilisateur.id_utilisateur,
                'changement_mot_de_passe',
                'Mot de passe modifié avec succès',
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                succes: true,
                message: 'Mot de passe changé avec succès'
            });

        } catch (erreur) {
            console.error('Erreur changement mot de passe:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors du changement de mot de passe',
                erreur: erreur.message
            });
        }
    }

    /**
     * Création d'un nouvel utilisateur (admin seulement)
     * POST /api/auth/creer-utilisateur
     */
    static async creerUtilisateur(req, res) {
        try {
            // Vérifier les permissions admin (SuperAdmin inclus)
            if (!req.utilisateur || (req.utilisateur.role !== 'Administrateur' && req.utilisateur.role !== 'SuperAdmin')) {
                return res.status(403).json({
                    succes: false,
                    message: 'Seuls les administrateurs peuvent créer des utilisateurs'
                });
            }

            const { nomUtilisateur, motDePasse, nom, prenom, email, role } = req.body;

            // Validation des données
            if (!nomUtilisateur || !motDePasse || !nom || !role) {
                return res.status(400).json({
                    succes: false,
                    message: 'Nom d\'utilisateur, mot de passe, nom et rôle requis'
                });
            }

            // Valider la force du mot de passe
            const validationMdp = validerMotDePasse(motDePasse);
            if (!validationMdp.valide) {
                return res.status(400).json({
                    succes: false,
                    message: validationMdp.message,
                    regles: validationMdp.regles
                });
            }

            // Valider le rôle
            const rolesValides = ['Administrateur', 'Responsable Qualité', 'Directrice Générale'];
            if (!rolesValides.includes(role)) {
                return res.status(400).json({
                    succes: false,
                    message: 'Rôle invalide'
                });
            }

            const donneesUtilisateur = {
                nomUtilisateur,
                motDePasse,
                nom,
                prenom,
                email,
                role
            };

            // Créer l'utilisateur
            const resultat = await Utilisateur.creerUtilisateur(donneesUtilisateur);

            // Enregistrer l'action (sauf pour SuperAdmin)
            if (req.utilisateur.id_utilisateur !== 'superadmin') {
                await Utilisateur.enregistrerLog(
                    req.utilisateur.id_utilisateur,
                    'creation_utilisateur',
                    `Utilisateur ${nomUtilisateur} créé avec le rôle ${role}`,
                    req.ip,
                    req.get('User-Agent')
                );
            }

            res.status(201).json({
                succes: true,
                message: 'Utilisateur créé avec succès',
                data: {
                    idUtilisateur: resultat.idUtilisateur
                }
            });

        } catch (erreur) {
            console.error('Erreur création utilisateur:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la création de l\'utilisateur',
                erreur: erreur.message
            });
        }
    }

    /**
     * Liste de tous les utilisateurs (admin seulement)
     * GET /api/auth/utilisateurs
     */
    static async obtenirUtilisateurs(req, res) {
        try {
            // Vérifier les permissions admin (SuperAdmin inclus)
            if (!req.utilisateur || (req.utilisateur.role !== 'Administrateur' && req.utilisateur.role !== 'SuperAdmin')) {
                return res.status(403).json({
                    succes: false,
                    message: 'Seuls les administrateurs peuvent voir la liste des utilisateurs'
                });
            }

            const utilisateurs = await Utilisateur.obtenirTousUtilisateurs();

            res.json({
                succes: true,
                message: 'Utilisateurs récupérés avec succès',
                data: utilisateurs
            });

        } catch (erreur) {
            console.error('Erreur récupération utilisateurs:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la récupération des utilisateurs',
                erreur: erreur.message
            });
        }
    }

    /**
     * Mise à jour d'un utilisateur (admin seulement)
     * PUT /api/auth/utilisateurs/:id
     */
    static async mettreAJourUtilisateur(req, res) {
        try {
            const idUtilisateur = parseInt(req.params.id);

            // Vérifier les permissions admin (SuperAdmin inclus)
            if (!req.utilisateur || (req.utilisateur.role !== 'Administrateur' && req.utilisateur.role !== 'SuperAdmin')) {
                return res.status(403).json({
                    succes: false,
                    message: 'Seuls les administrateurs peuvent modifier les utilisateurs'
                });
            }

            const donneesUtilisateur = req.body;

            // Valider le rôle si fourni
            if (donneesUtilisateur.role) {
                const rolesValides = ['Administrateur', 'Responsable Qualité', 'Directrice Générale'];
                if (!rolesValides.includes(donneesUtilisateur.role)) {
                    return res.status(400).json({
                        succes: false,
                        message: 'Rôle invalide'
                    });
                }
            }

            const resultat = await Utilisateur.mettreAJourUtilisateur(idUtilisateur, donneesUtilisateur);

            if (!resultat.succes) {
                return res.status(404).json(resultat);
            }

            // Enregistrer l'action (sauf pour SuperAdmin)
            if (req.utilisateur.id_utilisateur !== 'superadmin') {
                await Utilisateur.enregistrerLog(
                    req.utilisateur.id_utilisateur,
                    'modification_utilisateur',
                    `Utilisateur ID ${idUtilisateur} modifié`,
                    req.ip,
                    req.get('User-Agent')
                );
            }

            res.json({
                succes: true,
                message: 'Utilisateur mis à jour avec succès'
            });

        } catch (erreur) {
            console.error('Erreur mise à jour utilisateur:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la mise à jour de l\'utilisateur',
                erreur: erreur.message
            });
        }
    }

    /**
     * Nettoyage des sessions expirées
     * POST /api/auth/nettoyer-sessions
     */
    static async nettoyerSessions(req, res) {
        try {
            // Vérifier les permissions admin (SuperAdmin inclus)
            if (!req.utilisateur || (req.utilisateur.role !== 'Administrateur' && req.utilisateur.role !== 'SuperAdmin')) {
                return res.status(403).json({
                    succes: false,
                    message: 'Permission insuffisante'
                });
            }

            const nombreSessionsSupprimees = await Utilisateur.nettoyerSessionsExpirees();

            res.json({
                succes: true,
                message: `${nombreSessionsSupprimees} sessions expirées supprimées`
            });

        } catch (erreur) {
            console.error('Erreur nettoyage sessions:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors du nettoyage des sessions',
                erreur: erreur.message
            });
        }
    }
}

module.exports = AuthControleur;