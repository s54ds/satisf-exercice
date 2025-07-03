// ========================================
// FONCTIONS UTILITAIRES
// Fichier: frontend/scripts/utils.js
// ========================================

/**
 * Affiche une notification à l'utilisateur
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification ('success', 'error', 'warning', 'info')
 * @param {number} duration - Durée d'affichage en millisecondes (défaut: 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="notification-icon ${getIconForType(type)}"></i>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Styles de la notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 300px;
        max-width: 500px;
        padding: 0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Styles du contenu
    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 12px;
        background: ${getBackgroundForType(type)};
        color: ${getTextColorForType(type)};
        border-left: 4px solid ${getBorderColorForType(type)};
    `;
    
    // Styles de l'icône
    const icon = notification.querySelector('.notification-icon');
    icon.style.cssText = `
        font-size: 18px;
        flex-shrink: 0;
    `;
    
    // Styles du message
    const messageEl = notification.querySelector('.notification-message');
    messageEl.style.cssText = `
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
    `;
    
    // Styles du bouton de fermeture
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        opacity: 0.7;
        transition: opacity 0.2s;
    `;
    
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.7');
    
    // Ajouter les styles d'animation
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Supprimer automatiquement après la durée spécifiée
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, duration);
}

/**
 * Obtient l'icône appropriée pour le type de notification
 */
function getIconForType(type) {
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
}

/**
 * Obtient la couleur de fond pour le type de notification
 */
function getBackgroundForType(type) {
    const backgrounds = {
        'success': '#f0f9ff',
        'error': '#fef2f2',
        'warning': '#fffbeb',
        'info': '#f0f9ff'
    };
    return backgrounds[type] || backgrounds.info;
}

/**
 * Obtient la couleur du texte pour le type de notification
 */
function getTextColorForType(type) {
    const colors = {
        'success': '#065f46',
        'error': '#991b1b',
        'warning': '#92400e',
        'info': '#1e40af'
    };
    return colors[type] || colors.info;
}

/**
 * Obtient la couleur de bordure pour le type de notification
 */
function getBorderColorForType(type) {
    const colors = {
        'success': '#10b981',
        'error': '#ef4444',
        'warning': '#f59e0b',
        'info': '#3b82f6'
    };
    return colors[type] || colors.info;
}

/**
 * Affiche un état de chargement sur un élément
 * @param {HTMLElement} element - Élément à modifier
 * @param {string} message - Message de chargement
 */
function showLoadingState(element, message = 'Chargement...') {
    if (!element) return;
    
    // Sauvegarder l'état original
    element.dataset.originalText = element.textContent;
    element.dataset.originalDisabled = element.disabled;
    
    // Appliquer l'état de chargement
    element.disabled = true;
    element.textContent = message;
    element.classList.add('loading');
}

/**
 * Retire l'état de chargement d'un élément
 * @param {HTMLElement} element - Élément à restaurer
 */
function hideLoadingState(element) {
    if (!element) return;
    
    // Restaurer l'état original
    element.textContent = element.dataset.originalText || element.textContent;
    element.disabled = element.dataset.originalDisabled === 'true';
    element.classList.remove('loading');
    
    // Nettoyer les attributs
    delete element.dataset.originalText;
    delete element.dataset.originalDisabled;
}

/**
 * Formate une date en français
 * @param {Date|string} date - Date à formater
 * @param {object} options - Options de formatage
 * @returns {string} Date formatée
 */
function formaterDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('fr-FR', defaultOptions);
}

/**
 * Formate une heure en français
 * @param {Date|string} time - Heure à formater
 * @returns {string} Heure formatée
 */
function formaterHeure(time) {
    const timeObj = typeof time === 'string' ? new Date(`2000-01-01T${time}`) : time;
    return timeObj.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Valide un email - VERSION RENFORCÉE
 * @param {string} email - Email à valider
 * @returns {boolean} True si l'email est valide
 */
function validerEmail(email) {
    // Regex plus stricte pour la validation d'email
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

/**
 * Valide un numéro de téléphone ivoirien - VERSION MODIFIÉE
 * @param {string} telephone - Numéro à valider
 * @returns {boolean} True si le numéro est valide
 */
function validerTelephone(telephone) {
    // Regex pour les numéros ivoiriens :
    // - Avec préfixe : +225 suivi de 8-10 chiffres
    // - Sans préfixe : 8-10 chiffres directement
    const regex = /^(\+225\s?)?[0-9]{8,10}$/;
    return regex.test(telephone.trim());
}

/**
 * Échappe les caractères HTML
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
function echapperHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Copie du texte dans le presse-papiers
 * @param {string} text - Texte à copier
 * @returns {Promise<boolean>} True si la copie a réussi
 */
async function copierPressePapiers(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Texte copié dans le presse-papiers', 'success');
        return true;
    } catch (err) {
        console.error('Erreur de copie:', err);
        showNotification('Impossible de copier le texte', 'error');
        return false;
    }
}

/**
 * Debounce une fonction
 * @param {Function} func - Fonction à debouncer
 * @param {number} wait - Délai d'attente en millisecondes
 * @returns {Function} Fonction debouncée
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Scroll fluide vers un élément
 * @param {string|HTMLElement} target - Sélecteur ou élément cible
 * @param {object} options - Options de scroll
 */
function scrollTo(target, options = {}) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            ...options
        });
    }
}

// Export des fonctions globalement
window.showNotification = showNotification;
window.showLoadingState = showLoadingState;
window.hideLoadingState = hideLoadingState;
window.formaterDate = formaterDate;
window.formaterHeure = formaterHeure;
window.validerEmail = validerEmail;
window.validerTelephone = validerTelephone;
window.echapperHTML = echapperHTML;
window.copierPressePapiers = copierPressePapiers;
window.debounce = debounce;
window.scrollTo = scrollTo;