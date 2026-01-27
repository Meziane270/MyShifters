document.addEventListener('DOMContentLoaded', function() {
    // ================== CONFIGURATION ==================
    const currentLang = document.documentElement.lang || 'fr';

    const CONFIG = {
        TIME: {
            defaultStart: '07:30',
            defaultEnd: '19:30'
        },
        REGEX: {
            phone: /^[+]?[\d\s()-]{7,}$/,
            phoneStrict: /^\+?\d{6,15}$/,
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        },
        EMAILJS: {
            serviceId: 'service_xv852rb',
            templateId: 'template_hr02khn',
            publicKey: window.__ENV__?.EMAILJS_PUBLIC_KEY
        }
    };

    // Language-specific text - FRENCH VERSION
    const TEXT = {
        validation: {
            required: {
                masculine: ' est requis',
                feminine: ' est requise'
            },
            invalid: {
                phone: 'Numéro de téléphone invalide',
                email: 'Adresse email invalide',
                dates: 'Veuillez sélectionner au moins une date'
            },
            selectPlaceholder: {
                start: '-- Heure début --',
                end: '-- Heure fin --'
            },
            noDates: 'Aucune date sélectionnée'
        },
        submission: {
            sending: 'Envoi en cours...',
            success: '✅ Demande envoyée ! Notre équipe vous appelle dans les 15 minutes.',
            error: {
                validation: 'Veuillez corriger les erreurs dans le formulaire.',
                service: 'Le service d\'envoi est indisponible. Veuillez réessayer plus tard.',
                timeout: 'Délai d\'attente dépassé',
                server: 'Erreur lors de la validation par le serveur.',
                generic: 'Une erreur est survenue lors de l\'envoi.'
            }
        },
        serviceLabels: {
            reception: 'Réception / Accueil',
            housekeeping: 'Housekeeping / Femme de chambre',
            maintenance: 'Maintenance Technique',
            restauration: 'Restauration & Service en Salle',
            autre: 'Autre'
        }
    };

    const FIELD_LABELS = {
        contact_name: 'Nom et prénom',
        contact_phone: 'Numéro de téléphone',
        contact_email: 'Adresse email',
        position: 'Poste',
        hotel_name: 'Nom de l\'hôtel',
        hotel_address: 'Adresse de l\'hôtel',
        city: 'Ville',
        department: 'Département',
        serviceType: 'Type de service',
        shiftStart: 'Heure de début',
        shiftEnd: 'Heure de fin',
        message: 'Message',
        pms: 'PMS',
        company_website: 'Site web de l\'entreprise'
    };

    // ================== CORE LOGIC INTEGRATION ==================

    // Function to get the 24h time from the 24h select (French version)
    const getShiftTime24h = (fieldPrefix) => {
        const field = document.querySelector(`[name="${fieldPrefix}"]`);
        return field ? field.value : '';
    };

    // Function to format the 24h time to French format (e.g., 07:30 -> 07h30)
    const getShiftTimeFrench = (fieldPrefix) => {
        const time24h = getShiftTime24h(fieldPrefix);
        return window.convert24hToFrench(time24h);
    };

    window.initUnifiedForm({
        lang: currentLang,
        text: TEXT,
        config: CONFIG,
        dateLocale: 'fr-FR',
        flatpickrLocale: 'fr',
        getShiftTime24h: getShiftTime24h,
        getShiftTimeFrench: getShiftTimeFrench,
        serviceLabels: TEXT.serviceLabels,
        formLanguageName: 'Français',
        fieldLabels: FIELD_LABELS
    });
});
