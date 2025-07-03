// ========================================
// MODÈLE UTILISATEUR
// Fichier: backend/modeles/Utilisateur.js
// ========================================

const { executerRequete, executerTransaction } = require('../config/database');
const { 
    hasherMotDePasse, 
    verifierMotDePasse, 
    genererIdSession, 
    calculerExpirationSession,
    sessionExpiree,
    ROLES,
    aPermission 
} = require('../config/auth');

class Utilisateur {

    /**
     * Authentifie un utilisateur
     * @param {string} nomUtilisateur - Nom d'utilisateur
     * @param {string} motDePasse - Mot de passe en clair
     * @returns {Promise<Object>} Résultat de l'authentification
     */
    static async authentifier(nomUtilisateur, motDePasse) {
        const requete = `
            SELECT 
                id_utilisateur,
                nom_utilisateur,
                mot_de_passe,
                nom,
                prenom,
                email,
                role,
                actif
            FROM utilisateurs 
            WHERE nom_utilisateur = ? AND actif = true
        `;

        try {
            const resultats = await executerRequete(requete, [nomUtilisateur]);
            
            if (resultats.length === 0) {
                return {
                    succes: false,
                    message: 'Utilisateur non trouvé ou inactif'
                };
            }

            const utilisateur = resultats[0];

            // Vérifier le mot de passe
            const motDePasseValide = await verifierMotDePasse(motDePasse, utilisateur.mot_de_passe);
            
            if (!motDePasseValide) {
                return {
                    succes: false,
                    message: 'Mot de passe incorrect'
                };
            }

            // Mettre à jour la dernière connexion
            await this.mettreAJourDerniereConnexion(utilisateur.id_utilisateur);

            // Retourner les données utilisateur (sans le mot de passe)
            delete utilisateur.mot_de_passe;

            return {
                succes: true,
                utilisateur: utilisateur,
                message: 'Authentification réussie'
            };

        } catch (erreur) {
            throw new Error(`Erreur lors de l'authentification: ${erreur.message}`);
        }
    }

    /**
     * Crée une session utilisateur
     * @param {number} idUtilisateur - ID de l'utilisateur
     * @param {Object} donneesSession - Données de session
     * @returns {Promise<string>} ID de session créé
     */
    static async creerSession(idUtilisateur, donneesSession = {}) {
        const idSession = genererIdSession();
        const dateExpiration = calculerExpirationSession();

        const requete = `
            INSERT INTO sessions_utilisateurs (
                id_session,
                id_utilisateur,
                donnees_session,
                date_expiration
            ) VALUES (?, ?, ?, ?)
        `;

        const parametres = [
            idSession,
            idUtilisateur,
            JSON.stringify(donneesSession),
            dateExpiration
        ];

        try {
            await executerRequete(requete, parametres);
            return idSession;
        } catch (erreur) {
            throw new Error(`Erreur lors de la création de session: ${erreur.message}`);
        }
    }

    /**
     * Vérifie et récupère une session
     * @param {string} idSession - ID de session
     * @returns {Promise<Object>} Données de session ou null
     */
    static async verifierSession(idSession) {
        const requete = `
            SELECT 
                s.*,
                u.id_utilisateur,
                u.nom_utilisateur,
                u.nom,
                u.prenom,
                u.email,
                u.role,
                u.actif
            FROM sessions_utilisateurs s
            JOIN utilisateurs u ON s.id_utilisateur = u.id_utilisateur
            WHERE s.id_session = ? AND s.actif = true
        `;

        try {
            const resultats = await executerRequete(requete, [idSession]);
            
            if (resultats.length === 0) {
                return null;
            }

            const session = resultats[0];

            // Vérifier si la session est expirée
            if (sessionExpiree(session.date_expiration)) {
                await this.supprimerSession(idSession);
                return null;
            }

            // Vérifier si l'utilisateur est toujours actif
            if (!session.actif) {
                await this.supprimerSession(idSession);
                return null;
            }

            return {
                idSession: session.id_session,
                utilisateur: {
                    id_utilisateur: session.id_utilisateur,
                    nom_utilisateur: session.nom_utilisateur,
                    nom: session.nom,
                    prenom: session.prenom,
                    email: session.email,
                    role: session.role
                },
                donneesSession: JSON.parse(session.donnees_session || '{}'),
                dateExpiration: session.date_expiration
            };

        } catch (erreur) {
            throw new Error(`Erreur lors de la vérification de session: ${erreur.message}`);
        }
    }

