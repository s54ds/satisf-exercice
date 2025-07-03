// ========================================
// TABLEAU DE BORD - VERSION RÉORGANISÉE
// ========================================

/**
 * Classe principale du tableau de bord
 * Gère l'affichage des statistiques, enquêtes et notifications
 */
class TableauDeBord {
    // ========================================
    // CONSTRUCTEUR ET INITIALISATION
    // ========================================
    
    constructor() {
        // Configuration des intervalles
        this.refreshInterval = null;
        this.notificationsInterval = null;
        
        // État des graphiques
        this.chartLine = null;
        this.chartDoughnut = null;
        this.isInitialized = false;
        
        // Gestion des notifications
        this.notifications = [];
        this.notificationsNonLues = 0;
        this.modalNotificationsOuverte = false;
        
        // Gestion du tableau des enquêtes
        this.enquetesData = [];
        this.enquetesFiltrees = [];
        this.pageActuelle = 1;
        this.elementsParPage = 10;
        
        // Données pour les filtres
        this.services = [];
        this.raisonsPresence = [];
        
        // Initialisation automatique
        this._initializeWhenReady();
    }

    /**
     * Démarre l'initialisation quand le DOM est prêt
     * @private
     */
    _initializeWhenReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialisation principale du tableau de bord
     */
    async init() {
        try {
            console.log('🚀 Initialisation du tableau de bord...');
            
            // Étapes d'initialisation séquentielles
            await this._waitForChartJS();
            await this._initializeNotifications();
            
            if (!this._verifyAuthentication()) return;
            
            // Initialisation parallèle des composants
            this._setupEventListeners();
            await this._loadAllData();
            this._scheduleAutoRefresh();
            
            this.isInitialized = true;
            console.log('✅ Tableau de bord initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showNotification('Erreur lors du chargement du tableau de bord', 'error');
        }
    }

    // ========================================
    // MÉTHODES D'INITIALISATION PRIVÉES
    // ========================================

    /**
     * Attend que Chart.js soit disponible
     * @private
     */
    async _waitForChartJS() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkChart = () => {
                attempts++;
                if (typeof Chart !== 'undefined') {
                    console.log('✅ Chart.js chargé avec succès');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ Timeout: Chart.js non chargé');
                    reject(new Error('Chart.js non disponible'));
                } else {
                    setTimeout(checkChart, 100);
                }
            };
            
            checkChart();
        });
    }

    /**
     * Vérifie l'authentification de l'utilisateur
     * @private
     */
    _verifyAuthentication() {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');

        if (!token || !userData) {
            this.showNotification('Session expirée. Redirection...', 'warning');
            setTimeout(() => window.location.href = '../connexion-admin/index.html', 1500);
            return false;
        }

        try {
            const user = JSON.parse(userData);
            this._updateUserDisplay(user);
            return true;
        } catch (e) {
            this._cleanInvalidData();
            this.showNotification('Données corrompues. Redirection...', 'error');
            setTimeout(() => window.location.href = '../connexion-admin/index.html', 1500);
            return false;
        }
    }

    /**
     * Met à jour l'affichage des informations utilisateur
     * @private
     */
    _updateUserDisplay(user) {
        const userNameElement = document.getElementById('userName');
        const userRoleElement = document.querySelector('.user-role');
        
        if (userNameElement) {
            userNameElement.textContent = user.nomUtilisateur || user.nom_utilisateur || 'Utilisateur';
        }
        
        if (userRoleElement) {
            userRoleElement.textContent = user.role || '';
        }
    }

    /**
     * Nettoie les données d'authentification invalides
     * @private
     */
    _cleanInvalidData() {
        ['authToken', 'userData'].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    /**
     * Charge toutes les données en parallèle
     * @private
     */
    async _loadAllData() {
        await Promise.all([
            this.loadDashboardData(),
            this.loadSurveys(),
            this.loadFilterOptions()
        ]);
    }

    /**
     * Programme l'actualisation automatique
     * @private
     */
    _scheduleAutoRefresh() {
        // Actualisation toutes les 5 minutes
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, 5 * 60 * 1000);
    }

    // ========================================
    // GESTION DES ÉVÉNEMENTS
    // ========================================

    /**
     * Configure tous les event listeners
     * @private
     */
    _setupEventListeners() {
        // Boutons principaux
        this._setupMainButtons();
        
        // Recherche et filtres
        this._setupSearchAndFilters();
        
        // Interface utilisateur
        this._setupUIInteractions();
    }

    /**
     * Configure les boutons principaux
     * @private
     */
    _setupMainButtons() {
        const buttons = {
            refreshBtn: () => this.refreshData(),
            exportBtn: () => this.exportData(),
            logoutBtn: (e) => {
                e.preventDefault();
                this.logout();
            },
            sidebarToggle: () => this._toggleSidebar()
        };

        Object.entries(buttons).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
            }
        });
    }

    /**
     * Configure la recherche et les filtres
     * @private
     */
    _setupSearchAndFilters() {
        const searchInput = document.getElementById('searchInput');
        const filterStatus = document.getElementById('filterStatus');
        const filterRaison = document.getElementById('filterRaison');

        if (searchInput) {
            let timeoutId;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => this.filterSurveys(), 300);
            });
        }

        [filterStatus, filterRaison].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => this.filterSurveys());
            }
        });
    }

    /**
     * Configure les interactions de l'interface
     * @private
     */
    _setupUIInteractions() {
        // Fermeture des dropdowns
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (!menu.closest('.navbar-item')?.contains(e.target)) {
                    this._hideDropdown(menu);
                }
            });
        });
    }

    /**
     * Cache un dropdown
     * @private
     */
    _hideDropdown(menu) {
        menu.style.opacity = '0';
        menu.style.visibility = 'hidden';
        menu.style.transform = 'translateY(-10px)';
    }

    /**
     * Bascule la sidebar
     * @private
     */
    _toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        
        sidebar?.classList.toggle('collapsed');
        mainContent?.classList.toggle('sidebar-collapsed');
    }

    // ========================================
    // GESTION DES DONNÉES
    // ========================================

    /**
     * Charge les données du tableau de bord
     */
    async loadDashboardData() {
        try {
            this._showLoading(true);
            const stats = await this._fetchStatistics();
            
            this._updateStatisticsDisplay(stats);
            await this._renderCharts(stats);
            
        } catch (error) {
            console.error('❌ Erreur chargement données:', error);
            this.showNotification('Erreur lors du chargement des données', 'error');
        } finally {
            this._showLoading(false);
        }
    }

    /**
     * Récupère les statistiques depuis l'API
     * @private
     */
    async _fetchStatistics() {
        try {
            console.log('📊 Récupération des statistiques...');
            
            const response = await apiCall('/dashboard/stats');
            
            if (response.succes) {
                console.log('✅ Statistiques récupérées');
                return response.data;
            } else {
                throw new Error(response.message || 'Erreur API');
            }

        } catch (error) {
            console.error('❌ Erreur API, utilisation des données par défaut');
            return this._getDefaultStatistics();
        }
    }

    /**
     * Retourne des statistiques par défaut
     * @private
     */
    _getDefaultStatistics() {
        return {
            totalEnquetes: this.enquetesData.length || 0,
            satisfactionMoyenne: 75,
            insatisfactionMoyenne: 25,
            tendances: {
                enquetes: 12,
                satisfaction: 3,
                insatisfaction: -5
            },
            mensuelles: this._generateDefaultMonthlyData(),
            services: [],
            derniereMAJ: new Date().toISOString(),
            periode: 'Données locales'
        };
    }

    /**
     * Génère des données mensuelles par défaut
     * @private
     */
    _generateDefaultMonthlyData() {
        return [
            { mois: 1, annee: 2025, nombre_enquetes: 23 },
            { mois: 2, annee: 2025, nombre_enquetes: 31 },
            { mois: 3, annee: 2025, nombre_enquetes: 28 },
            { mois: 4, annee: 2025, nombre_enquetes: 35 },
            { mois: 5, annee: 2025, nombre_enquetes: 29 },
            { mois: 6, annee: 2025, nombre_enquetes: 33 }
        ];
    }

    /**
     * Actualise toutes les données
     */
    async refreshData() {
        this.showNotification('Actualisation des données...', 'info');
        
        await Promise.all([
            this.loadDashboardData(),
            this.loadSurveys(),
            this.loadNotifications()
        ]);
        
        this.showNotification('Données actualisées', 'success');
    }

    // ========================================
    // GESTION DES ENQUÊTES
    // ========================================

    /**
     * Charge les enquêtes depuis l'API
     */
    async loadSurveys() {
        try {
            console.log('📋 Chargement des enquêtes...');
            
            const response = await apiCall('/enquetes?page=1&limite=100');
            
            if (response.succes) {
                this.enquetesData = response.data || response.enquetes || [];
                this.enquetesFiltrees = [...this.enquetesData];
                
                console.log(`✅ ${this.enquetesData.length} enquêtes chargées`);
                
                this.loadFilterOptions();
                this.displaySurveys();
            } else {
                throw new Error(response.message || 'Erreur chargement enquêtes');
            }

        } catch (error) {
            console.error('❌ Erreur chargement enquêtes:', error);
            this.showNotification('Chargement des données d\'exemple', 'warning');
            this._loadSampleSurveys();
        }
    }

    /**
     * Charge des données d'exemple
     * @private
     */
    _loadSampleSurveys() {
        this.enquetesData = [
            {
                id_enquete: 1,
                date_heure_visite: '2025-07-03 12:37:00',
                nom_visiteur: 'ZADJEHI',
                prenom_visiteur: 'MOAHE EMMANUEL HYACINTHE JUNIOR',
                telephone: '0101445401',
                email: 'zadjehi@gmail.com',
                raison_presence: 'Prise de sang (Bilan)',
                niveau_satisfaction: 'Satisfait',
                id_service: 3,
                nom_service: 'Résultats',
                commentaires: 'Je suis satisfait du resultat',
                date_soumission: '2025-07-03 12:39:16'
            },
            {
                id_enquete: 2,
                date_heure_visite: '2025-07-02 14:20:00',
                nom_visiteur: 'KONE',
                prenom_visiteur: 'Marie',
                telephone: '0102030405',
                email: 'marie.kone@email.com',
                raison_presence: 'Information',
                niveau_satisfaction: 'Mécontent',
                id_service: 1,
                nom_service: 'Accueil',
                commentaires: 'Attente trop longue',
                date_soumission: '2025-07-02 14:25:00'
            },
            {
                id_enquete: 3,
                date_heure_visite: '2025-07-01 09:15:00',
                nom_visiteur: 'TRAORE',
                prenom_visiteur: 'Ibrahim',
                telephone: '0506070809',
                email: 'ibrahim.traore@email.com',
                raison_presence: 'Retrait de résultat',
                niveau_satisfaction: 'Satisfait',
                id_service: 3,
                nom_service: 'Résultats',
                commentaires: 'Service rapide et efficace',
                date_soumission: '2025-07-01 09:20:00'
            }
        ];
        
        this.enquetesFiltrees = [...this.enquetesData];
        this.loadFilterOptions();
        this.displaySurveys();
    }

    /**
     * Filtre les enquêtes selon les critères
     */
    filterSurveys() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
        const statusFilter = document.getElementById('filterStatus')?.value || '';
        const raisonFilter = document.getElementById('filterRaison')?.value || '';

        console.log('🔍 Filtrage:', { searchTerm, statusFilter, raisonFilter });

        this.enquetesFiltrees = this.enquetesData.filter(enquete => {
            const matchSearch = this._matchesSearchTerm(enquete, searchTerm);
            const matchStatus = !statusFilter || enquete.niveau_satisfaction === statusFilter;
            const matchRaison = !raisonFilter || enquete.raison_presence === raisonFilter;

            return matchSearch && matchStatus && matchRaison;
        });

        console.log(`📊 ${this.enquetesFiltrees.length}/${this.enquetesData.length} enquêtes affichées`);

        this.pageActuelle = 1;
        this.displaySurveys();
    }

    /**
     * Vérifie si une enquête correspond au terme de recherche
     * @private
     */
    _matchesSearchTerm(enquete, searchTerm) {
        if (!searchTerm) return true;
        
        const fields = [
            `${enquete.nom_visiteur} ${enquete.prenom_visiteur || ''}`,
            enquete.telephone || '',
            enquete.email || '',
            enquete.nom_service || '',
            enquete.commentaires || ''
        ];
        
        return fields.some(field => 
            field.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Affiche les enquêtes dans le tableau
     */
    displaySurveys() {
        const tbody = document.getElementById('enquetesTableBody');
        
        if (!tbody) {
            console.warn('❌ Table body non trouvé');
            return;
        }
        
        if (this.enquetesFiltrees.length === 0) {
            this._displayEmptyState(tbody);
            this._updatePagination();
            return;
        }

        const paginatedSurveys = this._getPaginatedSurveys();
        tbody.innerHTML = paginatedSurveys.map(enquete => 
            this._generateSurveyRow(enquete)
        ).join('');

        this._updatePagination();
    }

    /**
     * Affiche l'état vide du tableau
     * @private
     */
    _displayEmptyState(tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state" style="text-align: center; padding: 2rem; color: #6b7280;">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; display: block; color: #d1d5db;"></i>
                    <p style="margin: 0; font-weight: 500;">Aucune enquête trouvée</p>
                    <small style="color: #9ca3af;">Essayez de modifier vos critères de recherche</small>
                </td>
            </tr>
        `;
    }

    /**
     * Retourne les enquêtes paginées
     * @private
     */
    _getPaginatedSurveys() {
        const debut = (this.pageActuelle - 1) * this.elementsParPage;
        const fin = debut + this.elementsParPage;
        return this.enquetesFiltrees.slice(debut, fin);
    }

    /**
     * Génère le HTML d'une ligne d'enquête
     * @private
     */
    _generateSurveyRow(enquete) {
        return `
            <tr>
                <td>
                    <div style="font-weight: 500;">${this._formatDate(enquete.date_heure_visite)}</div>
                    <div style="font-size: 0.8rem; color: #6b7280;">${this._formatTime(enquete.date_heure_visite)}</div>
                </td>
                <td>
                    <div style="font-weight: 500;">${enquete.nom_visiteur}</div>
                    <div style="font-size: 0.8rem; color: #6b7280;">${enquete.prenom_visiteur || ''}</div>
                </td>
                <td>
                    <div style="font-size: 0.8rem;">
                        <i class="fas fa-phone" style="color: #6b7280; margin-right: 0.25rem;"></i>
                        ${enquete.telephone}
                    </div>
                    ${enquete.email ? `
                        <div style="font-size: 0.8rem; margin-top: 0.25rem;">
                            <i class="fas fa-envelope" style="color: #6b7280; margin-right: 0.25rem;"></i>
                            ${enquete.email}
                        </div>
                    ` : ''}
                </td>
                <td>
                    <span class="raison-badge" style="
                        display: inline-block;
                        padding: 0.25rem 0.5rem;
                        border-radius: 0.375rem;
                        font-size: 0.75rem;
                        font-weight: 500;
                        background: ${this._getRaisonColor(enquete.raison_presence)};
                        color: ${this._getRaisonTextColor(enquete.raison_presence)};
                    ">
                        ${enquete.raison_presence}
                    </span>
                </td>
                <td>${enquete.nom_service || 'Inconnu'}</td>
                <td>
                    <span class="status-badge" style="
                        display: inline-flex;
                        align-items: center;
                        padding: 0.25rem 0.5rem;
                        border-radius: 0.375rem;
                        font-size: 0.75rem;
                        font-weight: 500;
                        background: ${enquete.niveau_satisfaction === 'Satisfait' ? '#dcfce7' : '#fef2f2'};
                        color: ${enquete.niveau_satisfaction === 'Satisfait' ? '#166534' : '#991b1b'};
                    ">
                        <i class="fas ${enquete.niveau_satisfaction === 'Satisfait' ? 'fa-smile' : 'fa-frown'}" style="margin-right: 0.25rem;"></i>
                        ${enquete.niveau_satisfaction}
                    </span>
                </td>
                <td>
                    ${this._generateActionButtons(enquete.id_enquete)}
                </td>
            </tr>
        `;
    }

    /**
     * Génère les boutons d'action pour une enquête
     * @private
     */
    _generateActionButtons(id) {
        return `
            <div class="action-buttons" style="display: flex; gap: 0.5rem;">
                <button class="btn-sm btn-view" onclick="window.tableauDeBord.viewSurveyDetails(${id})" 
                        title="Voir détails" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 0.25rem 0.5rem;
                            border-radius: 0.25rem;
                            cursor: pointer;
                            transition: background 0.2s;
                        "
                        onmouseover="this.style.background='#2563eb'"
                        onmouseout="this.style.background='#3b82f6'">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-sm btn-delete" onclick="window.tableauDeBord.deleteSurvey(${id})" 
                        title="Supprimer" style="
                            background: #ef4444;
                            color: white;
                            border: none;
                            padding: 0.25rem 0.5rem;
                            border-radius: 0.25rem;
                            cursor: pointer;
                            transition: background 0.2s;
                        "
                        onmouseover="this.style.background='#dc2626'"
                        onmouseout="this.style.background='#ef4444'">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    // ========================================
    // GESTION DE LA PAGINATION
    // ========================================

    /**
     * Change de page
     */
    changePage(direction) {
        const totalPages = Math.ceil(this.enquetesFiltrees.length / this.elementsParPage);
        const nouvellePage = this.pageActuelle + direction;

        if (nouvellePage >= 1 && nouvellePage <= totalPages) {
            this.pageActuelle = nouvellePage;
            this.displaySurveys();
        }
    }

    /**
     * Va à une page spécifique
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.enquetesFiltrees.length / this.elementsParPage);
        if (page >= 1 && page <= totalPages) {
            this.pageActuelle = page;
            this.displaySurveys();
        }
    }

    /**
     * Met à jour l'affichage de la pagination
     * @private
     */
    _updatePagination() {
        this._updatePaginationInfo();
        this._updatePaginationButtons();
        this._updatePageNumbers();
    }

    /**
     * Met à jour les informations de pagination
     * @private
     */
    _updatePaginationInfo() {
        const totalElements = this.enquetesFiltrees.length;
        const debut = (this.pageActuelle - 1) * this.elementsParPage + 1;
        const fin = Math.min(this.pageActuelle * this.elementsParPage, totalElements);

        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = 
                `Affichage de ${totalElements > 0 ? debut : 0} à ${fin} sur ${totalElements} résultats`;
        }
    }

    /**
     * Met à jour les boutons de pagination
     * @private
     */
    _updatePaginationButtons() {
        const totalPages = Math.ceil(this.enquetesFiltrees.length / this.elementsParPage);
        
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) prevBtn.disabled = this.pageActuelle <= 1;
        if (nextBtn) nextBtn.disabled = this.pageActuelle >= totalPages;
    }

    /**
     * Met à jour les numéros de page
     * @private
     */
    _updatePageNumbers() {
        const totalPages = Math.ceil(this.enquetesFiltrees.length / this.elementsParPage);
        const pageNumbers = document.getElementById('pageNumbers');
        
        if (!pageNumbers) return;

        let pagesHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            if (this._shouldShowPageNumber(i, totalPages)) {
                pagesHTML += this._generatePageButton(i);
            } else if (this._shouldShowEllipsis(i)) {
                pagesHTML += `<span style="padding: 0 0.5rem;">...</span>`;
            }
        }

        pageNumbers.innerHTML = pagesHTML;
    }

    /**
     * Détermine si un numéro de page doit être affiché
     * @private
     */
    _shouldShowPageNumber(pageNum, totalPages) {
        return pageNum === 1 || 
               pageNum === totalPages || 
               (pageNum >= this.pageActuelle - 2 && pageNum <= this.pageActuelle + 2);
    }

    /**
     * Détermine si des ellipses doivent être affichées
     * @private
     */
    _shouldShowEllipsis(pageNum) {
        return pageNum === this.pageActuelle - 3 || pageNum === this.pageActuelle + 3;
    }

    /**
     * Génère un bouton de page
     * @private
     */
    _generatePageButton(pageNum) {
        const isActive = pageNum === this.pageActuelle;
        return `
            <button class="page-btn ${isActive ? 'active' : ''}" 
                    onclick="window.tableauDeBord.goToPage(${pageNum})"
                    style="
                        padding: 0.5rem 0.75rem;
                        margin: 0 0.25rem;
                        border: 1px solid #d1d5db;
                        background: ${isActive ? '#3b82f6' : 'white'};
                        color: ${isActive ? 'white' : '#374151'};
                        border-radius: 0.375rem;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">${pageNum}</button>
        `;
    }

    // ========================================
    // GESTION DES ACTIONS SUR LES ENQUÊTES
    // ========================================

    /**
     * Affiche les détails d'une enquête
     */
    viewSurveyDetails(id) {
        const enquete = this.enquetesData.find(e => e.id_enquete === id);
        if (!enquete) return;

        const details = [
            `Enquête #${id}`,
            `Visiteur: ${enquete.nom_visiteur} ${enquete.prenom_visiteur || ''}`,
            `Téléphone: ${enquete.telephone}`,
            `Email: ${enquete.email || 'Non renseigné'}`,
            `Date visite: ${this._formatDate(enquete.date_heure_visite)} à ${this._formatTime(enquete.date_heure_visite)}`,
            `Raison: ${enquete.raison_presence}`,
            `Service: ${enquete.nom_service || 'Inconnu'}`,
            `Satisfaction: ${enquete.niveau_satisfaction}`,
            `Commentaires: ${enquete.commentaires || 'Aucun commentaire'}`,
            `Recommandations: ${enquete.recommandations || 'Aucune recommandation'}`
        ].join('\n');
        
        alert(details); // TODO: Remplacer par une vraie modal
    }

    /**
     * Supprime une enquête
     */
    async deleteSurvey(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette enquête ?')) {
            return;
        }

        try {
            const response = await apiCall(`/enquetes/${id}`, { method: 'DELETE' });

            if (response.succes) {
                this.showNotification('Enquête supprimée avec succès', 'success');
                await Promise.all([
                    this.loadSurveys(),
                    this.loadDashboardData()
                ]);
            } else {
                throw new Error(response.message || 'Erreur lors de la suppression');
            }

        } catch (error) {
            console.error('❌ Erreur suppression enquête:', error);
            this.showNotification('Erreur lors de la suppression: ' + error.message, 'error');
        }
    }

    // ========================================
    // EXPORT DES DONNÉES
    // ========================================

    /**
     * Exporte les données selon les filtres appliqués
     */
    async exportData() {
        try {
            console.log('📥 Début de l\'export Excel...');
            this.showNotification('Préparation de l\'export Excel...', 'info');
            
            const exportBtn = document.getElementById('exportBtn');
            this._setExportButtonLoading(exportBtn, true);

            const filters = this._getCurrentFilters();
            
            if (this._hasActiveFilters(filters)) {
                console.log('🔍 Export avec filtres appliqués');
                await this._exportFilteredData();
            } else {
                console.log('📊 Export de toutes les données');
                await this._exportAllData();
            }

        } catch (error) {
            console.error('❌ Erreur lors de l\'export:', error);
            this.showNotification('Erreur lors de l\'export: ' + error.message, 'error');
        } finally {
            const exportBtn = document.getElementById('exportBtn');
            this._setExportButtonLoading(exportBtn, false);
        }
    }

    /**
     * Configure l'état de chargement du bouton d'export
     * @private
     */
    _setExportButtonLoading(exportBtn, isLoading) {
        if (!exportBtn) return;
        
        if (isLoading) {
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Export...';
            exportBtn.disabled = true;
        } else {
            exportBtn.innerHTML = '<i class="fas fa-download"></i> Exporter';
            exportBtn.disabled = false;
        }
    }

    /**
     * Récupère les filtres actuels
     * @private
     */
    _getCurrentFilters() {
        return {
            search: document.getElementById('searchInput')?.value || '',
            status: document.getElementById('filterStatus')?.value || '',
            reason: document.getElementById('filterRaison')?.value || ''
        };
    }

    /**
     * Vérifie si des filtres sont actifs
     * @private
     */
    _hasActiveFilters(filters) {
        return filters.search || filters.status || filters.reason;
    }

    /**
     * Exporte toutes les données via l'API
     * @private
     */
    async _exportAllData() {
        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            
            if (!token) {
                throw new Error('Token d\'authentification manquant');
            }

            const url = '/statistiques/export?format=excel&type=enquetes';
            const fullUrl = `${window.API_CONFIG?.BASE_URL || 'http://localhost:5000/api'}${url}`;
            
            console.log('🌐 URL d\'export:', fullUrl);

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur API:', response.status, errorText);
                throw new Error(`Erreur ${response.status}: ${errorText}`);
            }

            const blob = await response.blob();
            const fileName = this._extractFileName(response) || this._generateFileName('enquetes_satisfaction', 'xlsx');
            
            this._downloadBlob(blob, fileName);
            
            console.log('✅ Fichier Excel téléchargé:', fileName);
            this.showNotification('Export Excel réussi ! Fichier téléchargé.', 'success');

        } catch (error) {
            console.error('❌ Erreur export toutes données:', error);
            throw error;
        }
    }

    /**
     * Exporte les données filtrées
     * @private
     */
    async _exportFilteredData() {
        try {
            console.log('🔄 Export des données filtrées...');
            
            if (this.enquetesFiltrees.length === 0) {
                this.showNotification('Aucune donnée à exporter avec les filtres actuels', 'warning');
                return;
            }

            const formattedData = this._formatSurveysForExport(this.enquetesFiltrees);
            const filters = this._getCurrentFilters();

            const response = await apiCall('/statistiques/export-preview?type=enquetes', {
                method: 'POST',
                body: JSON.stringify({
                    donnees: formattedData,
                    format: 'excel',
                    filtres: filters
                })
            });

            if (response.succes) {
                await this._downloadFromResponse(response.data);
            } else {
                throw new Error(response.message || 'Erreur lors de l\'export filtré');
            }

        } catch (error) {
            console.error('❌ Erreur export données filtrées:', error);
            console.log('📝 Fallback vers export CSV local...');
            this._exportAsLocalCSV();
        }
    }

    /**
     * Formate les enquêtes pour l'export
     * @private
     */
    _formatSurveysForExport(surveys) {
        return surveys.map((enquete, index) => ({
            'N°': index + 1,
            'Date/Heure Visite': this._formatDateTime(enquete.date_heure_visite),
            'Nom': enquete.nom_visiteur,
            'Prénom': enquete.prenom_visiteur || '',
            'Téléphone': enquete.telephone,
            'Email': enquete.email || '',
            'Raison Présence': enquete.raison_presence,
            'Satisfaction': enquete.niveau_satisfaction,
            'Service': enquete.nom_service || 'Service non défini',
            'Commentaires': enquete.commentaires || '',
            'Recommandations': enquete.recommandations || '',
            'Date Soumission': this._formatDateTime(enquete.date_soumission)
        }));
    }

    /**
     * Export CSV local en fallback
     * @private
     */
    _exportAsLocalCSV() {
        try {
            if (this.enquetesFiltrees.length === 0) {
                this.showNotification('Aucune donnée à exporter', 'warning');
                return;
            }

            const headers = [
                'N°', 'Date/Heure Visite', 'Nom', 'Prénom', 'Téléphone', 'Email',
                'Raison Présence', 'Satisfaction', 'Service', 'Commentaires', 'Recommandations'
            ];

            const csvLines = [headers.join(';')];

            this.enquetesFiltrees.forEach((enquete, index) => {
                const ligne = [
                    index + 1,
                    this._formatDateTime(enquete.date_heure_visite),
                    enquete.nom_visiteur,
                    enquete.prenom_visiteur || '',
                    enquete.telephone,
                    enquete.email || '',
                    enquete.raison_presence,
                    enquete.niveau_satisfaction,
                    enquete.nom_service || '',
                    (enquete.commentaires || '').replace(/;/g, ','),
                    (enquete.recommandations || '').replace(/;/g, ',')
                ];
                csvLines.push(ligne.join(';'));
            });

            const csvContent = csvLines.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const fileName = this._generateFileName('enquetes_filtrees', 'csv');
            
            this._downloadBlob(blob, fileName);
            
            console.log('✅ Export CSV local réussi:', fileName);
            this.showNotification('Export CSV réussi ! (Données filtrées)', 'success');

        } catch (error) {
            console.error('❌ Erreur export CSV local:', error);
            this.showNotification('Erreur lors de l\'export CSV local', 'error');
        }
    }

    /**
     * Extrait le nom de fichier depuis les en-têtes de réponse
     * @private
     */
    _extractFileName(response) {
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
            return fileNameMatch ? fileNameMatch[1] : null;
        }
        return null;
    }

    /**
     * Génère un nom de fichier avec timestamp
     * @private
     */
    _generateFileName(baseName, extension) {
        const timestamp = new Date().toISOString().split('T')[0];
        return `${baseName}_${timestamp}.${extension}`;
    }

    /**
     * Télécharge un blob
     * @private
     */
    _downloadBlob(blob, fileName) {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    }

    // ========================================
    // GESTION DES FILTRES
    // ========================================

    /**
     * Charge les options de filtres
     */
    async loadFilterOptions() {
        try {
            console.log('🔧 Chargement des options de filtre...');

            // Charger les services depuis l'API
            await this._loadServicesFromAPI();
            
            // Extraire les raisons de présence des données
            this._extractReasonsFromData();
            
            // Mettre à jour les selects
            this._updateFilterSelects();

        } catch (error) {
            console.error('❌ Erreur chargement options filtre:', error);
            this._setDefaultFilterOptions();
        }
    }

    /**
     * Charge les services depuis l'API
     * @private
     */
    async _loadServicesFromAPI() {
        try {
            const servicesResponse = await apiCall('/enquetes/services');
            if (servicesResponse.succes) {
                this.services = servicesResponse.data;
                console.log('✅ Services chargés:', this.services.length);
            }
        } catch (error) {
            console.warn('⚠️ Impossible de charger les services depuis l\'API');
        }
    }

    /**
     * Extrait les raisons de présence des données
     * @private
     */
    _extractReasonsFromData() {
        if (this.enquetesData.length > 0) {
            this.raisonsPresence = [...new Set(this.enquetesData.map(e => e.raison_presence))];
        } else {
            this._setDefaultReasons();
        }
    }

    /**
     * Définit les raisons par défaut
     * @private
     */
    _setDefaultReasons() {
        this.raisonsPresence = [
            'Information', 
            'Prise de sang (Bilan)', 
            'Retrait de résultat'
        ];
    }

    /**
     * Définit les options de filtre par défaut
     * @private
     */
    _setDefaultFilterOptions() {
        this._setDefaultReasons();
        this._updateFilterSelects();
    }

    /**
     * Met à jour les selects de filtres
     * @private
     */
    _updateFilterSelects() {
        this._updateReasonFilter();
        // Ajouter d'autres filtres si nécessaire
    }

    /**
     * Met à jour le filtre des raisons
     * @private
     */
    _updateReasonFilter() {
        const filterRaison = document.getElementById('filterRaison');
        
        if (!filterRaison || this.raisonsPresence.length === 0) return;
        
        filterRaison.innerHTML = '<option value="">Toutes les raisons</option>';
        
        this.raisonsPresence.forEach(raison => {
            const option = document.createElement('option');
            option.value = raison;
            option.textContent = raison;
            filterRaison.appendChild(option);
        });
        
        console.log('✅ Select raisons mis à jour avec', this.raisonsPresence.length, 'options');
    }

    // ========================================
    // GESTION DES NOTIFICATIONS
    // ========================================

    /**
     * Initialise le système de notifications
     * @private
     */
    async _initializeNotifications() {
        try {
            console.log('🔔 Initialisation du système de notifications...');
            
            await this.loadNotifications();
            await this._updateNotificationCounter();
            this._scheduleNotificationUpdates();
            this._setupNotificationEventListeners();
            
            console.log('✅ Système de notifications initialisé');
        } catch (error) {
            console.error('❌ Erreur initialisation notifications:', error);
        }
    }

    /**
     * Charge les notifications depuis l'API
     */
    async loadNotifications() {
        try {
            const response = await apiCall('/notifications/non-lues');
            
            if (response.succes) {
                this.notifications = response.data || [];
                this.notificationsNonLues = this.notifications.length;
                
                console.log(`🔔 ${this.notificationsNonLues} notifications non lues chargées`);
                
                this._displayNotificationsInDropdown();
                this._updateNotificationBadge();
            }
        } catch (error) {
            console.error('❌ Erreur chargement notifications:', error);
        }
    }

    /**
     * Met à jour le compteur de notifications
     * @private
     */
    async _updateNotificationCounter() {
        try {
            const response = await apiCall('/notifications/compteur');
            
            if (response.succes) {
                this.notificationsNonLues = response.data.compteur;
                this._updateNotificationBadge();
            }
        } catch (error) {
            console.error('❌ Erreur mise à jour compteur:', error);
        }
    }

    /**
     * Met à jour le badge de notifications
     * @private
     */
    _updateNotificationBadge() {
        const badgeElement = document.getElementById('notificationBadge');
        
        if (!badgeElement) return;
        
        if (this.notificationsNonLues > 0) {
            badgeElement.textContent = this.notificationsNonLues > 99 ? '99+' : this.notificationsNonLues;
            badgeElement.style.display = 'inline';
            
            // Animation pour nouvelles notifications
            badgeElement.classList.add('notification-pulse');
            setTimeout(() => {
                badgeElement.classList.remove('notification-pulse');
            }, 1000);
        } else {
            badgeElement.style.display = 'none';
        }
    }

    /**
     * Affiche les notifications dans le dropdown
     * @private
     */
    _displayNotificationsInDropdown() {
        const container = document.querySelector('#notificationsMenu .dropdown-content');
        
        if (!container) {
            console.warn('Container notifications non trouvé');
            return;
        }

        if (this.notifications.length === 0) {
            container.innerHTML = this._getEmptyNotificationsHTML();
            return;
        }

        const notificationsHTML = this.notifications
            .slice(0, 5)
            .map(notification => this._generateNotificationHTML(notification))
            .join('');

        container.innerHTML = notificationsHTML;
    }

    /**
     * Génère le HTML pour une notification vide
     * @private
     */
    _getEmptyNotificationsHTML() {
        return `
            <div class="notification-item empty">
                <div class="notification-content">
                    <p>Aucune nouvelle notification</p>
                    <small>Vous êtes à jour !</small>
                </div>
            </div>
        `;
    }

    /**
     * Génère le HTML pour une notification
     * @private
     */
    _generateNotificationHTML(notification) {
        const icon = this._getNotificationIcon(notification.type_notification);
        const color = this._getNotificationColor(notification.type_notification);
        const timeAgo = this._getTimeAgo(notification.date_creation);
        
        return `
            <div class="notification-item ${notification.lu ? '' : 'unread'}" data-id="${notification.id_notification}">
                <i class="fas ${icon} notification-icon ${color}"></i>
                <div class="notification-content">
                    <p>${notification.titre}</p>
                    <small>${timeAgo}</small>
                    ${!notification.lu ? `
                        <button class="btn-marquer-lu" onclick="window.tableauDeBord.markNotificationAsRead(${notification.id_notification})" title="Marquer comme lu">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Retourne l'icône pour un type de notification
     * @private
     */
    _getNotificationIcon(type) {
        const icons = {
            'nouvelle_enquete': 'fa-plus-circle',
            'enquete_mecontent': 'fa-exclamation-triangle',
            'rapport_mensuel': 'fa-chart-line',
            'alerte_systeme': 'fa-bell'
        };
        return icons[type] || 'fa-bell';
    }

    /**
     * Retourne la couleur pour un type de notification
     * @private
     */
    _getNotificationColor(type) {
        const colors = {
            'nouvelle_enquete': 'success',
            'enquete_mecontent': 'warning',
            'rapport_mensuel': 'info',
            'alerte_systeme': 'danger'
        };
        return colors[type] || 'info';
    }

    /**
     * Calcule le temps écoulé depuis une date
     * @private
     */
    _getTimeAgo(dateString) {
        const now = new Date();
        const notificationDate = new Date(dateString);
        const diffMs = now - notificationDate;
        
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'À l\'instant';
        if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        
        return notificationDate.toLocaleDateString('fr-FR');
    }

    /**
     * Configure les event listeners pour les notifications
     * @private
     */
    _setupNotificationEventListeners() {
        // Bouton "Tout marquer lu"
        const markAllReadBtn = document.getElementById('markAllRead');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => this.markAllNotificationsAsRead());
        }

        // Gestion du dropdown
        this._setupNotificationDropdown();
    }

    /**
     * Configure le dropdown des notifications
     * @private
     */
    _setupNotificationDropdown() {
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        const notificationsMenu = document.getElementById('notificationsMenu');
        
        if (notificationsDropdown) {
            notificationsDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Fermeture du dropdown
        document.addEventListener('click', (e) => {
            if (notificationsMenu && !notificationsDropdown?.contains(e.target)) {
                this._hideDropdown(notificationsMenu);
            }
        });
    }

    /**
     * Marque une notification comme lue
     */
    async markNotificationAsRead(idNotification) {
        try {
            const response = await apiCall(`/notifications/${idNotification}/lue`, {
                method: 'PUT'
            });

            if (response.succes) {
                this._updateLocalNotification(idNotification);
                this.notificationsNonLues = Math.max(0, this.notificationsNonLues - 1);
                
                this._updateNotificationBadge();
                this._displayNotificationsInDropdown();
                
                console.log(`✅ Notification ${idNotification} marquée comme lue`);
            }
        } catch (error) {
            console.error('❌ Erreur marquage notification:', error);
            this.showNotification('Erreur lors du marquage de la notification', 'error');
        }
    }

    /**
     * Met à jour une notification localement
     * @private
     */
    _updateLocalNotification(idNotification) {
        const notification = this.notifications.find(n => n.id_notification === idNotification);
        if (notification) {
            notification.lu = true;
        }
    }

    /**
     * Marque toutes les notifications comme lues
     */
    async markAllNotificationsAsRead() {
        try {
            const response = await apiCall('/notifications/toutes-lues', {
                method: 'PUT'
            });

            if (response.succes) {
                this.notifications.forEach(notification => {
                    notification.lu = true;
                });
                this.notificationsNonLues = 0;
                
                this._updateNotificationBadge();
                this._displayNotificationsInDropdown();
                
                this.showNotification(`${response.nombreMarquees} notifications marquées comme lues`, 'success');
                console.log(`✅ ${response.nombreMarquees} notifications marquées comme lues`);
            }
        } catch (error) {
            console.error('❌ Erreur marquage toutes notifications:', error);
            this.showNotification('Erreur lors du marquage des notifications', 'error');
        }
    }

    /**
     * Programme les mises à jour automatiques des notifications
     * @private
     */
    _scheduleNotificationUpdates() {
        this.notificationsInterval = setInterval(async () => {
            try {
                const response = await apiCall('/notifications/updates');
                
                if (response.succes) {
                    const oldCount = this.notificationsNonLues;
                    const newCount = response.data.compteur;
                    
                    if (newCount > oldCount) {
                        console.log(`🔔 ${newCount - oldCount} nouvelles notifications reçues`);
                        
                        await this.loadNotifications();
                        this.showNotification(`${newCount - oldCount} nouvelle(s) notification(s)`, 'info');
                        this._playNotificationSound();
                    }
                    
                    this.notificationsNonLues = newCount;
                    this._updateNotificationBadge();
                }
            } catch (error) {
                console.error('❌ Erreur mise à jour automatique notifications:', error);
            }
        }, 30000);
    }

    /**
     * Joue un son de notification
     * @private
     */
    _playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Son de notification non disponible');
        }
    }

    // ========================================
    // GESTION DES STATISTIQUES ET GRAPHIQUES
    // ========================================

    /**
     * Met à jour l'affichage des statistiques
     * @private
     */
    _updateStatisticsDisplay(data) {
        console.log('📊 Mise à jour des statistiques:', data);
        
        this._updateMainStatistics(data);
        this._updateTrends(data.tendances);
        
        console.log('✅ Statistiques mises à jour');
    }

    /**
     * Met à jour les statistiques principales
     * @private
     */
    _updateMainStatistics(data) {
        const elements = {
            totalEnquetes: data.totalEnquetes?.toLocaleString() || '0',
            tauxSatisfaction: `${data.satisfactionMoyenne || 0}%`,
            tauxInsatisfaction: `${data.insatisfactionMoyenne || 0}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * Met à jour les tendances
     * @private
     */
    _updateTrends(tendances) {
        if (!tendances) return;

        const trends = {
            tendanceEnquetes: tendances.enquetes || 12,
            tendanceSatisfaction: tendances.satisfaction || 5,
            tendanceInsatisfaction: tendances.insatisfaction || -3
        };

        Object.entries(trends).forEach(([id, value]) => {
            this._updateTrendDisplay(id, value);
        });
    }

    /**
     * Met à jour l'affichage d'une tendance
     * @private
     */
    _updateTrendDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = `${value > 0 ? '+' : ''}${value}%`;
        
        const parentElement = element.closest('.stat-trend');
        if (parentElement) {
            const isPositive = (elementId === 'tendanceInsatisfaction') ? value <= 0 : value >= 0;
            parentElement.className = `stat-trend ${isPositive ? 'positive' : 'negative'}`;
            
            const icon = parentElement.querySelector('i');
            if (icon) {
                const direction = isPositive ? 'up' : 'down';
                icon.className = `fas fa-arrow-${direction}`;
            }
        }
    }

    /**
     * Rend les graphiques
     * @private
     */
    async _renderCharts(data) {
        try {
            if (typeof Chart === 'undefined') {
                throw new Error('Chart.js n\'est pas disponible');
            }

            console.log('📈 Création des graphiques');

            this._destroyExistingCharts();
            
            const chartData = this._prepareChartData(data);
            
            await Promise.all([
                this._createLineChart(chartData.monthly),
                this._createDoughnutChart(chartData.satisfaction)
            ]);
            
            console.log('✅ Graphiques créés');

        } catch (error) {
            console.error('❌ Erreur création graphiques:', error);
            this.showNotification('Erreur lors de la création des graphiques', 'error');
        }
    }

    /**
     * Détruit les graphiques existants
     * @private
     */
    _destroyExistingCharts() {
        if (this.chartLine) {
            this.chartLine.destroy();
            this.chartLine = null;
        }
        if (this.chartDoughnut) {
            this.chartDoughnut.destroy();
            this.chartDoughnut = null;
        }
    }

    /**
     * Prépare les données pour les graphiques
     * @private
     */
    _prepareChartData(data) {
        const monthly = this._prepareMonthlyData(data.mensuelles);
        const satisfaction = {
            satisfaits: data.satisfactionMoyenne || 75,
            insatisfaits: data.insatisfactionMoyenne || 25
        };

        return { monthly, satisfaction };
    }

    /**
     * Prépare les données mensuelles
     * @private
     */
    _prepareMonthlyData(mensuelles) {
        if (mensuelles && mensuelles.length > 0) {
            return {
                labels: mensuelles.map(m => this._formatMonthLabel(m)),
                values: mensuelles.map(m => m.nombre_enquetes || 0)
            };
        }

        return this._generateDefaultMonthlyChartData();
    }

    /**
     * Formate le label d'un mois
     * @private
     */
    _formatMonthLabel(monthData) {
        const monthNames = {
            1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Jun',
            7: 'Jul', 8: 'Aoû', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc'
        };
        return `${monthNames[monthData.mois] || monthData.mois} ${monthData.annee}`;
    }

    /**
     * Génère des données mensuelles par défaut pour le graphique
     * @private
     */
    _generateDefaultMonthlyChartData() {
        const now = new Date();
        const labels = [];
        const values = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            
            const monthNames = [
                'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
            ];
            
            labels.push(`${monthNames[date.getMonth()]} ${date.getFullYear()}`);
            values.push(Math.floor(Math.random() * 30) + 10);
        }
        
        return { labels, values };
    }

    /**
     * Crée le graphique linéaire
     * @private
     */
    async _createLineChart(monthlyData) {
        const ctxLine = document.getElementById('chartEnquetesMois')?.getContext('2d');
        if (!ctxLine) return;

        this.chartLine = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Enquêtes',
                    data: monthlyData.values,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointBackgroundColor: '#007bff',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        
        console.log('✅ Graphique linéaire créé');
    }

    /**
     * Crée le graphique en anneau
     * @private
     */
    async _createDoughnutChart(satisfactionData) {
        const ctxDoughnut = document.getElementById('chartSatisfaction')?.getContext('2d');
        if (!ctxDoughnut) return;

        this.chartDoughnut = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: ['Satisfaits', 'Insatisfaits'],
                datasets: [{
                    data: [satisfactionData.satisfaits, satisfactionData.insatisfaits],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderColor: ['#ffffff', '#ffffff'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed + '%';
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Graphique en anneau créé');
    }

    // ========================================
    // UTILITAIRES DE FORMATAGE
    // ========================================

    /**
     * Formate une date
     * @private
     */
    _formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Formate une heure
     * @private
     */
    _formatTime(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Formate date et heure pour l'export
     * @private
     */
    _formatDateTime(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Retourne la couleur de fond pour une raison de présence
     * @private
     */
    _getRaisonColor(raison) {
        const colors = {
            'Information': '#e0f2fe',
            'Prise de sang (Bilan)': '#f3e5f5',
            'Retrait de résultat': '#e8f5e8'
        };
        return colors[raison] || '#f5f5f5';
    }

    /**
     * Retourne la couleur de texte pour une raison de présence
     * @private
     */
    _getRaisonTextColor(raison) {
        const colors = {
            'Information': '#0277bd',
            'Prise de sang (Bilan)': '#7b1fa2',
            'Retrait de résultat': '#388e3c'
        };
        return colors[raison] || '#616161';
    }

    // ========================================
    // GESTION DE L'INTERFACE UTILISATEUR
    // ========================================

    /**
     * Affiche ou cache l'overlay de chargement
     * @private
     */
    _showLoading(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.toggle('hidden', !show);
        }
    }

    /**
     * Affiche une notification à l'utilisateur
     */
    showNotification(message, type = 'info') {
        // Utiliser la fonction globale si disponible
        if (typeof showNotification !== 'undefined') {
            showNotification(message, type);
            return;
        }

        // Fallback avec notification simple
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        const notification = this._createNotificationElement(message, type);
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Crée un élément de notification
     * @private
     */
    _createNotificationElement(message, type) {
        const notification = document.createElement('div');
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            background: ${colors[type] || colors.info};
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        `;
        
        notification.textContent = message;
        return notification;
    }

    // ========================================
    // GESTION DE L'AUTHENTIFICATION
    // ========================================

    /**
     * Déconnecte l'utilisateur
     */
    async logout() {
        try {
            // Tentative de déconnexion via API
            if (typeof apiCall !== 'undefined') {
                await apiCall('/auth/deconnexion', { method: 'POST' });
            }
        } catch (e) {
            console.warn('Déconnexion API échouée (ignorée):', e.message);
        }
        
        // Nettoyage local
        this._cleanInvalidData();
        this.showNotification('Déconnexion réussie', 'success');
        
        // Redirection
        setTimeout(() => {
            window.location.href = '../connexion-admin/index.html';
        }, 800);
    }

    // ========================================
    // MÉTHODES PUBLIQUES POUR COMPATIBILITÉ
    // ========================================

    /**
     * Aliases pour maintenir la compatibilité avec l'ancien code
     */
    
    // Méthodes d'enquêtes
    chargerEnquetes() { return this.loadSurveys(); }
    filtrerEnquetes() { return this.filterSurveys(); }
    afficherEnquetes() { return this.displaySurveys(); }
    voirDetails(id) { return this.viewSurveyDetails(id); }
    supprimerEnquete(id) { return this.deleteSurvey(id); }
    
    // Méthodes de données
    chargerDonnees() { return this.loadDashboardData(); }
    actualiserDonnees() { return this.refreshData(); }
    exporterDonnees() { return this.exportData(); }
    
    // Méthodes de notifications
    chargerNotifications() { return this.loadNotifications(); }
    marquerNotificationCommeLue(id) { return this.markNotificationAsRead(id); }
    marquerToutesNotificationsCommeLues() { return this.markAllNotificationsAsRead(); }
    
    // Méthodes de pagination
    changerPage(direction) { return this.changePage(direction); }
    allerAPage(page) { return this.goToPage(page); }
    
    // Méthodes d'authentification
    deconnexion() { return this.logout(); }

    // ========================================
    // NETTOYAGE ET DESTRUCTION
    // ========================================

    /**
     * Nettoie les ressources et détruit l'instance
     */
    destroy() {
        console.log('🧹 Nettoyage du tableau de bord...');
        
        // Nettoyer les intervalles
        this._clearIntervals();
        
        // Détruire les graphiques
        this._destroyExistingCharts();
        
        // Marquer comme non initialisé
        this.isInitialized = false;
        
        console.log('✅ Tableau de bord nettoyé');
    }

    /**
     * Nettoie tous les intervalles
     * @private
     */
    _clearIntervals() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        if (this.notificationsInterval) {
            clearInterval(this.notificationsInterval);
            this.notificationsInterval = null;
        }
    }
}

