// ========================================
// CONTRÔLEUR NOTIFICATIONS
// Fichier: backend/controleurs/notificationControleur.js
// ========================================

const Notification = require('../modeles/Notification');
const Utilisateur = require('../modeles/Utilisateur');

class NotificationControleur {

    /**
     * 🔔 Obtient les notifications non lues pour l'utilisateur connecté
     * GET /api/notifications/non-lues
     */
    static async obtenirNotificationsNonLues(req, res) {
        try {
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            const notifications = await Notification.obtenirNotificationsNonLues(req.utilisateur.id_utilisateur);

            res.json({
                succes: true,
                message: 'Notifications non lues récupérées',
                data: notifications,
                total: notifications.length
            });

        } catch (erreur) {
            console.error('❌ Erreur récupération notifications:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la récupération des notifications',
                erreur: erreur.message
            });
        }
    }

    /**
     * 🔢 Compte les notifications non lues pour l'utilisateur connecté
     * GET /api/notifications/compteur
     */
    static async compterNotificationsNonLues(req, res) {
        try {
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            const compteur = await Notification.compterNotificationsNonLues(req.utilisateur.id_utilisateur);

            res.json({
                succes: true,
                data: {
                    compteur: compteur,
                    hasNotifications: compteur > 0
                }
            });

        } catch (erreur) {
            console.error('❌ Erreur comptage notifications:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors du comptage des notifications',
                erreur: erreur.message
            });
        }
    }

    /**
     * ✅ Marque une notification comme lue
     * PUT /api/notifications/:id/lue
     */
    static async marquerCommeLue(req, res) {
        try {
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            const idNotification = parseInt(req.params.id);
            
            if (isNaN(idNotification)) {
                return res.status(400).json({
                    succes: false,
                    message: 'ID de notification invalide'
                });
            }

            const resultat = await Notification.marquerCommeLue(idNotification, req.utilisateur.id_utilisateur);

            if (!resultat.succes) {
                return res.status(404).json(resultat);
            }

            // Enregistrer l'action
            await Utilisateur.enregistrerLog(
                req.utilisateur.id_utilisateur,
                'notification_lue',
                `Notification ${idNotification} marquée comme lue`,
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                succes: true,
                message: 'Notification marquée comme lue'
            });

        } catch (erreur) {
            console.error('❌ Erreur marquage notification:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors du marquage de la notification',
                erreur: erreur.message
            });
        }
    }

    /**
     * ✅ Marque toutes les notifications comme lues
     * PUT /api/notifications/toutes-lues
     */
    static async marquerToutesCommeLues(req, res) {
        try {
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            const resultat = await Notification.marquerToutesCommeLues(req.utilisateur.id_utilisateur);

            // Enregistrer l'action
            await Utilisateur.enregistrerLog(
                req.utilisateur.id_utilisateur,
                'toutes_notifications_lues',
                `${resultat.nombreMarquees} notifications marquées comme lues`,
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                succes: true,
                message: resultat.message,
                nombreMarquees: resultat.nombreMarquees
            });

        } catch (erreur) {
            console.error('❌ Erreur marquage toutes notifications:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors du marquage des notifications',
                erreur: erreur.message
            });
        }
    }

    /**
     * 📋 Obtient l'historique des notifications avec pagination
     * GET /api/notifications/historique?page=1&limite=20
     */
    static async obtenirHistorique(req, res) {
        try {
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            const page = parseInt(req.query.page) || 1;
            const limite = parseInt(req.query.limite) || 20;

            const historique = await Notification.obtenirHistorique(page, limite);

            res.json({
                succes: true,
                message: 'Historique des notifications récupéré',
                data: historique.notifications,
                pagination: historique.pagination
            });

        } catch (erreur) {
            console.error('❌ Erreur historique notifications:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la récupération de l\'historique',
                erreur: erreur.message
            });
        }
    }

    /**
     * 🔄 Endpoint pour le polling temps réel (retourne compteur + dernières notifications)
     * GET /api/notifications/updates
     */
    static async obtenirMisesAJour(req, res) {
        try {
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            // Récupérer le compteur et les dernières notifications
            const [compteur, notifications] = await Promise.all([
                Notification.compterNotificationsNonLues(req.utilisateur.id_utilisateur),
                Notification.obtenirNotificationsNonLues(req.utilisateur.id_utilisateur)
            ]);

            res.json({
                succes: true,
                data: {
                    compteur: compteur,
                    hasNotifications: compteur > 0,
                    notifications: notifications.slice(0, 5), // Limiter à 5 pour l'affichage rapide
                    derniereMiseAJour: new Date().toISOString()
                }
            });

        } catch (erreur) {
            console.error('❌ Erreur mises à jour notifications:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la récupération des mises à jour',
                erreur: erreur.message
            });
        }
    }

    /**
     * 🔧 Nettoie les anciennes notifications (admin seulement)
     * DELETE /api/notifications/nettoyage
     */
    static async nettoyerAnciennesNotifications(req, res) {
        try {
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            // Vérifier les permissions admin
            if (!Utilisateur.verifierPermission(req.utilisateur.role, 'configuration_systeme')) {
                return res.status(403).json({
                    succes: false,
                    message: 'Permission insuffisante - Admin requis'
                });
            }

            const joursAnciennete = parseInt(req.query.jours) || 30;
            const nombreSupprimees = await Notification.nettoyerAnciennesNotifications(joursAnciennete);

            // Enregistrer l'action
            await Utilisateur.enregistrerLog(
                req.utilisateur.id_utilisateur,
                'nettoyage_notifications',
                `${nombreSupprimees} notifications anciennes supprimées (>${joursAnciennete} jours)`,
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                succes: true,
                message: `${nombreSupprimees} notifications anciennes supprimées`,
                nombreSupprimees: nombreSupprimees
            });

        } catch (erreur) {
            console.error('❌ Erreur nettoyage notifications:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors du nettoyage des notifications',
                erreur: erreur.message
            });
        }
    }

    /**
     * ➕ Crée une notification manuelle (admin seulement)
     * POST /api/notifications/creer
     */
    static async creerNotificationManuelle(req, res) {
        try {
            if (!req.utilisateur) {
                return res.status(401).json({
                    succes: false,
                    message: 'Authentification requise'
                });
            }

            // Vérifier les permissions admin
            if (!Utilisateur.verifierPermission(req.utilisateur.role, 'configuration_systeme')) {
                return res.status(403).json({
                    succes: false,
                    message: 'Permission insuffisante - Admin requis'
                });
            }

            const { titre, message, type, idUtilisateurDestinataire } = req.body;

            if (!titre || !message) {
                return res.status(400).json({
                    succes: false,
                    message: 'Titre et message sont obligatoires'
                });
            }

            const resultat = await Notification.creerNotification({
                type: type || 'alerte_systeme',
                titre: titre,
                message: message,
                idUtilisateurDestinataire: idUtilisateurDestinataire,
                donneesSupplementaires: {
                    cree_par: req.utilisateur.nom_utilisateur,
                    date_creation_manuelle: new Date().toISOString()
                }
            });

            // Enregistrer l'action
            await Utilisateur.enregistrerLog(
                req.utilisateur.id_utilisateur,
                'creation_notification_manuelle',
                `Notification manuelle créée: ${titre}`,
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                succes: true,
                message: 'Notification créée avec succès',
                idNotification: resultat.idNotification
            });

        } catch (erreur) {
            console.error('❌ Erreur création notification manuelle:', erreur);
            res.status(500).json({
                succes: false,
                message: 'Erreur lors de la création de la notification',
                erreur: erreur.message
            });
        }
    }
}

module.exports = NotificationControleur;