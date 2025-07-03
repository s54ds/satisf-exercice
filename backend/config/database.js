// ========================================
// CONFIGURATION BASE DE DONNÉES MYSQL
// Fichier: backend/config/database.js
// ========================================

const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration de connexion à la base de données
const configDB = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'enquete_satisfaction',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',

    // Options de connexion
    connectionLimit: 10,
    queueLimit: 0,
    idleTimeout: 60000,
    enableKeepAlive: true,

    // Options de sécurité
    ssl: false,
    multipleStatements: false
};

// Pool de connexions pour optimiser les performances
let pool;

/**
 * Initialise le pool de connexions MySQL
 * @returns {Promise} 
 */
const initialiserDB = async () => {
    try {
        pool = mysql.createPool(configDB);

        // Test de connexion
        const connexion = await pool.getConnection();
        console.log('✅ Connexion à MySQL réussie !');
        console.log(`📊 Base de données: ${configDB.database}`);

        connexion.release(); 
        return pool;

    } catch (erreur) {
        console.error('❌ Erreur connexion MySQL:', erreur.message);
        throw erreur;
    }
};

/**
 * Obtient une connexion du pool
 * @returns {Promise} Connexion MySQL
 */
const obtenirConnexion = async () => {
    if (!pool) {
        throw new Error('Pool de connexions non initialisé');
    }
    return await pool.getConnection();
};

/**
 *  Exécute une requête SQL normale
 * @param {string} requete 
 * @param {Array} parametres
 * @returns {Promise}
 */
const executerRequete = async (requete, parametres = []) => {
    const connexion = await obtenirConnexion();

    try {
        
        const nombrePlaceholders = (requete.match(/\?/g) || []).length;

        if (nombrePlaceholders !== parametres.length) {
            console.error('❌ ERREUR : Nombre de paramètres incorrect !');
            console.error('🔢 Attendu :', nombrePlaceholders, '| Reçus :', parametres.length);
            console.error('📄 Requête SQL :', requete.trim());
            console.error('📦 Paramètres :', parametres);
            throw new Error(`Nombre de paramètres incorrect : attendu ${nombrePlaceholders}, reçu ${parametres.length}`);
        }

        // Log pour le debugging
        if (process.env.NODE_ENV === 'development') {
            console.log('🔍 Exécution requête:', requete.replace(/\s+/g, ' ').trim());
            if (parametres.length > 0) {
                console.log('📦 Paramètres:', parametres);
            }
        }

        const [resultats] = await connexion.execute(requete, parametres);
        return resultats;

    } catch (erreur) {
        console.error('❌ ERREUR lors de l\'exécution de la requête:');
        console.error('📄 Requête:', requete.trim());
        console.error('📦 Paramètres:', parametres);
        console.error('🔥 Erreur MySQL:', erreur.message);
        console.error('🔥 Code erreur:', erreur.code);
        
        throw new Error(`Erreur MySQL (${erreur.code}): ${erreur.message}`);
    } finally {
        connexion.release(); // Toujours libérer la connexion
    }
};

/**
 * @param {string} requete 
 * @param {Array} parametres
 * @param {number} page
 * @param {number} limite 
 * @returns {Promise}
 */
const executerRequetePaginee = async (requete, parametres = [], page = 1, limite = 10) => {
    try {
        // Validation et conversion stricte des paramètres de pagination
        const pageNumber = Math.max(1, parseInt(page) || 1);
        const limiteNumber = Math.max(1, Math.min(100, parseInt(limite) || 10)); // Max 100
        const offset = (pageNumber - 1) * limiteNumber;

        // Vérification supplémentaire
        if (isNaN(pageNumber) || isNaN(limiteNumber) || isNaN(offset)) {
            throw new Error(`Paramètres de pagination invalides: page=${page}, limite=${limite}`);
        }

        console.log(`📄 Pagination: page=${pageNumber}, limite=${limiteNumber}, offset=${offset}`);

        const requetePaginee = `${requete} LIMIT ${limiteNumber} OFFSET ${offset}`;

        console.log('📝 Requête finale avec pagination:', requetePaginee.replace(/\s+/g, ' ').trim());

        return await executerRequete(requetePaginee, parametres);

    } catch (erreur) {
        console.error('❌ Erreur dans executerRequetePaginee:', erreur);
        throw erreur;
    }
};

