// ========================================
// SCRIPT PAGE DE CONNEXION ADMIN - VERSION CORRIGÉE
// Fichier: frontend/pages/connexion-admin/connexion.js
// ========================================

async function apiCall(endpoint, options = {}) {
    const baseUrl = 'http://localhost:5000/api'; 
    const url = baseUrl + endpoint;

    const fetchOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        method: options.method || 'GET',
        body: options.body || null,
    };

    try {
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorData = { message: 'Erreur réseau' };

            if (contentType && contentType.includes('application/json')) {
                errorData = await response.json();
            } else {
                const text = await response.text();
                console.error('[API] HTML reçu au lieu de JSON:', text);
            }

            throw new Error(errorData.message || 'Erreur réseau');
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
}

class ConnexionAdmin {
    constructor() {
        this.isSubmitting = false;
        this.maxAttempts = 6;      // 6 essais max
        this.currentAttempts = 0;
        this.lockoutTime = 0;      // Désactivation du verrouillage
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupValidation();
        this.checkExistingSession();
        // On ne vérifie plus le lockout car désactivé
    }

    setupEventListeners() {
        const form = document.getElementById('loginForm');
        const passwordToggle = document.getElementById('passwordToggle');
        const forgotPasswordLink = document.getElementById('forgotPasswordLink');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        passwordToggle.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });

        forgotPasswordLink.addEventListener('click', () => {
            this.showHelp();
        });

        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.clearError(input));
            input.addEventListener('blur', () => this.validateField(input));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.isSubmitting) {
                const activeElement = document.activeElement;
                if (activeElement.tagName === 'INPUT') {
                    this.handleLogin();
                }
            }
        });
    }

    setupValidation() {
        this.validationRules = {
            username: {
                required: true,
                minLength: 3,
                message: 'Nom d\'utilisateur requis (min. 3 caractères)'
            },
            password: {
                required: true,
                minLength: 6,
                message: 'Mot de passe requis (min. 6 caractères)'
            }
        };
    }

    validateField(field) {
        const rules = this.validationRules[field.name];
        if (!rules) return true;

        const value = field.value.trim();

        this.clearError(field);

        if (rules.required && !value) {
            this.showError(field, rules.message);
            return false;
        }

        if (value && rules.minLength && value.length < rules.minLength) {
            this.showError(field, rules.message);
            return false;
        }

        return true;
    }

    showError(field, message) {
        const errorElement = document.getElementById(`${field.name}-error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
        field.classList.add('error');
    }

    clearError(field) {
        const errorElement = document.getElementById(`${field.name}-error`);
        if (errorElement) {
            errorElement.textContent = '';
        }
        field.classList.remove('error');
    }

    showGeneralError(message) {
        const generalError = document.getElementById('general-error');
        generalError.textContent = message;
        generalError.classList.add('show');
    }

    hideGeneralError() {
        const generalError = document.getElementById('general-error');
        generalError.classList.remove('show');
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.querySelector('#passwordToggle i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }

    showHelp() {
        const message = `Identifiants de test :
• Email : zadjehi
• Mot de passe : Gbodolou28@
Ce compte est configuré pour la connexion administrateur.`;

        alert(message);
    }

    validateForm() {
        const form = document.getElementById('loginForm');
        const inputs = form.querySelectorAll('input[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    async handleLogin() {
        if (this.isSubmitting) return;

        // Plus de vérification lockout car désactivée

        if (!this.validateForm()) {
            return;
        }

        this.isSubmitting = true;
        this.hideGeneralError();

        try {
            this.showLoadingOverlay(true);
            this.setButtonLoading(true);

            const formData = {
                nomUtilisateur: document.getElementById('username').value.trim(),
                motDePasse: document.getElementById('password').value
            };

            console.log('🔐 Connexion:', formData.nomUtilisateur);

            const response = await apiCall('/auth/connexion', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            // Vérifier le succès avec les deux orthographes possibles (français/anglais)
            if (response && (response.success || response.succes)) {
                console.log('✅ Réponse API de connexion:', response);
                this.handleLoginSuccess(response.data);
            } else {
                console.log('❌ Échec API de connexion:', response);
                throw new Error(response.message || 'Erreur de connexion');
            }

        } catch (error) {
            console.error('Erreur connexion:', error);
            this.handleLoginError(error.message);
        } finally {
            this.showLoadingOverlay(false);
            this.setButtonLoading(false);
            this.isSubmitting = false;
        }
    }

    // ========================================
    // MÉTHODE CORRIGÉE - FINI LE PROBLÈME DU FORMULAIRE QUI SE VIDE
    // ========================================
    handleLoginSuccess(userData) {
        console.log('✅ Connexion réussie, données reçues:', userData);
        
        // 1. Sauvegarder IMMÉDIATEMENT les données d'authentification
        sessionStorage.setItem('authToken', userData.token);
        
        // Gérer les différentes structures possibles de userData
        let utilisateur = userData.utilisateur || userData.user;
        if (!utilisateur) {
            // Si pas de sous-objet, utiliser userData directement (cas SuperAdmin)
            utilisateur = {
                id: userData.id_utilisateur || userData.id,
                nomUtilisateur: userData.nom_utilisateur || userData.nomUtilisateur,
                nom: userData.nom,
                prenom: userData.prenom,
                email: userData.email,
                role: userData.role
            };
        }
        
        sessionStorage.setItem('userData', JSON.stringify(utilisateur));
        console.log('💾 Données utilisateur sauvegardées:', utilisateur);

        // 2. Nettoyer les tentatives de connexion
        this.currentAttempts = 0;
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('lockoutTime');

        // 3. DÉSACTIVER IMMÉDIATEMENT le formulaire pour éviter toute interaction
        const form = document.getElementById('loginForm');
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.6';
            input.style.pointerEvents = 'none';
        });

        // 4. Masquer le formulaire pour éviter qu'il soit visible pendant la transition
        form.style.transition = 'opacity 0.3s ease';
        form.style.opacity = '0.5';

        // 5. Afficher le message de succès
        const userName = utilisateur.nomUtilisateur || utilisateur.nom || 'Utilisateur';
        if (typeof showNotification === 'function') {
            showNotification(`Bienvenue ${userName} ! Redirection...`, 'success');
        }

        // 6. Redirection avec délai minimal pour laisser le temps de voir le message
        setTimeout(() => {
            console.log('🚀 Redirection vers le tableau de bord...');
            window.location.href = '../tableau-de-bord/index.html';
        }, 500); // Délai réduit de 800ms à 500ms
    }

    handleLoginError(errorMessage) {
        this.currentAttempts++;
        localStorage.setItem('loginAttempts', this.currentAttempts.toString());

        // Verrouillage désactivé, on ne bloque jamais

        const remaining = this.maxAttempts - this.currentAttempts;
        let message = 'Identifiants incorrects';

        if (remaining > 0 && remaining <= 2) {
            message += ` (${remaining} tentative(s) restante(s))`;
        }

        this.showGeneralError(message);

        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        }

        // Vider le champ mot de passe en cas d'erreur
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.value = '';
            passwordField.focus();
        }
    }

    // Suppression complète des fonctions liées au lockout :

    isLockedOut() {
        return false; // Toujours false car désactivé
    }

    showLockoutMessage() {
        // Ne fait rien
    }

    checkLockout() {
        // Ne fait rien
    }

    checkExistingSession() {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');

        if (token && userData) {
            try {
                const user = JSON.parse(userData);
                console.log('🔍 Session trouvée:', user.nomUtilisateur || user.username);

                setTimeout(() => {
                    if (confirm(`Session active pour ${user.nomUtilisateur || user.username}. Continuer vers le tableau de bord ?`)) {
                        window.location.href = '../tableau-de-bord/index.html';
                    } else {
                        this.logout();
                    }
                }, 500);

            } catch (error) {
                this.logout();
            }
        }
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userData');
    }

    showLoadingOverlay(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    }

    setButtonLoading(loading) {
        const button = document.getElementById('loginBtn');

        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // ========================================
    // MÉTHODE DE NETTOYAGE POUR ÉVITER LES FUITES MÉMOIRE
    // ========================================
    destroy() {
        // Nettoyer les event listeners si nécessaire
        const form = document.getElementById('loginForm');
        if (form) {
            form.removeEventListener('submit', this.handleLogin);
        }
    }
}

// ========================================
// INITIALISATION
// ========================================

let connexionAdminInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    connexionAdminInstance = new ConnexionAdmin();
    window.connexionAdmin = connexionAdminInstance;

    console.log('🔐 Page de connexion initialisée');
});

// Nettoyage avant déchargement
window.addEventListener('beforeunload', () => {
    if (connexionAdminInstance) {
        connexionAdminInstance.destroy();
    }
});

window.addEventListener('error', (event) => {
    console.error('Erreur JavaScript:', event.error);

    if (typeof showNotification === 'function') {
        showNotification('Une erreur s\'est produite', 'error');
    }
});

// Protection contre le clic droit en production
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}