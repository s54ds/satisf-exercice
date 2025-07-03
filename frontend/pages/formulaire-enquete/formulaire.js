// ========================================
// SCRIPT FORMULAIRE D'ENQUÊTE - VERSION CSP COMPATIBLE
// Fichier: frontend/pages/formulaire-enquete/formulaire.js
// ========================================
class FormulaireEnquete {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.formData = {};
        this.isSubmitting = false;
        this.isSubmitted = false; // AJOUT: Flag pour savoir si le formulaire a été soumis avec succès

        this.init();
    }

    /**
     * Initialise le formulaire
     */
    init() {
        this.setupEventListeners();
        this.loadServices();
        this.setupValidation();
        this.updateProgress();
        this.setDefaultDate();
    }

    /**
     * Configure les écouteurs d'événements - VERSION CSP COMPATIBLE
     */
    setupEventListeners() {
        const form = document.getElementById('enqueteForm');

        // Soumission du formulaire
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm();
        });

        // CORRECTION CSP: Utiliser les attributs data-action au lieu des onclick
        document.querySelectorAll('button[data-action]').forEach(button => {
            const action = button.getAttribute('data-action');
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                switch (action) {
                    case 'next':
                        this.nextStep();
                        break;
                    case 'prev':
                        this.prevStep();
                        break;
                    case 'reset':
                        this.resetForm();
                        break;
                    default:
                        console.warn('Action non reconnue:', action);
                }
            });
        });

        // AJOUT: Gestion des liens de navigation dans la confirmation
        document.querySelectorAll('a[href]').forEach(link => {
            link.addEventListener('click', (e) => {
                // Laisser les liens se comporter normalement
                console.log('Navigation vers:', link.href);
            });
        });

        // Validation en temps réel
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearError(input));
        });

        // Compteurs de caractères
        this.setupCharacterCounters();

        // Gestion du clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.target.matches('textarea')) {
                e.preventDefault();
                if (this.currentStep < this.totalSteps) {
                    this.nextStep();
                }
            }
        });
    }

    /**
     * Configure les compteurs de caractères
     */
    setupCharacterCounters() {
        const commentaires = document.getElementById('commentaires');
        const recommandations = document.getElementById('recommandations');
        
        if (commentaires) {
            commentaires.addEventListener('input', () => {
                this.updateCharCounter('commentaires', commentaires.value.length, 1000);
            });
        }
        
        if (recommandations) {
            recommandations.addEventListener('input', () => {
                this.updateCharCounter('recommandations', recommandations.value.length, 1000);
            });
        }
    }

    /**
     * Met à jour le compteur de caractères
     */
    updateCharCounter(fieldName, current, max) {
        const counter = document.getElementById(`${fieldName}-count`);
        if (counter) {
            counter.textContent = current;
            counter.style.color = current > max * 0.9 ? 'var(--warning-color)' : 'var(--gray-500)';
        }
    }

    /**
     * Définit la date et l'heure par défaut à aujourd'hui
     */
    setDefaultDate() {
        const dateInput = document.getElementById('dateVisite');
        const heureInput = document.getElementById('heureVisite');
        
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
            dateInput.max = today; // Empêche la sélection de dates futures
        }
        
        // AJOUT: Définir l'heure actuelle par défaut
        if (heureInput) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            heureInput.value = `${hours}:${minutes}`;
        }
    }

    /**
     * Charge la liste des services depuis l'API - VERSION CORRIGÉE AVEC DÉBOGAGE
     */
    async loadServices() {
        const serviceSelect = document.getElementById('serviceConcerne');
        
        console.log('🔍 Debug: serviceSelect found:', !!serviceSelect);
        
        if (!serviceSelect) {
            console.error('❌ Element serviceConcerne non trouvé !');
            return;
        }
        
        try {
            console.log('📡 Début du chargement des services...');
            
            // Affichage du loading
            serviceSelect.innerHTML = '<option value="">Chargement des services...</option>';
            serviceSelect.classList.add('loading');
            
            // Test si apiCall existe
            console.log('🔧 apiCall disponible:', typeof apiCall);
            
            let services;
            if (typeof apiCall === 'function') {
                console.log('📞 Appel API en cours vers /services...');
                services = await apiCall('/services');
                console.log('✅ Réponse API reçue:', services);
            } else {
                console.log('⚠️ apiCall non disponible, utilisation des services de test');
                // Simulation d'un délai pour tester
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                services = [
                    { nom: 'Accueil' },
                    { nom: 'Laboratoire' },
                    { nom: 'Radiologie' },
                    { nom: 'Consultation' },
                    { nom: 'Urgences' }
                ];
                console.log('📦 Services de test créés:', services);
            }
            
            // Gérer la réponse selon le format du backend
            const servicesData = services && services.succes ? services.data : services;
            console.log('📦 Données des services à traiter:', servicesData);
            console.log('📊 Type des données:', typeof servicesData);
            console.log('📈 Est un tableau:', Array.isArray(servicesData));
            
            // Vérification que servicesData est un tableau
            if (!Array.isArray(servicesData)) {
                throw new Error('Les données des services ne sont pas un tableau: ' + typeof servicesData);
            }
            
            console.log('📝 Nombre de services:', servicesData.length);
            
            // Vide les options existantes
            serviceSelect.innerHTML = '<option value="">Sélectionnez un service</option>';
            serviceSelect.classList.remove('loading');
            
            // Ajoute les services
            servicesData.forEach((service, index) => {
                console.log(`🏥 Service ${index}:`, service);
                
                // Vérification que le service a une propriété nom
                if (!service || !service.nom) {
                    console.warn(`⚠️ Service ${index} n'a pas de propriété 'nom':`, service);
                    return;
                }
                
                const option = document.createElement('option');
                option.value = service.nom;
                option.textContent = service.nom;
                serviceSelect.appendChild(option);
                
                console.log(`✅ Service ajouté: ${service.nom}`);
            });
            
            console.log('✅ Tous les services ajoutés. Options finales:', serviceSelect.children.length);
            
            // Vérification finale
            const finalOptions = Array.from(serviceSelect.options).map(opt => opt.value);
            console.log('🎯 Options finales dans le select:', finalOptions);
            
        } catch (error) {
            console.error('💥 Erreur lors du chargement des services:', error);
            console.error('📋 Stack trace:', error.stack);
            
            serviceSelect.innerHTML = '<option value="">Erreur de chargement</option>';
            serviceSelect.classList.remove('loading');
            
            // Fonction de fallback si showNotification n'existe pas
            if (typeof showNotification === 'function') {
                showNotification('Erreur lors du chargement des services', 'error');
            } else {
                console.warn('Erreur lors du chargement des services');
            }
        }
    }

    /**
     * Configure la validation du formulaire - VERSION MODIFIÉE
     */
    setupValidation() {
        // Règles de validation personnalisées
        this.validationRules = {
            dateVisite: {
                required: true,
                custom: (value) => {
                    const selectedDate = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (selectedDate > today) {
                        return 'La date ne peut pas être dans le futur';
                    }
                    
                    const oneYearAgo = new Date();
                    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                    
                    if (selectedDate < oneYearAgo) {
                        return 'La date ne peut pas être antérieure à un an';
                    }
                    
                    return null;
                }
            },
            heureVisite: {
                required: true
            },
            raisonPresence: {
                required: true
            },
            serviceConcerne: {
                required: true
            },
            nom: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-ZÀ-ÿ\s\-']+$/,
                patternMessage: 'Le nom ne doit contenir que des lettres, espaces, tirets et apostrophes'
            },
            // MODIFICATION: Prénom maintenant obligatoire
            prenom: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-ZÀ-ÿ\s\-']+$/,
                patternMessage: 'Le prénom ne doit contenir que des lettres, espaces, tirets et apostrophes'
            },
            // MODIFICATION: Validation téléphone ivoirien
            telephone: {
                required: true,
                pattern: /^(\+225\s?)?[0-9]{8,10}$/,
                patternMessage: 'Format de téléphone invalide (ex: +225 01234567 ou 01234567)'
            },
            // MODIFICATION: Email maintenant obligatoire avec validation renforcée
            email: {
                required: true,
                pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                patternMessage: 'Format d\'email invalide (ex: nom@domaine.com)'
            },
            satisfaction: {
                required: true
            },
            // MODIFICATION: Commentaires maintenant obligatoires
            commentaires: {
                required: true,
                minLength: 10,
                maxLength: 1000
            },
            // MODIFICATION: Recommandations maintenant obligatoires
            recommandations: {
                required: true,
                minLength: 10,
                maxLength: 1000
            }
        };
    }

    /**
     * Valide un champ spécifique
     */
    validateField(field) {
        const fieldName = field.name;
        const value = field.type === 'radio' ? 
            document.querySelector(`input[name="${fieldName}"]:checked`)?.value || '' : 
            field.value.trim();
        
        const rules = this.validationRules[fieldName];
        if (!rules) return true;

        // Efface les erreurs précédentes
        this.clearError(field);

        // Validation requis
        if (rules.required && !value) {
            this.showError(field, 'Ce champ est obligatoire');
            return false;
        }

        // Si le champ est vide et non requis, on passe la validation
        if (!value && !rules.required) {
            return true;
        }

        // Validation longueur minimale
        if (rules.minLength && value.length < rules.minLength) {
            this.showError(field, `Minimum ${rules.minLength} caractères requis`);
            return false;
        }

        // AJOUT: Validation longueur maximale
        if (rules.maxLength && value.length > rules.maxLength) {
            this.showError(field, `Maximum ${rules.maxLength} caractères autorisés`);
            return false;
        }

        // Validation pattern
        if (rules.pattern && !rules.pattern.test(value)) {
            this.showError(field, rules.patternMessage || 'Format invalide');
            return false;
        }

        // Validation personnalisée
        if (rules.custom) {
            const customError = rules.custom(value);
            if (customError) {
                this.showError(field, customError);
                return false;
            }
        }

        return true;
    }

    /**
     * Affiche une erreur pour un champ
     */
    showError(field, message) {
        const fieldName = field.name || field.getAttribute('name');
        const errorElement = document.getElementById(`${fieldName}-error`);
        
        if (errorElement) {
            errorElement.textContent = message;
        }
        
        // Ajoute la classe d'erreur au champ
        if (field.type === 'radio') {
            const radioContainer = field.closest('.satisfaction-options');
            if (radioContainer) {
                radioContainer.classList.add('error');
            }
        } else {
            field.classList.add('error');
        }
    }

    /**
     * Efface l'erreur d'un champ
     */
    clearError(field) {
        const fieldName = field.name || field.getAttribute('name');
        const errorElement = document.getElementById(`${fieldName}-error`);
        
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        // Retire la classe d'erreur du champ
        if (field.type === 'radio') {
            const radioContainer = field.closest('.satisfaction-options');
            if (radioContainer) {
                radioContainer.classList.remove('error');
            }
        } else {
            field.classList.remove('error');
        }
    }

    /**
     * Valide une étape complète
     */
    validateStep(stepNumber) {
        const step = document.querySelector(`[data-step="${stepNumber}"]`);
        if (!step) return false;
        
        const fields = step.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Validation spéciale pour les boutons radio
        const radioGroups = step.querySelectorAll('input[type="radio"][required]');
        const radioGroupNames = [...new Set(Array.from(radioGroups).map(r => r.name))];
        
        radioGroupNames.forEach(groupName => {
            const checkedRadio = step.querySelector(`input[name="${groupName}"]:checked`);
            if (!checkedRadio) {
                const firstRadio = step.querySelector(`input[name="${groupName}"]`);
                if (firstRadio) {
                    this.showError(firstRadio, 'Veuillez faire un choix');
                    isValid = false;
                }
            }
        });

        return isValid;
    }

    /**
     * Passe à l'étape suivante
     */
    nextStep() {
        console.log('🔄 NextStep appelé - Étape actuelle:', this.currentStep);
        
        if (!this.validateStep(this.currentStep)) {
            console.log('❌ Validation échouée pour l\'étape', this.currentStep);
            this.scrollToFirstError();
            return;
        }

        console.log('✅ Validation réussie, passage à l\'étape suivante');
        this.saveStepData();

        if (this.currentStep < this.totalSteps) {
            this.showStep(this.currentStep + 1);
        }
    }

    /**
     * Revient à l'étape précédente
     */
    prevStep() {
        console.log('🔄 PrevStep appelé - Étape actuelle:', this.currentStep);
        
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * Affiche une étape spécifique
     */
    showStep(stepNumber) {
        console.log(`🎯 Affichage de l'étape ${stepNumber}`);
        
        const currentStepElement = document.querySelector('.form-step.active');
        const nextStepElement = document.querySelector(`[data-step="${stepNumber}"]`);

        if (!nextStepElement || !currentStepElement) {
            console.error('❌ Éléments d\'étapes non trouvés', {
                current: !!currentStepElement,
                next: !!nextStepElement
            });
            return;
        }

        // Animation de sortie
        currentStepElement.classList.add(stepNumber > this.currentStep ? 'slide-out-left' : 'slide-out-right');
        
        setTimeout(() => {
            // Cache l'étape actuelle
            currentStepElement.classList.remove('active', 'slide-out-left', 'slide-out-right');
            
            // Affiche la nouvelle étape
            nextStepElement.classList.add('active');
            
            // Met à jour le numéro d'étape
            this.currentStep = stepNumber;
            this.updateProgress();
            
            // Scroll vers le haut (éviter le conflit avec utils.js)
            window.scroll({ top: 0, behavior: 'smooth' });
            
            // Focus sur le premier champ
            const firstInput = nextStepElement.querySelector('input, select, textarea');
            if (firstInput && !firstInput.disabled) {
                setTimeout(() => firstInput.focus(), 100);
            }
            
            console.log('✅ Étape affichée avec succès:', stepNumber);
        }, 150);
    }

    /**
     * Met à jour la barre de progression
     */
    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const currentStepSpan = document.getElementById('currentStep');
        const totalStepsSpan = document.getElementById('totalSteps');

        const progressPercentage = (this.currentStep / this.totalSteps) * 100;
        
        if (progressFill) {
            progressFill.style.width = `${progressPercentage}%`;
        }
        
        if (currentStepSpan) {
            currentStepSpan.textContent = this.currentStep;
        }
        
        if (totalStepsSpan) {
            totalStepsSpan.textContent = this.totalSteps;
        }
    }

    /**
     * Sauvegarde les données de l'étape actuelle
     */
    saveStepData() {
        const currentStepElement = document.querySelector('.form-step.active');
        if (!currentStepElement) return;
        
        // Collecte tous les champs de l'étape actuelle
        const fields = currentStepElement.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            if (field.type === 'radio') {
                if (field.checked) {
                    this.formData[field.name] = field.value;
                }
            } else if (field.type === 'checkbox') {
                if (field.checked) {
                    if (!this.formData[field.name]) {
                        this.formData[field.name] = [];
                    }
                    this.formData[field.name].push(field.value);
                }
            } else {
                this.formData[field.name] = field.value;
            }
        });
        
        console.log('💾 Données sauvegardées pour l\'étape', this.currentStep, ':', this.formData);
    }

    /**
     * Scroll vers la première erreur
     */
    scrollToFirstError() {
        const firstError = document.querySelector('.form-step.active .error');
        if (firstError) {
            firstError.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Focus sur le champ en erreur
            if (firstError.tagName === 'INPUT' || firstError.tagName === 'SELECT' || firstError.tagName === 'TEXTAREA') {
                setTimeout(() => firstError.focus(), 500);
            }
        }
    }

    /**
     * Soumet le formulaire - CHAMPS REQUIS MODIFIÉS
     */
    async submitForm() {
        if (this.isSubmitting) return;

        // Valide la dernière étape
        if (!this.validateStep(this.currentStep)) {
            this.scrollToFirstError();
            return;
        }

        // Sauvegarde les données de la dernière étape
        this.saveStepData();

        this.isSubmitting = true;
        
        try {
            // Affiche l'overlay de chargement
            this.showLoadingOverlay(true);
            
            // Prépare les données pour l'envoi avec débogage détaillé
            const submissionData = {
                ...this.formData,
                dateSubmission: new Date().toISOString(),
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            };

            console.log('📋 Données complètes à envoyer:', submissionData);
            console.log('📊 Clés des données:', Object.keys(submissionData));
            console.log('📝 Valeurs des données:', Object.values(submissionData));
            
            // MODIFICATION: Vérification des champs requis TOUS OBLIGATOIRES
            const requiredFields = {
                'dateVisite': submissionData.dateVisite,
                'heureVisite': submissionData.heureVisite, 
                'raisonPresence': submissionData.raisonPresence,
                'serviceConcerne': submissionData.serviceConcerne,
                'nom': submissionData.nom,
                'prenom': submissionData.prenom, // AJOUT: Prénom obligatoire
                'telephone': submissionData.telephone,
                'email': submissionData.email, // MODIFICATION: Email obligatoire
                'satisfaction': submissionData.satisfaction,
                'commentaires': submissionData.commentaires, // AJOUT: Commentaires obligatoires
                'recommandations': submissionData.recommandations // AJOUT: Recommandations obligatoires
            };
            
            console.log('🔍 Vérification champs requis:');
            Object.entries(requiredFields).forEach(([field, value]) => {
                console.log(`  ${field}: "${value}" (${typeof value}) - ${value ? '✅' : '❌'}`);
            });
            
            const missingFields = Object.entries(requiredFields)
                .filter(([field, value]) => !value || value === '')
                .map(([field]) => field);
            
            if (missingFields.length > 0) {
                console.error('❌ Champs manquants:', missingFields);
                throw new Error(`Champs requis manquants: ${missingFields.join(', ')}`);
            }
            
            console.log('✅ Tous les champs requis sont présents');

            // Envoi vers l'API
            let response;
            if (typeof apiCall === 'function') {
                console.log('📡 Envoi vers /enquetes...');
                response = await apiCall('/enquetes', {
                    method: 'POST',
                    body: JSON.stringify(submissionData)
                });
                console.log('📨 Réponse reçue:', response);
            } else {
                console.log('⚠️ apiCall non disponible, simulation');
                // Simulation pour test
                await new Promise(resolve => setTimeout(resolve, 2000));
                response = { success: true, id: Date.now() };
            }

            // Succès
            this.showConfirmation();
            
            // Analytics
            this.trackSubmission('success');
            
        } catch (error) {
            console.error('💥 Erreur lors de l\'envoi:', error);
            console.error('📋 Stack trace:', error.stack);
            
            this.showLoadingOverlay(false);
            
            if (typeof showNotification === 'function') {
                showNotification('Erreur lors de l\'envoi de l\'enquête. Veuillez réessayer.', 'error');
            } else {
                alert('Erreur lors de l\'envoi de l\'enquête. Veuillez réessayer.');
            }
            
            // Analytics
            this.trackSubmission('error', error.message);
            
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Affiche/masque l'overlay de chargement
     */
    showLoadingOverlay(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    }

    /**
     * Affiche le message de confirmation - VERSION CORRIGÉE
     */
    showConfirmation() {
        console.log('🎉 Affichage de la confirmation');
        
        const form = document.getElementById('enqueteForm');
        const confirmation = document.getElementById('confirmationMessage');
        const formHeader = document.querySelector('.form-header'); // AJOUT: Récupération de l'en-tête
        
        if (form && confirmation) {
            this.showLoadingOverlay(false);
            
            // IMPORTANT: Marquer que le formulaire a été soumis avec succès
            this.isSubmitted = true;
            
            // CORRECTION: Cache complètement le formulaire ET l'en-tête
            form.style.display = 'none';
            form.classList.add('hidden');
            
            // AJOUT: Cache l'en-tête du formulaire
            if (formHeader) {
                formHeader.style.display = 'none';
                formHeader.classList.add('hidden');
                console.log('✅ En-tête du formulaire masqué');
            }
            
            // Affiche la confirmation
            confirmation.style.display = 'block';
            confirmation.classList.remove('hidden');
            
            // Scroll vers le haut
            window.scroll({ top: 0, behavior: 'smooth' });
            
            console.log('✅ Confirmation affichée avec succès');
        } else {
            console.error('❌ Éléments de confirmation non trouvés', {
                form: !!form,
                confirmation: !!confirmation
            });
        }
    }

    /**
     * Remet le formulaire à zéro - VERSION CORRIGÉE
     */
    resetForm() {
        console.log('🔄 Reset du formulaire');
        
        // Réinitialise les données
        this.formData = {};
        this.currentStep = 1;
        this.isSubmitting = false;
        this.isSubmitted = false; // AJOUT: Reset du flag de soumission

        // Remet le formulaire à zéro
        const form = document.getElementById('enqueteForm');
        if (form) {
            form.reset();
        }

        // Remet la date par défaut
        this.setDefaultDate();

        // Efface les erreurs
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

        // Remet les compteurs à zéro
        document.querySelectorAll('[id$="-count"]').forEach(counter => {
            counter.textContent = '0';
            counter.style.color = 'var(--gray-500)';
        });

        // Affiche la première étape
        document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
        const firstStep = document.querySelector('[data-step="1"]');
        if (firstStep) {
            firstStep.classList.add('active');
        }

        // Met à jour la progression
        this.updateProgress();

        // CORRECTION: Cache la confirmation et affiche le formulaire ET l'en-tête
        const confirmation = document.getElementById('confirmationMessage');
        const formHeader = document.querySelector('.form-header');
        
        if (confirmation) {
            confirmation.style.display = 'none';
            confirmation.classList.add('hidden');
        }
        
        if (form) {
            form.style.display = 'block';
            form.classList.remove('hidden');
        }
        
        // AJOUT: Affiche l'en-tête du formulaire
        if (formHeader) {
            formHeader.style.display = 'block';
            formHeader.classList.remove('hidden');
            console.log('✅ En-tête du formulaire affiché');
        }

        // Scroll vers le haut
        window.scroll({ top: 0, behavior: 'smooth' });
        
        console.log('✅ Formulaire réinitialisé avec succès');
    }

    /**
     * Suit les soumissions pour les analytics
     */
    trackSubmission(status, errorMessage = null) {
        const trackingData = {
            event: 'form_submission',
            status: status,
            form_type: 'enquete_satisfaction',
            step_completed: this.currentStep,
            total_steps: this.totalSteps,
            timestamp: new Date().toISOString()
        };

        if (errorMessage) {
            trackingData.error = errorMessage;
        }

        // Envoie vers le système d'analytics (si disponible)
        if (typeof gtag !== 'undefined') {
            gtag('event', trackingData.event, trackingData);
        }

        console.log('Form tracking:', trackingData);
    }
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation du formulaire d\'enquête...');
    window.formulaireEnquete = new FormulaireEnquete();
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur JavaScript:', event.error);
    
    if (typeof showNotification === 'function') {
        showNotification('Une erreur inattendue s\'est produite', 'error');
    }
});

// Gestion de la fermeture de la page - VERSION CORRIGÉE
window.addEventListener('beforeunload', (event) => {
    // Ne pas afficher l'alerte si le formulaire a été soumis avec succès
    if (window.formulaireEnquete && 
        window.formulaireEnquete.currentStep > 1 && 
        !window.formulaireEnquete.isSubmitting &&
        !window.formulaireEnquete.isSubmitted) { // AJOUT: Vérifier que le formulaire n'a pas été soumis
        event.preventDefault();
        event.returnValue = 'Êtes-vous sûr de vouloir quitter ? Vos données ne seront pas sauvegardées.';
    }
});