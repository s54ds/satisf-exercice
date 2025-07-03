// ========================================
// UTILITAIRES DATE
// Fichier: backend/utilitaires/dateUtils.js
// ========================================

/**
 * Formate une date au format français (DD/MM/YYYY)
 * @param {Date|string} date - Date à formater
 * @returns {string} Date formatée
 */
const formaterDateFrancaise = (date) => {
    if (!date) return '';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    const jour = dateObj.getDate().toString().padStart(2, '0');
    const mois = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const annee = dateObj.getFullYear();
    
    return `${jour}/${mois}/${annee}`;
};

/**
 * Formate une date avec heure au format français (DD/MM/YYYY HH:mm)
 * @param {Date|string} date - Date à formater
 * @returns {string} Date et heure formatées
 */
const formaterDateHeureFrancaise = (date) => {
    if (!date) return '';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    const jour = dateObj.getDate().toString().padStart(2, '0');
    const mois = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const annee = dateObj.getFullYear();
    const heures = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    
    return `${jour}/${mois}/${annee} ${heures}:${minutes}`;
};

/**
 * Formate une date pour l'affichage (format relatif)
 * @param {Date|string} date - Date à formater
 * @returns {string} Date formatée de manière relative
 */
const formaterDateRelative = (date) => {
    if (!date) return '';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    const maintenant = new Date();
    const diffMs = maintenant.getTime() - dateObj.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHeures = Math.floor(diffMs / (1000 * 60 * 60));
    const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
        return 'À l\'instant';
    } else if (diffMinutes < 60) {
        return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffHeures < 24) {
        return `Il y a ${diffHeures} heure${diffHeures > 1 ? 's' : ''}`;
    } else if (diffJours < 7) {
        return `Il y a ${diffJours} jour${diffJours > 1 ? 's' : ''}`;
    } else {
        return formaterDateFrancaise(dateObj);
    }
};

/**
 * Obtient le début de la journée pour une date
 * @param {Date|string} date - Date de référence
 * @returns {Date} Début de journée (00:00:00)
 */
const obtenirDebutJournee = (date = new Date()) => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    return dateObj;
};

/**
 * Obtient la fin de la journée pour une date
 * @param {Date|string} date - Date de référence
 * @returns {Date} Fin de journée (23:59:59)
 */
const obtenirFinJournee = (date = new Date()) => {
    const dateObj = new Date(date);
    dateObj.setHours(23, 59, 59, 999);
    return dateObj;
};

/**
 * Obtient le début de la semaine (lundi)
 * @param {Date|string} date - Date de référence
 * @returns {Date} Début de semaine
 */
const obtenirDebutSemaine = (date = new Date()) => {
    const dateObj = new Date(date);
    const jour = dateObj.getDay();
    const diff = dateObj.getDate() - jour + (jour === 0 ? -6 : 1); // Lundi = début
    const debutSemaine = new Date(dateObj.setDate(diff));
    return obtenirDebutJournee(debutSemaine);
};

/**
 * Obtient la fin de la semaine (dimanche)
 * @param {Date|string} date - Date de référence
 * @returns {Date} Fin de semaine
 */
const obtenirFinSemaine = (date = new Date()) => {
    const debutSemaine = obtenirDebutSemaine(date);
    const finSemaine = new Date(debutSemaine);
    finSemaine.setDate(debutSemaine.getDate() + 6);
    return obtenirFinJournee(finSemaine);
};

/**
 * Obtient le début du mois
 * @param {Date|string} date - Date de référence
 * @returns {Date} Début du mois
 */
const obtenirDebutMois = (date = new Date()) => {
    const dateObj = new Date(date);
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
};

/**
 * Obtient la fin du mois
 * @param {Date|string} date - Date de référence
 * @returns {Date} Fin du mois
 */
const obtenirFinMois = (date = new Date()) => {
    const dateObj = new Date(date);
    return new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59, 999);
};

/**
 * Obtient le nom du mois en français
 * @param {number} numeroMois - Numéro du mois (1-12)
 * @returns {string} Nom du mois
 */
const obtenirNomMois = (numeroMois) => {
    const mois = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return mois[numeroMois - 1] || '';
};

/**
 * Obtient le nom du jour en français
 * @param {Date|string} date - Date
 * @returns {string} Nom du jour
 */
const obtenirNomJour = (date) => {
    const dateObj = new Date(date);
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return jours[dateObj.getDay()];
};

/**
 * Calcule l'âge en années
 * @param {Date|string} dateNaissance - Date de naissance
 * @returns {number} Âge en années
 */
