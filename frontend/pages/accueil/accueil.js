// ========================================
// SCRIPT PAGE D'ACCUEIL - VERSION CORRIGÉE
// Fichier: frontend/pages/accueil/accueil.js
// ========================================

class AccueilPage {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.stats = {
            totalEnquetes: 0,
            tauxSatisfaction: 0,
            servicesUtilises: 5
        };
        
        this.init();
    }

    /**
     * Initialise la page d'accueil
     */
    init() {
        this.setupEventListeners();
        this.startAnimations();
        this.setupScrollEffects();
        this.checkAdminAccess(); // AJOUT: Vérification de l'accès admin
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Menu mobile
        const menuToggle = document.getElementById('menuToggle');
        const mainNav = document.querySelector('.main-nav');
        
        if (menuToggle && mainNav) {
            menuToggle.addEventListener('click', () => {
                mainNav.classList.toggle('mobile-open');
                const icon = menuToggle.querySelector('i');
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            });
        }

        // AJOUT: Gestion du bouton administration
        const adminLink = document.querySelector('.admin-link');
        if (adminLink) {
            adminLink.addEventListener('click', (e) => {
                this.handleAdminAccess(e);
            });
        }

        // Navigation fluide
        this.setupSmoothScrolling();

        // Animations au scroll
        this.setupScrollAnimations();

        // AJOUT: Vérification périodique du statut de connexion
        setInterval(() => {
            this.checkAdminAccess();
        }, 60000); // Toutes les minutes
    }

    /**
     * Vérifie l'accès administrateur - CORRIGÉ
     */
    checkAdminAccess() {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        const adminLink = document.querySelector('.admin-link');
        
        if (!adminLink) return;

        if (token && userData) {
            try {
                const user = JSON.parse(userData);
                // CORRECTION: Lien corrigé vers le tableau de bord
                adminLink.href = '/pages/tableau-de-bord/index.html';
                adminLink.innerHTML = `
                    <i class="fas fa-tachometer-alt" aria-hidden="true"></i> 
                    Tableau de bord (${user.nomUtilisateur || user.username})
                `;
                adminLink.title = `Connecté en tant que ${user.nomUtilisateur || user.username}`;
                console.log('👤 Utilisateur connecté:', user.nomUtilisateur || user.username);
            } catch (error) {
                console.error('Erreur lors de la lecture des données utilisateur:', error);
                this.resetAdminLink();
            }
        } else {
            // Pas d'utilisateur connecté - lien vers la connexion
            this.resetAdminLink();
        }
    }

    /**
     * Remet le lien admin à son état par défaut - CORRIGÉ
     */
    resetAdminLink() {
        const adminLink = document.querySelector('.admin-link');
        if (adminLink) {
            // CORRECTION: Lien corrigé vers la connexion
            adminLink.href = '/pages/connexion-admin/index.html';
            adminLink.innerHTML = `
                <i class="fas fa-lock" aria-hidden="true"></i> 
                Administration
            `;
            adminLink.title = 'Accès administrateur';
        }
    }

    /**
     * Gère le clic sur le lien administration - NOUVEAU
     */
    handleAdminAccess(event) {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        if (token) {
            // Utilisateur connecté - vérifier si le token est encore valide
            if (!this.isTokenValid(token)) {
                event.preventDefault();
                this.handleExpiredSession();
                return;
            }
            
            // Token valide - laisser la navigation continuer
            console.log('🔓 Accès au tableau de bord autorisé');
            
            if (typeof showNotification === 'function') {
                showNotification('Redirection vers le tableau de bord...', 'info');
            }
        } else {
            // Pas d'utilisateur connecté - redirection vers la connexion
            console.log('🔒 Redirection vers la page de connexion');
            
            if (typeof showNotification === 'function') {
                showNotification('Redirection vers la connexion...', 'info');
            }
        }
    }

    /**
     * Vérifie si le token est encore valide - NOUVEAU
     */
    isTokenValid(token) {
        try {
            // Simulation de vérification JWT
            if (token === 'fake-jwt-token-for-testing') {
                return true;
            }
            
            // En production, ici on vérifierait le token avec le serveur
            // ou on décoderait le JWT pour vérifier l'expiration
            
            return true; // Temporaire pour les tests
        } catch (error) {
            console.error('Erreur lors de la validation du token:', error);
            return false;
        }
    }

    /**
     * Gère l'expiration de session - CORRIGÉ
     */
    handleExpiredSession() {
        // Nettoyer les données expirées
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userData');
        
        // Réinitialiser le lien admin
        this.resetAdminLink();
        
        if (typeof showNotification === 'function') {
            showNotification('Session expirée. Veuillez vous reconnecter.', 'warning');
        }
        
        // CORRECTION: Lien corrigé pour la redirection
        setTimeout(() => {
            window.location.href = '/pages/connexion-admin/index.html';
        }, 2000);
    }

    /**
     * Navigation fluide entre les sections
     */
    setupSmoothScrolling() {
        const navLinks = document.querySelectorAll('a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Mise à jour du lien actif
                    this.updateActiveNavLink(targetId);
                }
            });
        });
    }

    /**
     * Met à jour le lien de navigation actif
     */
    updateActiveNavLink(targetId) {
        const navLinks = document.querySelectorAll('.nav-link:not(.admin-link)'); // Exclure le lien admin
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === targetId) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Charge les statistiques depuis l'API
     */
    async loadStats() {
        try {
            // Appel API pour récupérer les statistiques
            const response = await fetch(`${this.apiBaseUrl}/statistiques/resume`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.succes) {
                    this.stats = {
                        totalEnquetes: data.data.total_enquetes || 0,
                        tauxSatisfaction: data.data.taux_satisfaction || 0,
                        servicesUtilises: 5 // Nombre fixe de services
                    };
                    this.updateStatsDisplay();
                }
            } else {
                // Si l'API n'est pas accessible, utiliser des valeurs par défaut
                console.log('API non accessible, utilisation des valeurs par défaut');
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.log('Erreur lors du chargement des stats:', error);
            // Utiliser les valeurs par défaut en cas d'erreur
            this.updateStatsDisplay();
        }
    }

    /**
     * Met à jour l'affichage des statistiques
     */
    updateStatsDisplay() {
        // Animation des compteurs
        this.animateCounter('[data-count]', this.stats.totalEnquetes, 0);
        this.animateCounter('.stat-card:nth-child(2) .stat-number', this.stats.tauxSatisfaction, 1);
        this.animateCounter('.stat-card:nth-child(3) .stat-number', this.stats.servicesUtilises, 2);
    }

    /**
     * Anime un compteur numérique
     */
    animateCounter(selector, targetValue, index) {
        const element = document.querySelector(selector);
        if (!element) return;

        const isPercentage = index === 1; // Le taux de satisfaction
        const duration = 2000; // 2 secondes
        const increment = targetValue / (duration / 16); // 60 FPS
        let currentValue = 0;

        const timer = setInterval(() => {
            currentValue += increment;
            
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }

            const displayValue = Math.floor(currentValue);
            element.textContent = isPercentage ? `${displayValue}%` : displayValue;
        }, 16);
    }

    /**
     * Démarre les animations de la page
     */
    startAnimations() {
        // Animation d'apparition des éléments
        this.observeElements();
        
        // Animation de la hero card
        const heroCard = document.querySelector('.hero-card');
        if (heroCard) {
            setTimeout(() => {
                heroCard.style.transform = 'rotate(0deg)';
            }, 500);
        }
    }

    /**
     * Observe les éléments pour les animations au scroll
     */
    observeElements() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observer les sections
        const sections = document.querySelectorAll('.how-it-works, .cta-section');
        sections.forEach(section => {
            observer.observe(section);
        });

        // Observer les cartes
        const cards = document.querySelectorAll('.step-card');
        cards.forEach(card => {
            observer.observe(card);
        });
    }

    /**
     * Configure les animations au scroll
     */
    setupScrollAnimations() {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const header = document.querySelector('.header');
            
            // Effet sur le header
            if (scrolled > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            // Parallax léger sur la hero section
            const hero = document.querySelector('.hero');
            if (hero) {
                const heroRect = hero.getBoundingClientRect();
                if (heroRect.bottom > 0) {
                    const parallaxValue = scrolled * 0.3; // Réduit l'effet
                    hero.style.transform = `translateY(${parallaxValue}px)`;
                }
            }
        });
    }

    /**
     * Configure les effets de scroll
     */
    setupScrollEffects() {
        // Mise à jour de la navigation active selon la section visible
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]:not(.admin-link)');

        window.addEventListener('scroll', () => {
            const scrollPosition = window.scrollY + 200;

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');

                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${sectionId}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        });
    }

    /**
     * Affiche un message de bienvenue personnalisé
     */
    showWelcomeMessage() {
        const hour = new Date().getHours();
        let greeting;

        if (hour < 12) {
            greeting = 'Bonjour';
        } else if (hour < 18) {
            greeting = 'Bon après-midi';
        } else {
            greeting = 'Bonsoir';
        }

        // Vérifier s'il y a un utilisateur connecté
        const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                console.log(`${greeting} ${user.nomUtilisateur || user.username} ! Bienvenue sur notre système d'enquête de satisfaction.`);
                
                if (typeof showNotification === 'function') {
                    showNotification(`${greeting} ${user.nomUtilisateur || user.username} !`, 'info', 3000);
                }
            } catch (error) {
                console.log(`${greeting} ! Bienvenue sur notre système d'enquête de satisfaction.`);
            }
        } else {
            console.log(`${greeting} ! Bienvenue sur notre système d'enquête de satisfaction.`);
        }
    }

    /**
     * Vérifie la disponibilité de l'API
     */
    async checkApiHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                console.log('API Status:', data.message);
                return true;
            }
        } catch (error) {
            console.log('API non disponible:', error);
            return false;
        }
        return false;
    }

    /**
     * NOUVEAU: Déconnexion rapide depuis l'accueil
     */
    quickLogout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            // Nettoyer les données de session
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            
            // Réinitialiser le lien admin
            this.resetAdminLink();
            
            if (typeof showNotification === 'function') {
                showNotification('Vous avez été déconnecté avec succès', 'success');
            }
            
            console.log('🔓 Déconnexion effectuée depuis l\'accueil');
        }
    }
}

// ========================================
// INITIALISATION ET RESTE DU CODE...
// ========================================

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser la page d'accueil
    const accueilPage = new AccueilPage();
    
    // Stockage global pour accès depuis d'autres scripts
    window.accueilPage = accueilPage;
    
    // Message de bienvenue
    accueilPage.showWelcomeMessage();
    
    // Vérifier l'API au chargement
    accueilPage.checkApiHealth();
    
    console.log('✅ Page d\'accueil initialisée avec succès');
});

// Export global pour debug
window.AccueilAPI = {
    checkAdminAccess: () => window.accueilPage?.checkAdminAccess(),
    quickLogout: () => window.accueilPage?.quickLogout(),
    isUserConnected: () => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        return !!token;
    },
    getUserData: () => {
        const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        try {
            return userData ? JSON.parse(userData) : null;
        } catch {
            return null;
        }
    }
};