document.addEventListener('DOMContentLoaded', function() {
    const currentLang = 'fr';

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

    // ================== TEXTE FRANÇAIS ==================
    const TEXT = {
        validation: {
            required: {
                masculine: ' est requis',
                feminine: ' est requise',
                plural: ' sont requis', // Changé pour "sont requis" (masculin pluriel pour Nom et Prénom)
                default: ' est requis'
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

    // Labels français SANS articles
    const FIELD_LABELS = {
        contact_name: 'nom et prénom',
        contact_phone: 'numéro de téléphone',
        contact_email: 'adresse email',
        position: 'fonction',
        hotel_name: 'nom de l\'hôtel',
        hotel_address: 'adresse de l\'hôtel',
        city: 'ville',
        department: 'département',
        serviceType: 'type de service',
        shiftStart: 'heure de début',
        shiftEnd: 'heure de fin',
        message: 'message',
        pms: 'PMS',
        company_website: 'site web de l\'entreprise',
        bookingDates: 'dates de réservation'
    };

    // Genre de chaque champ pour la gestion du masculin/féminin
    const FIELD_GENDERS = {
        contact_name: 'plural',        // "Nom et prénom" -> pluriel
        contact_phone: 'masculine',
        contact_email: 'feminine',
        position: 'feminine',
        hotel_name: 'masculine',
        hotel_address: 'feminine',
        city: 'feminine',
        department: 'masculine',
        serviceType: 'masculine',
        shiftStart: 'feminine',
        shiftEnd: 'feminine',
        message: 'masculine',
        pms: 'masculine',
        company_website: 'masculine',
        bookingDates: 'plural'
    };

    // ================== FONCTIONS DE TEMPS ==================
    const getShiftTimeFrench = (fieldPrefix) => {
        const field = document.querySelector(`[name="${fieldPrefix}"]`);
        if (!field) return '';
        const time24h = field.value;
        if (!time24h) return '';

        if (typeof window.convert24hToFrench === 'function') {
            return window.convert24hToFrench(time24h);
        }
        const [hours, minutes] = time24h.split(':');
        return `${hours}h${minutes === '00' ? '00' : minutes}`;
    };

    const getShiftTime24h = (fieldPrefix) => {
        const field = document.querySelector(`[name="${fieldPrefix}"]`);
        return field ? field.value : '';
    };

    // Génération des options d'horaires (24h) pour le français
    function generateTimeOptions24h(selectId, defaultValue) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const isStart = selectId === 'shiftStart';
        const placeholder = isStart ? TEXT.validation.selectPlaceholder.start : TEXT.validation.selectPlaceholder.end;

        select.innerHTML = `<option value="">${placeholder}</option>`;

        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const time24h = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const displayTime = `${hour.toString().padStart(2, '0')}h${minute.toString().padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = time24h;
                option.textContent = displayTime;

                if (time24h === defaultValue) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        }
    }

    // ================== PERSONNALISATION FRANÇAISE ==================

    // Surcharge pour ajouter les articles (Le/La/L'/Les) devant les labels
    const getFieldLabelWithArticle = function(fieldName) {
        const baseLabel = FIELD_LABELS[fieldName] || fieldName;
        const gender = FIELD_GENDERS[fieldName];
        if (!gender) return baseLabel;

        let labelWithArticle = baseLabel;
        if (gender === 'feminine') {
            if (/^(adresse|heure)/i.test(baseLabel)) labelWithArticle = `L'${baseLabel}`;
            else labelWithArticle = `La ${baseLabel}`;
        } else if (gender === 'masculine') {
            if (/^[aeiouéèêàâh]/i.test(baseLabel)) labelWithArticle = `L'${baseLabel}`;
            else labelWithArticle = `Le ${baseLabel}`;
        } else if (gender === 'plural') {
            if (/^[aeiouéèêàâh]/i.test(baseLabel)) labelWithArticle = `L'${baseLabel}`; // Pour "Heures" par ex
            else labelWithArticle = `Le ${baseLabel}`; // Pour "Nom et prénom", on garde "Le" ou on peut forcer "Le"

            // Cas spécifique pour "nom et prénom"
            if (fieldName === 'contact_name') labelWithArticle = "Le nom et prénom";
            else if (fieldName === 'bookingDates') labelWithArticle = "Les dates de réservation";
        }

        // Capitaliser la première lettre pour le message d'erreur
        return labelWithArticle.charAt(0).toUpperCase() + labelWithArticle.slice(1);
    };

    // Surcharge pour gérer l'accord de l'adjectif "requis"
    const getRequiredSuffixByGender = function(fieldName) {
        const gender = FIELD_GENDERS[fieldName];
        switch(gender) {
            case 'feminine': return TEXT.validation.required.feminine;
            case 'plural': return TEXT.validation.required.plural;
            default: return TEXT.validation.required.masculine;
        }
    };

    // ================== INITIALISATION ==================
    function init() {
        if (typeof window.initUnifiedForm !== 'function') {
            setTimeout(init, 100);
            return;
        }

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
            fieldLabels: FIELD_LABELS,
            getFieldLabel: getFieldLabelWithArticle,
            getRequiredSuffix: getRequiredSuffixByGender
        });

        // Rétablir les sélecteurs d'horaires
        generateTimeOptions24h('shiftStart', CONFIG.TIME.defaultStart);
        generateTimeOptions24h('shiftEnd', CONFIG.TIME.defaultEnd);
    }

    init();
});