// ========================================
// STYLES CSS POUR LES NOTIFICATIONS
// ========================================

const notificationStyles = `
    <style>
    .notification-pulse {
        animation: pulse 1s ease-in-out;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    
    .notification-item {
        display: flex;
        align-items: flex-start;
        padding: 0.75rem 1rem;
        border-left: 3px solid transparent;
        transition: all 0.2s ease;
        position: relative;
    }
    
    .notification-item.unread {
        background-color: #f0f9ff;
        border-left-color: #3b82f6;
    }
    
    .notification-item:hover {
        background-color: #f9fafb;
    }
    
    .notification-icon {
        margin-right: 0.75rem;
        margin-top: 0.125rem;
        font-size: 1rem;
    }
    
    .notification-icon.success { color: #10b981; }
    .notification-icon.warning { color: #f59e0b; }
    .notification-icon.info { color: #3b82f6; }
    .notification-icon.danger { color: #ef4444; }
    
    .notification-content {
        flex: 1;
        position: relative;
    }
    
    .notification-content p {
        margin: 0 0 0.25rem 0;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
    }
    
    .notification-content small {
        color: #6b7280;
        font-size: 0.75rem;
    }
    
    .btn-marquer-lu {
        position: absolute;
        top: 0;
        right: 0;
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 0.25rem;
        transition: all 0.2s ease;
    }
    
    .btn-marquer-lu:hover {
        background-color: #f3f4f6;
        color: #10b981;
    }
    
    .notification-item.empty {
        text-align: center;
        padding: 2rem 1rem;
        color: #6b7280;
    }
    
    .notification-item.empty p {
        margin: 0;
        font-style: italic;
    }
    </style>
`;

