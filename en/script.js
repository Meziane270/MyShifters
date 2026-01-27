document.addEventListener('DOMContentLoaded', function() {
    // ================== CONFIGURATION ==================
    const currentLang = document.documentElement.lang || 'en';

    const CONFIG = {
        TIME: {
            defaultStart: '07:00',
            defaultEnd: '07:00',
            defaultStartAmPm: 'AM',
            defaultEndAmPm: 'PM'
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

    // Language-specific text - ENGLISH VERSION
    const TEXT = {
        validation: {
            required: ' is required',
            invalid: {
                phone: 'Invalid phone number',
                email: 'Invalid email address',
                dates: 'Please select at least one date'
            },
            selectPlaceholder: {
                start: '-- Start Time --',
                end: '-- End Time --'
            },
            noDates: 'No dates selected'
        },
        submission: {
            sending: 'Sending...',
            success: '✅ Request sent! Our team will call you within 15 minutes.',
            error: {
                validation: 'Please correct the errors in the form.',
                service: 'Sending service is unavailable. Please try again later.',
                timeout: 'Timeout exceeded',
                server: 'Error during server validation.',
                generic: 'An error occurred while sending.'
            }
        },
        // Service labels are used for the EmailJS template, which is in French
        serviceLabels: {
            'reception': 'Réception / Accueil',
            'housekeeping': 'Housekeeping / Femme de chambre',
            'maintenance': 'Maintenance Technique',
            'restauration': 'Restauration & Service en Salle',
            'autre': 'Autre'
        }
    };

    const FIELD_LABELS = {
        contact_name: 'Contact Name',
        contact_phone: 'Phone Number',
        contact_email: 'Email Address',
        position: 'Position',
        hotel_name: 'Hotel Name',
        hotel_address: 'Hotel Address',
        city: 'City',
        department: 'Department',
        serviceType: 'Service Type',
        shiftStart: 'Shift Start',
        shiftEnd: 'Shift End',
        message: 'Message',
        pms: 'PMS',
        company_website: 'Company Website'
    };

    // ================== CORE LOGIC INTEGRATION ==================

    // Function to get the 24h time from the 12h select and AM/PM radio buttons (English version)
    const getShiftTime24h = (fieldPrefix) => {
        const timeSelect = document.querySelector(`[name="${fieldPrefix}"]`);
        if (!timeSelect || !timeSelect.value) return '';

        const ampm = document.querySelector(`input[name="${fieldPrefix}AmPm"]:checked`)?.value || 'AM';
        return window.convert12hTo24h(timeSelect.value, ampm);
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
        dateLocale: 'en-US',
        flatpickrLocale: 'en',
        getShiftTime24h: getShiftTime24h,
        getShiftTimeFrench: getShiftTimeFrench,
        serviceLabels: TEXT.serviceLabels,
        formLanguageName: 'English',
        fieldLabels: FIELD_LABELS
    });
});
