// ========================================
// CONFIGURATION AUTHENTIFICATION
// Fichier: backend/config/auth.js
// ========================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Configuration JWT
const configJWT = {
    secret: process.env.JWT_SECRET || 'enquete_satisfaction_secret_2024',
    expiresIn: process.env.JWT_EXPIRES || '24h',        // Durée de validité du token
    issuer: 'enquete-satisfaction-app',                  // Émetteur du token
    audience: 'enquete-satisfaction-users'               // Audience du token
};

// Configuration des sessions
const configSession = {
    dureeSession: 24 * 60 * 60 * 1000,  // 24 heures en millisecondes
    nettoyageAuto: 60 * 60 * 1000       // Nettoyage toutes les heures
};

// Configuration bcrypt pour le hashage des mots de passe
const SALT_ROUNDS = 12; // Niveau de sécurité élevé

/**
 * Hash un mot de passe avec bcrypt
 * @param {string} motDePasse - Mot de passe en clair
 * @returns {Promise<string>} Mot de passe hashé
 */
const hasherMotDePasse = async (motDePasse) => {
    try {
        return await bcrypt.hash(motDePasse, SALT_ROUNDS);
    } catch (erreur) {
        throw new Error('Erreur lors du hashage du mot de passe');
    }
};

/**
 * Vérifie un mot de passe contre son hash
 * @param {string} motDePasse - Mot de passe en clair
 * @param {string} hash - Hash à vérifier
 * @returns {Promise<boolean>} True si le mot de passe correspond
 */
const verifierMotDePasse = async (motDePasse, hash) => {
    try {
        return await bcrypt.compare(motDePasse, hash);
    } catch (erreur) {
        throw new Error('Erreur lors de la vérification du mot de passe');
    }
};

/**
 * Génère un token JWT pour un utilisateur
 * @param {Object} utilisateur - Données de l'utilisateur
 * @returns {string} Token JWT
 */
const genererToken = (utilisateur) => {
    const payload = {
        id: utilisateur.id_utilisateur,           
        nomUtilisateur: utilisateur.nom_utilisateur,
        role: utilisateur.role,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom
    };

    const token = jwt.sign(payload, configJWT.secret, {
        expiresIn: configJWT.expiresIn
    });
    
    console.log('🔑 Token généré pour:', utilisateur.nom_utilisateur);
    return token;
};

/**
 * Vérifie et décode un token JWT
 * @param {string} token
 * @returns {Object} 
 */
const verifierToken = (token) => {
    try {
        const decoded = jwt.verify(token, configJWT.secret);
        console.log('🔍 Token décodé avec succès:', decoded);
        return decoded;
    } catch (erreur) {
        console.log('❌ Erreur vérification token:', erreur.message);
        if (erreur.name === 'TokenExpiredError') {
            throw new Error('Token expiré');
        } else if (erreur.name === 'JsonWebTokenError') {
            throw new Error('Token invalide');
        } else {
            throw new Error('Erreur de vérification du token');
        }
    }
};

/**
 * Génère un ID de session unique
 * @returns {string} 
 */
const genererIdSession = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `session_${timestamp}_${random}`;
};

/**
 * Calcule la date d'expiration d'une session
 * @returns {Date} 
 */
const calculerExpirationSession = () => {
    return new Date(Date.now() + configSession.dureeSession);
};

/**
 * Vérifie si une session est expirée
 * @param {Date} dateExpiration - Date d'expiration de la session
 * @returns {boolean} True si la session est expirée
 */
const sessionExpiree = (dateExpiration) => {
    return new Date() > new Date(dateExpiration);
};

/**
 * Valide la force d'un mot de passe
 * @param {string} motDePasse - Mot de passe à valider
 * @returns {Object} Résultat de la validation
 */
const validerMotDePasse = (motDePasse) => {
    const regles = {
        longueurMin: motDePasse.length >= 8,           // Au moins 8 caractères
        contientMajuscule: /[A-Z]/.test(motDePasse),   // Au moins une majuscule
        contientMinuscule: /[a-z]/.test(motDePasse),   // Au moins une minuscule
        contientChiffre: /\d/.test(motDePasse),        // Au moins un chiffre
        contientSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(motDePasse) // Caractère spécial
    };

    const score = Object.values(regles).filter(Boolean).length;
    
    return {
        valide: score >= 4, // Au moins 4 règles respectées
        score: score,
        regles: regles,
        message: score >= 4 ? 
            'Mot de passe fort' : 
            'Mot de passe trop faible (minimum 4 critères sur 5)'
    };
};

/**
 * Rôles et permissions du système
 */
const ROLES = {
    SUPER_ADMIN: 'SuperAdmin',
    ADMINISTRATEUR: 'Administrateur',
    RESPONSABLE_QUALITE: 'Responsable Qualité',
    DIRECTRICE_GENERALE: 'Directrice Générale'
};

/**
 * Permissions par rôle - CORRIGÉ
 */
const PERMISSIONS = {
    'SuperAdmin': [
        'voir_enquetes',
        'exporter_donnees', 
        'voir_statistiques',
        'gerer_utilisateurs',
        'gerer_services',
        'voir_logs'
    ],
    [ROLES.ADMINISTRATEUR]: [
        'voir_enquetes',
        'exporter_donnees',
        'voir_statistiques',
        'gerer_utilisateurs',
        'gerer_services',
        'voir_logs'
    ],
    [ROLES.RESPONSABLE_QUALITE]: [
        'voir_enquetes',
        'exporter_donnees',
        'voir_statistiques'
    ],
    [ROLES.DIRECTRICE_GENERALE]: [
        'voir_enquetes',
        'exporter_donnees',
        'voir_statistiques',
        'voir_logs'
    ]
};

/**
 * Vérifie si un utilisateur a une permission
 * @param {string} role - Rôle de l'utilisateur
 * @param {string} permission - Permission à vérifier
 * @returns {boolean} True si l'utilisateur a la permission
 */
const aPermission = (role, permission) => {
    // SuperAdmin a toutes les permissions
    if (role === 'SuperAdmin') {
        return true;
    }
    
    return PERMISSIONS[role] && PERMISSIONS[role].includes(permission);
};

module.exports = {
    configJWT,
    configSession,
    hasherMotDePasse,
    verifierMotDePasse,
    genererToken,
    verifierToken,
    genererIdSession,
    calculerExpirationSession,
    sessionExpiree,
    validerMotDePasse,
    ROLES,
    PERMISSIONS,
    aPermission
};