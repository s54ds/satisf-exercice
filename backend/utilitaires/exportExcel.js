// ========================================
// UTILITAIRES EXPORT EXCEL/CSV
// Fichier: backend/utilitaires/exportExcel.js
// ========================================

const XLSX = require('xlsx');
const { formaterDateHeureFrancaise, formaterDateFrancaise } = require('./dateUtils');

/**
 * Convertit les données d'enquêtes pour l'export
 * @param {Array} enquetes - Données des enquêtes
 * @returns {Array} Données formatées pour export
 */
const formaterDonneesEnquetes = (enquetes) => {
    return enquetes.map((enquete, index) => ({
        'N°': index + 1,
        'Date/Heure Visite': formaterDateHeureFrancaise(enquete.date_heure_visite),
        'Nom': enquete.nom_visiteur,
        'Prénom': enquete.prenom_visiteur || '',
        'Téléphone': enquete.telephone,
        'Email': enquete.email || '',
        'Raison Présence': enquete.raison_presence,
        'Satisfaction': enquete.niveau_satisfaction,
        'Service': enquete.nom_service || 'Service non défini',
        'Commentaires': enquete.commentaires || '',
        'Recommandations': enquete.recommandations || '',
        'Date Soumission': formaterDateHeureFrancaise(enquete.date_soumission),
        'Adresse IP': enquete.adresse_ip || ''
    }));
};

/**
 * Convertit les statistiques de satisfaction pour l'export
 * @param {Array} stats - Statistiques de satisfaction
 * @returns {Array} Données formatées
 */
const formaterStatistiquesSatisfaction = (stats) => {
    return stats.map(stat => ({
        'Niveau de Satisfaction': stat.niveau_satisfaction,
        'Nombre de Réponses': stat.nombre_reponses,
        'Pourcentage': `${stat.pourcentage}%`
    }));
};

/**
 * Convertit les statistiques par service pour l'export
 * @param {Array} stats - Statistiques par service
 * @returns {Array} Données formatées
 */
const formaterStatistiquesServices = (stats) => {
    return stats.map(stat => ({
        'Service': stat.nom_service,
        'Nombre d\'Enquêtes': stat.nombre_enquetes,
        'Satisfaits': stat.satisfaits,
        'Mécontents': stat.mecontents,
        'Taux de Satisfaction': `${stat.taux_satisfaction}%`
    }));
};

/**
 * Convertit les statistiques par raison pour l'export
 * @param {Array} stats - Statistiques par raison
 * @returns {Array} Données formatées
 */
const formaterStatistiquesRaisons = (stats) => {
    return stats.map(stat => ({
        'Raison de Présence': stat.raison_presence,
        'Nombre de Visites': stat.nombre_visites,
        'Satisfaits': stat.satisfaits,
        'Mécontents': stat.mecontents,
        'Taux de Satisfaction': `${stat.taux_satisfaction}%`
    }));
};

/**
 * Convertit les statistiques mensuelles pour l'export
 * @param {Array} stats - Statistiques mensuelles
 * @returns {Array} Données formatées
 */
const formaterStatistiquesMensuelles = (stats) => {
    return stats.map(stat => ({
        'Année': stat.annee,
        'Mois': stat.mois,
        'Nom du Mois': stat.nom_mois,
        'Nombre d\'Enquêtes': stat.nombre_enquetes,
        'Satisfaits': stat.satisfaits,
        'Mécontents': stat.mecontents,
        'Taux de Satisfaction': `${stat.taux_satisfaction}%`
    }));
};

/**
 * Crée un fichier Excel avec plusieurs feuilles
 * @param {Object} donnees - Données à exporter
 * @param {string} nomFichier - Nom du fichier
 * @returns {Buffer} Buffer du fichier Excel
 */