// Ajouter les styles au document
if (typeof document !== 'undefined') {
    document.head.insertAdjacentHTML('beforeend', notificationStyles);
}

// ========================================
// FONCTIONS GLOBALES POUR COMPATIBILITÉ
// ========================================

/**
 * Fonctions globales maintenues pour la compatibilité avec l'ancien code
 */

function filtrerEnquetes() {
    if (window.tableauDeBord) {
        window.tableauDeBord.filterSurveys();
    }
}

function changerPage(direction) {
    if (window.tableauDeBord) {
        window.tableauDeBord.changePage(direction);
    }
}

function allerAPage(page) {
    if (window.tableauDeBord) {
        window.tableauDeBord.goToPage(page);
    }
}

// ========================================
// INITIALISATION GLOBALE
// ========================================

/**
 * Fonction d'initialisation principale
 */
function initTableauDeBord() {
    try {
        console.log('🚀 Initialisation du tableau de bord...');
        
        // Créer l'instance globale
        window.tableauDeBord = new TableauDeBord();
        
        console.log('✅ Instance du tableau de bord créée');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        
        // Affichage d'erreur à l'utilisateur
        if (typeof document !== 'undefined') {
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #fee;
                color: #c53030;
                padding: 1rem 2rem;
                border-radius: 0.5rem;
                border: 1px solid #fecaca;
                z-index: 10000;
                font-weight: 500;
            `;
            errorMsg.textContent = 'Erreur lors du chargement du tableau de bord';
            document.body.appendChild(errorMsg);
            
            setTimeout(() => {
                if (errorMsg.parentNode) {
                    errorMsg.parentNode.removeChild(errorMsg);
                }
            }, 5000);
        }
    }
}

// ========================================
// GESTION DES ÉVÉNEMENTS GLOBAUX
// ========================================

/**
 * Initialisation automatique basée sur l'état du DOM
 */
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTableauDeBord);
    } else {
        initTableauDeBord();
    }

    /**
     * Nettoyage automatique avant fermeture/rechargement
     */
    window.addEventListener('beforeunload', () => {
        if (window.tableauDeBord && window.tableauDeBord.isInitialized) {
            window.tableauDeBord.destroy();
        }
    });

    /**
     * Gestion globale des erreurs JavaScript
     */
    window.addEventListener('error', (event) => {
        console.error('Erreur JavaScript globale:', event.error);
        
        if (window.tableauDeBord && typeof window.tableauDeBord.showNotification === 'function') {
            window.tableauDeBord.showNotification('Une erreur s\'est produite', 'error');
        }
    });

    /**
     * Gestion des promesses rejetées non capturées
     */
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Promesse rejetée non gérée:', event.reason);
        
        if (window.tableauDeBord && typeof window.tableauDeBord.showNotification === 'function') {
            window.tableauDeBord.showNotification('Erreur de connexion', 'error');
        }
    });
}

// ========================================
// EXPORT POUR MODULES (SI SUPPORTÉ)
// ========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TableauDeBord, initTableauDeBord };
}

if (typeof window !== 'undefined') {
    window.TableauDeBord = TableauDeBord;
    window.initTableauDeBord = initTableauDeBord;
}