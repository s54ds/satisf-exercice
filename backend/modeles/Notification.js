// ========================================
// MODÈLE NOTIFICATION
// Fichier: backend/modeles/Notification.js
// ========================================

const { executerRequete } = require('../config/database');

class Notification {

    /**
     * Crée une nouvelle notification
     * @param {Object} donneesNotification - Données de la notification
     * @returns {Promise<Object>} Résultat de la création
     */
    static async creerNotification(donneesNotification) {
        const requete = `
            INSERT INTO notifications (
                type_notification,
                titre,
                message,
                id_enquete,
                id_utilisateur_destinataire,
                donnees_supplementaires
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const parametres = [
            donneesNotification.type || 'nouvelle_enquete',
            donneesNotification.titre,
            donneesNotification.message,
            donneesNotification.idEnquete || null,
            donneesNotification.idUtilisateurDestinataire || null, // null = tous les admins
            donneesNotification.donneesSupplementaires ? JSON.stringify(donneesNotification.donneesSupplementaires) : null
        ];

        try {
            console.log('🔔 Création notification:', donneesNotification.titre);
            const resultat = await executerRequete(requete, parametres);
            
            console.log('✅ Notification créée, ID:', resultat.insertId);
            
            return {
                succes: true,
                idNotification: resultat.insertId,
                message: 'Notification créée avec succès'
            };
        } catch (erreur) {
            console.error('❌ Erreur création notification:', erreur);
            throw new Error(`Erreur lors de la création de la notification: ${erreur.message}`);
        }
    }

    /**
     * 🔥 MÉTHODE PRINCIPALE - Crée une notification pour une nouvelle enquête
     * @param {Object} enquete - Données de l'enquête
     * @returns {Promise<Object>} Résultat de la création
     */
    static async creerNotificationNouvelleEnquete(enquete) {
        const titre = 'Nouvelle enquête reçue';
        const nomComplet = `${enquete.nom_visiteur} ${enquete.prenom_visiteur || ''}`.trim();
        
        let message;
        let type = 'nouvelle_enquete';

        // Adapter le message selon le niveau de satisfaction
        if (enquete.niveau_satisfaction === 'Mécontent') {
            message = `⚠️ Une enquête MÉCONTENTE a été soumise par ${nomComplet}`;
            type = 'enquete_mecontent';
        } else {
            message = `✅ Une nouvelle enquête de satisfaction a été soumise par ${nomComplet}`;
        }

        const donneesSupplementaires = {
            nom_visiteur: enquete.nom_visiteur,
            prenom_visiteur: enquete.prenom_visiteur,
            satisfaction: enquete.niveau_satisfaction,
            service: enquete.nom_service,
            raison_presence: enquete.raison_presence,
            date_visite: enquete.date_heure_visite,
            commentaires: enquete.commentaires ? enquete.commentaires.substring(0, 100) : null
        };

        return await this.creerNotification({
            type: type,
            titre: titre,
            message: message,
            idEnquete: enquete.id_enquete,
            donneesSupplementaires: donneesSupplementaires
        });
    }

    /**
     * Récupère les notifications non lues pour un utilisateur ou tous les admins
     * @param {number|null} idUtilisateur - ID utilisateur (null = toutes les notifications globales)
     * @returns {Promise<Array>} Liste des notifications non lues
     */
    static async obtenirNotificationsNonLues(idUtilisateur = null) {
        let requete = `
            SELECT 
                n.*,
                e.nom_visiteur,
                e.prenom_visiteur,
                e.niveau_satisfaction,
                s.nom_service
            FROM notifications n
            LEFT JOIN enquetes e ON n.id_enquete = e.id_enquete
            LEFT JOIN services s ON e.id_service = s.id_service
            WHERE n.lu = 0 AND n.actif = 1
        `;

        let parametres = [];

        // Si un utilisateur spécifique est demandé, filtrer pour lui + les notifications globales
        if (idUtilisateur) {
            requete += ` AND (n.id_utilisateur_destinataire IS NULL OR n.id_utilisateur_destinataire = ?)`;
            parametres.push(idUtilisateur);
        } else {
            // Si pas d'utilisateur spécifique, prendre seulement les notifications globales
            requete += ` AND n.id_utilisateur_destinataire IS NULL`;
        }

        requete += ` ORDER BY n.date_creation DESC LIMIT 50`;

        try {
            const notifications = await executerRequete(requete, parametres);
            
            // Parser les données JSON
            notifications.forEach(notification => {
                if (notification.donnees_supplementaires) {
                    try {
                        notification.donnees_supplementaires = JSON.parse(notification.donnees_supplementaires);
                    } catch (e) {
                        notification.donnees_supplementaires = {};
                    }
                }
            });

            console.log(`🔔 ${notifications.length} notifications non lues récupérées`);
            return notifications;
        } catch (erreur) {
            console.error('❌ Erreur récupération notifications:', erreur);
            throw new Error(`Erreur lors de la récupération des notifications: ${erreur.message}`);
        }
    }

    /**
     * Compte le nombre de notifications non lues
     * @param {number|null} idUtilisateur - ID utilisateur
     * @returns {Promise<number>} Nombre de notifications non lues
     */
    static async compterNotificationsNonLues(idUtilisateur = null) {
        let requete = `
            SELECT COUNT(*) as total 
            FROM notifications 
            WHERE lu = 0 AND actif = 1
        `;

        let parametres = [];

        if (idUtilisateur) {
            requete += ` AND (id_utilisateur_destinataire IS NULL OR id_utilisateur_destinataire = ?)`;
            parametres.push(idUtilisateur);
        } else {
            requete += ` AND id_utilisateur_destinataire IS NULL`;
        }

        try {
            const [resultat] = await executerRequete(requete, parametres);
            return resultat.total || 0;
        } catch (erreur) {
            console.error('❌ Erreur comptage notifications:', erreur);
            return 0;
        }
    }

    /**
     * Marque une notification comme lue
     * @param {number} idNotification - ID de la notification
     * @param {number|null} idUtilisateur - ID de l'utilisateur qui lit (pour vérification)
     * @returns {Promise<Object>} Résultat de l'opération
     */
    static async marquerCommeLue(idNotification, idUtilisateur = null) {
        let requete = `
            UPDATE notifications 
            SET lu = 1, date_lecture = NOW() 
            WHERE id_notification = ? AND lu = 0
        `;

        let parametres = [idNotification];

        // Vérifier que l'utilisateur peut marquer cette notification comme lue
        if (idUtilisateur) {
            requete += ` AND (id_utilisateur_destinataire IS NULL OR id_utilisateur_destinataire = ?)`;
            parametres.push(idUtilisateur);
        }

        try {
            const resultat = await executerRequete(requete, parametres);
            
            if (resultat.affectedRows === 0) {
                return {
                    succes: false,
                    message: 'Notification non trouvée ou déjà lue'
                };
            }

            console.log(`✅ Notification ${idNotification} marquée comme lue`);
            
            return {
                succes: true,
                message: 'Notification marquée comme lue'
            };
        } catch (erreur) {
            console.error('❌ Erreur marquage notification:', erreur);
            throw new Error(`Erreur lors du marquage de la notification: ${erreur.message}`);
        }
    }

    /**
     * Marque toutes les notifications comme lues pour un utilisateur
     * @param {number|null} idUtilisateur - ID utilisateur
     * @returns {Promise<Object>} Résultat de l'opération
     */
    static async marquerToutesCommeLues(idUtilisateur = null) {
        let requete = `
            UPDATE notifications 
            SET lu = 1, date_lecture = NOW() 
            WHERE lu = 0 AND actif = 1
        `;

        let parametres = [];

        if (idUtilisateur) {
            requete += ` AND (id_utilisateur_destinataire IS NULL OR id_utilisateur_destinataire = ?)`;
            parametres.push(idUtilisateur);
        } else {
            requete += ` AND id_utilisateur_destinataire IS NULL`;
        }

        try {
            const resultat = await executerRequete(requete, parametres);
            
            console.log(`✅ ${resultat.affectedRows} notifications marquées comme lues`);
            
            return {
                succes: true,
                nombreMarquees: resultat.affectedRows,
                message: `${resultat.affectedRows} notifications marquées comme lues`
            };
        } catch (erreur) {
            console.error('❌ Erreur marquage toutes notifications:', erreur);
            throw new Error(`Erreur lors du marquage des notifications: ${erreur.message}`);
        }
    }

    /**
     * Supprime les anciennes notifications (cleanup)
     * @param {number} joursAnciennete - Supprimer les notifications de plus de X jours (défaut: 30)
     * @returns {Promise<number>} Nombre de notifications supprimées
     */
    static async nettoyerAnciennesNotifications(joursAnciennete = 30) {
        const requete = `
            DELETE FROM notifications 
            WHERE date_creation < DATE_SUB(NOW(), INTERVAL ? DAY)
        `;

        try {
            const resultat = await executerRequete(requete, [joursAnciennete]);
            
            console.log(`🧹 ${resultat.affectedRows} anciennes notifications supprimées`);
            
            return resultat.affectedRows;
        } catch (erreur) {
            console.error('❌ Erreur nettoyage notifications:', erreur);
            throw new Error(`Erreur lors du nettoyage des notifications: ${erreur.message}`);
        }
    }

    /**
     * Récupère l'historique des notifications (avec pagination)
     * @param {number} page - Page (défaut: 1)
     * @param {number} limite - Limite par page (défaut: 20)
     * @returns {Promise<Object>} Historique paginé
     */
    static async obtenirHistorique(page = 1, limite = 20) {
        const offset = (page - 1) * limite;

        // Compter le total
        const [total] = await executerRequete(`
            SELECT COUNT(*) as total FROM notifications WHERE actif = 1
        `);

        // Récupérer les notifications
        const requete = `
            SELECT 
                n.*,
                e.nom_visiteur,
                e.prenom_visiteur,
                e.niveau_satisfaction,
                s.nom_service
            FROM notifications n
            LEFT JOIN enquetes e ON n.id_enquete = e.id_enquete
            LEFT JOIN services s ON e.id_service = s.id_service
            WHERE n.actif = 1
            ORDER BY n.date_creation DESC
            LIMIT ? OFFSET ?
        `;

        try {
            const notifications = await executerRequete(requete, [limite, offset]);
            
            // Parser les données JSON
            notifications.forEach(notification => {
                if (notification.donnees_supplementaires) {
                    try {
                        notification.donnees_supplementaires = JSON.parse(notification.donnees_supplementaires);
                    } catch (e) {
                        notification.donnees_supplementaires = {};
                    }
                }
            });

            return {
                notifications: notifications,
                pagination: {
                    page: page,
                    limite: limite,
                    total: total.total,
                    totalPages: Math.ceil(total.total / limite)
                }
            };
        } catch (erreur) {
            console.error('❌ Erreur historique notifications:', erreur);
            throw new Error(`Erreur lors de la récupération de l'historique: ${erreur.message}`);
        }
    }
}

module.exports = Notification;