const creerFichierExcel = (donnees, nomFichier = 'export') => {
    // Créer un nouveau classeur
    const classeur = XLSX.utils.book_new();

    // Ajouter les feuilles selon les données disponibles
    if (donnees.enquetes && donnees.enquetes.length > 0) {
        const donneesFormatees = formaterDonneesEnquetes(donnees.enquetes);
        const feuille = XLSX.utils.json_to_sheet(donneesFormatees);
        
        // Définir la largeur des colonnes
        const largeurColonnes = [
            { wch: 5 },   // N°
            { wch: 18 },  // Date/Heure Visite
            { wch: 15 },  // Nom
            { wch: 15 },  // Prénom
            { wch: 15 },  // Téléphone
            { wch: 25 },  // Email
            { wch: 20 },  // Raison Présence
            { wch: 12 },  // Satisfaction
            { wch: 15 },  // Service
            { wch: 30 },  // Commentaires
            { wch: 30 },  // Recommandations
            { wch: 18 },  // Date Soumission
            { wch: 15 }   // Adresse IP
        ];
        feuille['!cols'] = largeurColonnes;
        
        XLSX.utils.book_append_sheet(classeur, feuille, 'Enquêtes');
    }

    if (donnees.satisfaction && donnees.satisfaction.length > 0) {
        const statsFormatees = formaterStatistiquesSatisfaction(donnees.satisfaction);
        const feuille = XLSX.utils.json_to_sheet(statsFormatees);
        feuille['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(classeur, feuille, 'Stats Satisfaction');
    }

    if (donnees.services && donnees.services.length > 0) {
        const statsFormatees = formaterStatistiquesServices(donnees.services);
        const feuille = XLSX.utils.json_to_sheet(statsFormatees);
        feuille['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(classeur, feuille, 'Stats Services');
    }

    if (donnees.raisons && donnees.raisons.length > 0) {
        const statsFormatees = formaterStatistiquesRaisons(donnees.raisons);
        const feuille = XLSX.utils.json_to_sheet(statsFormatees);
        feuille['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(classeur, feuille, 'Stats Raisons');
    }

    if (donnees.mensuelles && donnees.mensuelles.length > 0) {
        const statsFormatees = formaterStatistiquesMensuelles(donnees.mensuelles);
        const feuille = XLSX.utils.json_to_sheet(statsFormatees);
        feuille['!cols'] = [{ wch: 8 }, { wch: 5 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(classeur, feuille, 'Stats Mensuelles');
    }

    // Ajouter une feuille récapitulative si on a des données récentes
    if (donnees.recentes) {
        const recapData = [
            { 'Indicateur': 'Total Enquêtes', 'Valeur': donnees.recentes.total_enquetes || 0 },
            { 'Indicateur': 'Total Satisfaits', 'Valeur': donnees.recentes.total_satisfaits || 0 },
            { 'Indicateur': 'Total Mécontents', 'Valeur': donnees.recentes.total_mecontents || 0 },
            { 'Indicateur': 'Taux Satisfaction Global', 'Valeur': `${donnees.recentes.taux_satisfaction || 0}%` },
            { 'Indicateur': 'Enquêtes Aujourd\'hui', 'Valeur': donnees.recentes.enquetes_aujourd_hui || 0 },
            { 'Indicateur': 'Enquêtes Cette Semaine', 'Valeur': donnees.recentes.enquetes_cette_semaine || 0 },
            { 'Indicateur': 'Enquêtes Ce Mois', 'Valeur': donnees.recentes.enquetes_ce_mois || 0 }
        ];
        
        const feuilleRecap = XLSX.utils.json_to_sheet(recapData);
        feuilleRecap['!cols'] = [{ wch: 25 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(classeur, feuilleRecap, 'Récapitulatif');
    }

    // Convertir en buffer
    return XLSX.write(classeur, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Crée un fichier CSV simple
 * @param {Array} donnees - Données à exporter
 * @param {string} separateur - Séparateur CSV (défaut: ;)
 * @returns {string} Contenu CSV
 */
const creerFichierCSV = (donnees, separateur = ';') => {
    if (!donnees || donnees.length === 0) {
        return '';
    }

    // Si c'est un objet avec plusieurs types de données, prendre les enquêtes
    let dataToExport = donnees;
    if (donnees.enquetes) {
        dataToExport = formaterDonneesEnquetes(donnees.enquetes);
    } else if (!Array.isArray(donnees)) {
        dataToExport = [];
    }

    if (dataToExport.length === 0) {
        return '';
    }

    // Obtenir les en-têtes
    const headers = Object.keys(dataToExport[0]);
    
    // Créer les lignes CSV
    const lignes = [
        headers.join(separateur), // En-têtes
        ...dataToExport.map(ligne => 
            headers.map(header => {
                let valeur = ligne[header] || '';
                // Échapper les guillemets et encapsuler si nécessaire
                if (typeof valeur === 'string' && (valeur.includes(separateur) || valeur.includes('"') || valeur.includes('\n'))) {
                    valeur = '"' + valeur.replace(/"/g, '""') + '"';
                }
                return valeur;
            }).join(separateur)
        )
    ];

    return lignes.join('\n');
};

/**
 * Génère un nom de fichier avec timestamp
 * @param {string} prefixe - Préfixe du nom
 * @param {string} extension - Extension (.xlsx, .csv)
 * @returns {string} Nom de fichier
 */
const genererNomFichier = (prefixe = 'export', extension = '.xlsx') => {
    const maintenant = new Date();
    const timestamp = formaterDateFrancaise(maintenant).replace(/\//g, '-') + 
                     '_' + 
                     maintenant.toTimeString().slice(0, 8).replace(/:/g, '-');
    
    return `${prefixe}_${timestamp}${extension}`;
};

/**
 * Crée un export complet selon le format demandé
 * @param {Object} donnees - Données à exporter
 * @param {string} format - Format (excel, csv)
 * @param {string} nomFichier - Nom du fichier (optionnel)
 * @returns {Object} Résultat de l'export
 */
const creerExport = (donnees, format = 'excel', nomFichier = null) => {
    const formatLower = format.toLowerCase();
    
    try {
        if (formatLower === 'excel' || formatLower === 'xlsx') {
            const buffer = creerFichierExcel(donnees, nomFichier);
            const nom = nomFichier || genererNomFichier('enquetes_satisfaction', '.xlsx');
            
            return {
                succes: true,
                buffer: buffer,
                nomFichier: nom,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                taille: buffer.length
            };
            
        } else if (formatLower === 'csv') {
            const contenuCSV = creerFichierCSV(donnees);
            const nom = nomFichier || genererNomFichier('enquetes_satisfaction', '.csv');
            
            return {
                succes: true,
                contenu: contenuCSV,
                nomFichier: nom,
                mimeType: 'text/csv; charset=utf-8',
                taille: Buffer.byteLength(contenuCSV, 'utf8')
            };
            
        } else {
            throw new Error(`Format '${format}' non supporté`);
        }
        
    } catch (erreur) {
        return {
            succes: false,
            erreur: erreur.message
        };
    }
};

/**
 * Prépare les en-têtes HTTP pour le téléchargement
 * @param {Object} exportResult - Résultat de l'export
 * @returns {Object} En-têtes HTTP
 */
const preparerEntetesTelechargement = (exportResult) => {
    return {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.nomFichier}"`,
        'Content-Length': exportResult.taille,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };
};

/**
 * Valide les données avant export
 * @param {any} donnees - Données à valider
 * @returns {Object} Résultat de validation
 */
const validerDonneesExport = (donnees) => {
    if (!donnees) {
        return {
            valide: false,
            erreur: 'Aucune donnée à exporter'
        };
    }

    // Vérifier s'il y a au moins un type de données
    const hasEnquetes = donnees.enquetes && Array.isArray(donnees.enquetes) && donnees.enquetes.length > 0;
    const hasStats = (donnees.satisfaction && donnees.satisfaction.length > 0) ||
                     (donnees.services && donnees.services.length > 0) ||
                     (donnees.raisons && donnees.raisons.length > 0) ||
                     (donnees.mensuelles && donnees.mensuelles.length > 0);

    if (!hasEnquetes && !hasStats) {
        return {
            valide: false,
            erreur: 'Aucune donnée valide à exporter'
        };
    }

    return {
        valide: true,
        nombreEnquetes: hasEnquetes ? donnees.enquetes.length : 0,
        hasStatistiques: hasStats
    };
};

/**
 * Crée un export avec métadonnées
 * @param {Object} donnees - Données à exporter
 * @param {string} format - Format d'export
 * @param {Object} options - Options d'export
 * @returns {Object} Export avec métadonnées
 */
const creerExportAvecMetadonnees = (donnees, format = 'excel', options = {}) => {
    const validation = validerDonneesExport(donnees);
    
    if (!validation.valide) {
        return {
            succes: false,
            erreur: validation.erreur
        };
    }

    // Ajouter des métadonnées
    const donneesAvecMeta = {
        ...donnees,
        metadonnees: {
            dateExport: new Date().toISOString(),
            formatExport: format,
            nombreEnquetes: validation.nombreEnquetes,
            hasStatistiques: validation.hasStatistiques,
            exportePar: options.utilisateur || 'Système',
            version: '1.0'
        }
    };

    // Si c'est Excel, ajouter une feuille métadonnées
    if (format.toLowerCase() === 'excel') {
        const metaData = [
            { 'Propriété': 'Date d\'Export', 'Valeur': formaterDateHeureFrancaise(new Date()) },
            { 'Propriété': 'Format', 'Valeur': format.toUpperCase() },
            { 'Propriété': 'Nombre d\'Enquêtes', 'Valeur': validation.nombreEnquetes },
            { 'Propriété': 'Contient Statistiques', 'Valeur': validation.hasStatistiques ? 'Oui' : 'Non' },
            { 'Propriété': 'Exporté par', 'Valeur': options.utilisateur || 'Système' },
            { 'Propriété': 'Application', 'Valeur': 'Enquête de Satisfaction v1.0' }
        ];

        donneesAvecMeta.metadonnees.tableau = metaData;
    }

    return creerExport(donneesAvecMeta, format, options.nomFichier);
};

/**
 * Crée un export rapide des enquêtes seulement
 * @param {Array} enquetes - Liste des enquêtes
 * @param {string} format - Format (excel, csv)
 * @returns {Object} Résultat de l'export
 */
const exporterEnquetesRapide = (enquetes, format = 'excel') => {
    if (!enquetes || !Array.isArray(enquetes) || enquetes.length === 0) {
        return {
            succes: false,
            erreur: 'Aucune enquête à exporter'
        };
    }

    const donnees = { enquetes: enquetes };
    return creerExport(donnees, format);
};

/**
 * Crée un export des statistiques uniquement
 * @param {Object} statistiques - Statistiques à exporter
 * @param {string} format - Format (excel, csv)
 * @returns {Object} Résultat de l'export
 */
const exporterStatistiques = (statistiques, format = 'excel') => {
    const validation = validerDonneesExport(statistiques);
    
    if (!validation.valide) {
        return {
            succes: false,
            erreur: validation.erreur
        };
    }

    return creerExport(statistiques, format, genererNomFichier('statistiques', format === 'csv' ? '.csv' : '.xlsx'));
};

/**
 * Middleware Express pour l'export de fichiers
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} donnees - Données à exporter
 * @param {string} format - Format d'export
 */
const envoyerFichierExport = (req, res, donnees, format = 'excel') => {
    const options = {
        utilisateur: req.utilisateur ? `${req.utilisateur.nom} ${req.utilisateur.prenom}` : 'Anonyme',
        nomFichier: req.query.nom || null
    };

    const exportResult = creerExportAvecMetadonnees(donnees, format, options);

    if (!exportResult.succes) {
        return res.status(400).json({
            succes: false,
            message: 'Erreur lors de la création de l\'export',
            erreur: exportResult.erreur
        });
    }

    // Définir les en-têtes
    const entetes = preparerEntetesTelechargement(exportResult);
    Object.keys(entetes).forEach(cle => {
        res.setHeader(cle, entetes[cle]);
    });

    // Envoyer le fichier
    if (exportResult.buffer) {
        // Excel
        res.send(exportResult.buffer);
    } else if (exportResult.contenu) {
        // CSV
        res.send(exportResult.contenu);
    } else {
        res.status(500).json({
            succes: false,
            message: 'Erreur lors de la génération du fichier'
        });
    }
};

module.exports = {
    formaterDonneesEnquetes,
    formaterStatistiquesSatisfaction,
    formaterStatistiquesServices,
    formaterStatistiquesRaisons,
    formaterStatistiquesMensuelles,
    creerFichierExcel,
    creerFichierCSV,
    genererNomFichier,
    creerExport,
    creerExportAvecMetadonnees,
    preparerEntetesTelechargement,
    validerDonneesExport,
    exporterEnquetesRapide,
    exporterStatistiques,
    envoyerFichierExport
};