    /**
     * Supprime une session (déconnexion)
     * @param {string} idSession - ID de session à supprimer
     * @returns {Promise<boolean>} Succès de la suppression
     */
    static async supprimerSession(idSession) {
        const requete = `DELETE FROM sessions_utilisateurs WHERE id_session = ?`;

        try {
            const resultat = await executerRequete(requete, [idSession]);
            return resultat.affectedRows > 0;
        } catch (erreur) {
            throw new Error(`Erreur lors de la suppression de session: ${erreur.message}`);
        }
    }

    /**
     * Récupère tous les utilisateurs
     * @returns {Promise<Array>} Liste des utilisateurs
     */
    static async obtenirTousUtilisateurs() {
        const requete = `
            SELECT 
                id_utilisateur,
                nom_utilisateur,
                nom,
                prenom,
                email,
                role,
                actif,
                derniere_connexion,
                date_creation
            FROM utilisateurs
            ORDER BY nom, prenom
        `;

        try {
            return await executerRequete(requete);
        } catch (erreur) {
            throw new Error(`Erreur lors de la récupération des utilisateurs: ${erreur.message}`);
        }
    }

    /**
     * Récupère un utilisateur par son ID
     * @param {number} idUtilisateur - ID de l'utilisateur
     * @returns {Promise<Object>} Données de l'utilisateur
     */
    static async obtenirUtilisateurParId(idUtilisateur) {
        const requete = `
            SELECT 
                id_utilisateur,
                nom_utilisateur,
                nom,
                prenom,
                email,
                role,
                actif,
                derniere_connexion,
                date_creation
            FROM utilisateurs
            WHERE id_utilisateur = ?
        `;

        try {
            const resultats = await executerRequete(requete, [idUtilisateur]);
            return resultats[0] || null;
        } catch (erreur) {
            throw new Error(`Erreur lors de la récupération de l'utilisateur: ${erreur.message}`);
        }
    }