/**
 * @param {string} requete 
 * @returns {Promise} 
 */
const executerRequeteSimple = async (requete) => {
    const connexion = await obtenirConnexion();

    try {
        console.log('🔍 Exécution requête simple:', requete.replace(/\s+/g, ' ').trim());
        
        const [resultats] = await connexion.query(requete);
        return resultats;

    } catch (erreur) {
        console.error('❌ ERREUR requête simple:', erreur.message);
        throw new Error(`Erreur MySQL: ${erreur.message}`);
    } finally {
        connexion.release();
    }
};

/**
 * @param {Function} callback - Fonction contenant les requêtes
 * @returns {Promise} Résultat de la transaction
 */
const executerTransaction = async (callback) => {
    const connexion = await obtenirConnexion();
    try {
        await connexion.beginTransaction();

        const resultat = await callback(connexion);

        await connexion.commit();
        return resultat;

    } catch (erreur) {
        await connexion.rollback();
        throw erreur;
    } finally {
        connexion.release();
    }
};

/**
 * Ferme le pool de connexions
 */
const fermerDB = async () => {
    if (pool) {
        console.log('🔒 Fermeture du pool de connexions...');
        await pool.end();
        console.log('✅ Pool de connexions fermé');
    }
};

/**
 * Obtient les statistiques du pool de connexions
 * @returns {Object} Statistiques du pool
 */
const obtenirStatistiquesPool = () => {
    if (!pool) {
        return { status: 'non_initialise' };
    }
    
    return {
        status: 'actif',
        connectionsActives: pool._allConnections ? pool._allConnections.length : 0,
        connectionsLibres: pool._freeConnections ? pool._freeConnections.length : 0,
        connectionsEnAttente: pool._connectionQueue ? pool._connectionQueue.length : 0,
        limite: configDB.connectionLimit
    };
};

/**
 * Teste la connexion et les paramètres
 * @returns {Promise} Résultat du test
 */
const testerConnexion = async () => {
    try {
        console.log('🧪 Test de connexion MySQL...');
        
        // Test 1: Connexion de base
        const connexion = await obtenirConnexion();
        console.log('✅ Test 1: Connexion réussie');
        
        // Test 2: Requête simple
        const [resultats] = await connexion.execute('SELECT 1 as test');
        console.log('✅ Test 2: Requête simple réussie:', resultats[0]);
        
        // Test 3: Requête avec paramètres
        const [resultats2] = await connexion.execute('SELECT ? as valeur', ['test_param']);
        console.log('✅ Test 3: Requête avec paramètres réussie:', resultats2[0]);
        
        // Test 4: Test de pagination simple
        const resultatsPage = await executerRequeteSimple('SELECT "test_pagination" as valeur LIMIT 5 OFFSET 0');
        console.log('✅ Test 4: Pagination réussie:', resultatsPage.length);
        
        connexion.release();
        console.log('🎉 Tous les tests de connexion réussis !');
        
        return {
            status: 'success',
            message: 'Connexion MySQL opérationnelle',
            database: configDB.database,
            host: configDB.host,
            port: configDB.port
        };

    } catch (erreur) {
        console.error('❌ Erreur lors du test de connexion:', erreur.message);
        throw erreur;
    }
};

// Gestion propre de l'arrêt de l'application
process.on('SIGINT', async () => {
    console.log('\n🛑 Signal SIGINT reçu, fermeture en cours...');
    await fermerDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Signal SIGTERM reçu, fermeture en cours...');
    await fermerDB();
    process.exit(0);
});

module.exports = {
    initialiserDB,
    obtenirConnexion,
    executerRequete,
    executerRequetePaginee,
    executerRequeteSimple,
    executerTransaction,
    fermerDB,
    obtenirStatistiquesPool,
    testerConnexion,
    configDB,
    pool: () => pool
};