const calculerAge = (dateNaissance) => {
    const naissance = new Date(dateNaissance);
    const maintenant = new Date();
    
    let age = maintenant.getFullYear() - naissance.getFullYear();
    const moisDiff = maintenant.getMonth() - naissance.getMonth();
    
    if (moisDiff < 0 || (moisDiff === 0 && maintenant.getDate() < naissance.getDate())) {
        age--;
    }
    
    return age;
};

/**
 * Calcule la différence entre deux dates
 * @param {Date|string} date1 - Première date
 * @param {Date|string} date2 - Deuxième date
 * @returns {Object} Différence détaillée
 */
const calculerDifference = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    
    const jours = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const heures = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
        jours,
        heures,
        minutes,
        totalJours: jours,
        totalHeures: Math.floor(diffMs / (1000 * 60 * 60)),
        totalMinutes: Math.floor(diffMs / (1000 * 60))
    };
};

/**
 * Valide si une date est valide
 * @param {any} date - Date à valider
 * @returns {boolean} True si valide
 */
const estDateValide = (date) => {
    if (!date) return false;
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
};

/**
 * Convertit une date au format MySQL (YYYY-MM-DD HH:mm:ss)
 * @param {Date|string} date - Date à convertir
 * @returns {string} Date au format MySQL
 */
const formaterPourMySQL = (date = new Date()) => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    
    return dateObj.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Convertit une date au format ISO (pour les inputs HTML)
 * @param {Date|string} date - Date à convertir
 * @returns {string} Date au format ISO
 */
const formaterPourInput = (date = new Date()) => {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
};

/**
 * Obtient la liste des 12 derniers mois
 * @returns {Array} Liste des mois avec année
 */
const obtenirDerniersNMois = (nombreMois = 12) => {
    const mois = [];
    const maintenant = new Date();
    
    for (let i = nombreMois - 1; i >= 0; i--) {
        const date = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
        mois.push({
            annee: date.getFullYear(),
            mois: date.getMonth() + 1,
            nomMois: obtenirNomMois(date.getMonth() + 1),
            label: `${obtenirNomMois(date.getMonth() + 1)} ${date.getFullYear()}`
        });
    }
    
    return mois;
};

/**
 * Obtient les plages de dates prédéfinies
 * @returns {Object} Plages de dates communes
 */
const obtenirPlagesDatesPredefinies = () => {
    const maintenant = new Date();
    
    return {
        aujourdhui: {
            debut: obtenirDebutJournee(maintenant),
            fin: obtenirFinJournee(maintenant),
            label: 'Aujourd\'hui'
        },
        hier: {
            debut: obtenirDebutJournee(new Date(maintenant.getTime() - 24 * 60 * 60 * 1000)),
            fin: obtenirFinJournee(new Date(maintenant.getTime() - 24 * 60 * 60 * 1000)),
            label: 'Hier'
        },
        cetteSemaine: {
            debut: obtenirDebutSemaine(maintenant),
            fin: obtenirFinSemaine(maintenant),
            label: 'Cette semaine'
        },
        semaineDerniere: {
            debut: obtenirDebutSemaine(new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000)),
            fin: obtenirFinSemaine(new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000)),
            label: 'Semaine dernière'
        },
        ceMois: {
            debut: obtenirDebutMois(maintenant),
            fin: obtenirFinMois(maintenant),
            label: 'Ce mois'
        },
        moisDernier: {
            debut: obtenirDebutMois(new Date(maintenant.getFullYear(), maintenant.getMonth() - 1)),
            fin: obtenirFinMois(new Date(maintenant.getFullYear(), maintenant.getMonth() - 1)),
            label: 'Mois dernier'
        },
        derniers30Jours: {
            debut: new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000),
            fin: maintenant,
            label: 'Derniers 30 jours'
        },
        derniers90Jours: {
            debut: new Date(maintenant.getTime() - 90 * 24 * 60 * 60 * 1000),
            fin: maintenant,
            label: 'Derniers 90 jours'
        }
    };
};

module.exports = {
    formaterDateFrancaise,
    formaterDateHeureFrancaise,
    formaterDateRelative,
    obtenirDebutJournee,
    obtenirFinJournee,
    obtenirDebutSemaine,
    obtenirFinSemaine,
    obtenirDebutMois,
    obtenirFinMois,
    obtenirNomMois,
    obtenirNomJour,
    calculerAge,
    calculerDifference,
    estDateValide,
    formaterPourMySQL,
    formaterPourInput,
    obtenirDerniersNMois,
    obtenirPlagesDatesPredefinies
};