    /**
     * Crée un nouvel utilisateur
     * @param {Object} donneesUtilisateur - Données du nouvel utilisateur
     * @returns {Promise<Object>} Résultat de la création
     */
    static async creerUtilisateur(donneesUtilisateur) {
        const motDePasseHash = await hasherMotDePasse(donneesUtilisateur.motDePasse);

        const requete = `
            INSERT INTO utilisateurs (
                nom_utilisateur,
                mot_de_passe,
                nom,
                prenom,
                email,
                role
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const parametres = [
            donneesUtilisateur.nomUtilisateur,
            motDePasseHash,
            donneesUtilisateur.nom,
            donneesUtilisateur.prenom || null,
            donneesUtilisateur.email || null,
            donneesUtilisateur.role
        ];

        try {
            const resultat = await executerRequete(requete, parametres);
            return {
                succes: true,
                idUtilisateur: resultat.insertId,
                message: 'Utilisateur créé avec succès'
            };
        } catch (erreur) {
            if (erreur.code === 'ER_DUP_ENTRY') {
                throw new Error('Nom d\'utilisateur ou email déjà existant');
            }
            throw new Error(`Erreur lors de la création de l'utilisateur: ${erreur.message}`);
        }
    }

    /**
     * Met à jour un utilisateur
     * @param {number} idUtilisateur - ID de l'utilisateur
     * @param {Object} donneesUtilisateur - Nouvelles données
     * @returns {Promise<Object>} Résultat de la mise à jour
     */
    static async mettreAJourUtilisateur(idUtilisateur, donneesUtilisateur) {
        let requete = `UPDATE utilisateurs SET `;
        let parametres = [];
        let champs = [];

        // Construire la requête dynamiquement
        if (donneesUtilisateur.nom) {
            champs.push('nom = ?');
            parametres.push(donneesUtilisateur.nom);
        }

        if (donneesUtilisateur.prenom !== undefined) {
            champs.push('prenom = ?');
            parametres.push(donneesUtilisateur.prenom);
        }

        if (donneesUtilisateur.email !== undefined) {
            champs.push('email = ?');
            parametres.push(donneesUtilisateur.email);
        }

        if (donneesUtilisateur.role) {
            champs.push('role = ?');
            parametres.push(donneesUtilisateur.role);
        }

        if (donneesUtilisateur.actif !== undefined) {
            champs.push('actif = ?');
            parametres.push(donneesUtilisateur.actif);
        }

        if (champs.length === 0) {
            throw new Error('Aucune donnée à mettre à jour');
        }

        requete += champs.join(', ') + ' WHERE id_utilisateur = ?';
        parametres.push(idUtilisateur);

        try {
            const resultat = await executerRequete(requete, parametres);
            
            if (resultat.affectedRows === 0) {
                return {
                    succes: false,
                    message: 'Utilisateur non trouvé'
                };
            }

            return {
                succes: true,
                message: 'Utilisateur mis à jour avec succès'
            };
        } catch (erreur) {
            throw new Error(`Erreur lors de la mise à jour de l'utilisateur: ${erreur.message}`);
        }
    }

    /**
     * Change le mot de passe d'un utilisateur
     * @param {number} idUtilisateur - ID de l'utilisateur
     * @param {string} ancienMotDePasse - Ancien mot de passe
     * @param {string} nouveauMotDePasse - Nouveau mot de passe
     * @returns {Promise<Object>} Résultat du changement
     */
    static async changerMotDePasse(idUtilisateur, ancienMotDePasse, nouveauMotDePasse) {
        // Vérifier l'ancien mot de passe
        const requeteVerif = `SELECT mot_de_passe FROM utilisateurs WHERE id_utilisateur = ?`;
        
        try {
            const resultats = await executerRequete(requeteVerif, [idUtilisateur]);
            
            if (resultats.length === 0) {
                return {
                    succes: false,
                    message: 'Utilisateur non trouvé'
                };
            }

            const motDePasseValide = await verifierMotDePasse(ancienMotDePasse, resultats[0].mot_de_passe);
            
            if (!motDePasseValide) {
                return {
                    succes: false,
                    message: 'Ancien mot de passe incorrect'
                };
            }

            // Hasher le nouveau mot de passe
            const nouveauMotDePasseHash = await hasherMotDePasse(nouveauMotDePasse);

            // Mettre à jour le mot de passe
            const requeteMaj = `UPDATE utilisateurs SET mot_de_passe = ? WHERE id_utilisateur = ?`;
            await executerRequete(requeteMaj, [nouveauMotDePasseHash, idUtilisateur]);

            return {
                succes: true,
                message: 'Mot de passe changé avec succès'
            };

        } catch (erreur) {
            throw new Error(`Erreur lors du changement de mot de passe: ${erreur.message}`);
        }
    }

    /**
     * Met à jour la dernière connexion d'un utilisateur
     * @param {number} idUtilisateur - ID de l'utilisateur
     * @returns {Promise<void>}
     */
    static async mettreAJourDerniereConnexion(idUtilisateur) {
        const requete = `UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id_utilisateur = ?`;
        
        try {
            await executerRequete(requete, [idUtilisateur]);
        } catch (erreur) {
            // Ne pas faire échouer l'authentification si cette mise à jour échoue
            console.error('Erreur mise à jour dernière connexion:', erreur.message);
        }
    }

    /**
     * Vérifie les permissions d'un utilisateur
     * @param {string} role - Rôle de l'utilisateur
     * @param {string} permission - Permission à vérifier
     * @returns {boolean} True si l'utilisateur a la permission
     */
    static verifierPermission(role, permission) {
        return aPermission(role, permission);
    }

    /**
     * Nettoie les sessions expirées
     * @returns {Promise<number>} Nombre de sessions supprimées
     */
    static async nettoyerSessionsExpirees() {
        const requete = `DELETE FROM sessions_utilisateurs WHERE date_expiration < NOW()`;
        
        try {
            const resultat = await executerRequete(requete);
            return resultat.affectedRows;
        } catch (erreur) {
            throw new Error(`Erreur lors du nettoyage des sessions: ${erreur.message}`);
        }
    }

    /**
     * Enregistre une action dans les logs
     * @param {number} idUtilisateur - ID de l'utilisateur
     * @param {string} action - Action effectuée
     * @param {string} description - Description de l'action
     * @param {string} adresseIP - Adresse IP
     * @param {string} userAgent - User Agent
     * @returns {Promise<void>}
     */
    static async enregistrerLog(idUtilisateur, action, description = null, adresseIP = null, userAgent = null) {
        const requete = `
            INSERT INTO logs_activite (
                id_utilisateur,
                action,
                description,
                adresse_ip,
                user_agent
            ) VALUES (?, ?, ?, ?, ?)
        `;

        try {
            await executerRequete(requete, [idUtilisateur, action, description, adresseIP, userAgent]);
        } catch (erreur) {
            console.error('Erreur enregistrement log:', erreur.message);
        }
    }
}

module.exports = Utilisateur;