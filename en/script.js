document.addEventListener('DOMContentLoaded', function() {
    // ================== CONFIGURATION ==================
    const currentLang = 'en';

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
            publicKey: window.__ENV__?.EMAILJS_PUBLIC_KEY || "3d1G_24v013gRjTFO"
        }
    };

    // Language-specific text - ENGLISH VERSION
    const TEXT = {
        validation: {
            required: {
                default: ' is required'
            },
            invalid: {
                phone: 'Invalid phone number',
                email: 'Invalid email address',
                dates: 'Please select at least one date'
            },
            selectPlaceholder: {
                start: '-- Start time --',
                end: '-- End time --'
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

    // ================== TIME FUNCTIONS FOR ENGLISH VERSION ==================

    // Function to get 24h time from 12h select + AM/PM radio buttons
    const getShiftTime24h = (fieldPrefix) => {
        const timeSelect = document.querySelector(`[name="${fieldPrefix}"]`);
        if (!timeSelect || !timeSelect.value) return '';

        const ampm = document.querySelector(`input[name="${fieldPrefix}AmPm"]:checked`)?.value || 'AM';
        return window.convert12hTo24h(timeSelect.value, ampm);
    };

    // Function to format 24h time to French format (07:30 -> 07h30)
    // This is used for the EmailJS template which expects French format
    const getShiftTimeFrench = (fieldPrefix) => {
        const time24h = getShiftTime24h(fieldPrefix);
        return window.convert24hToFrench(time24h);
    };

    // Function to generate time options for English version (12h format)
    function generateTimeOptions12h(selectId, defaultValue) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const isStart = selectId === 'shiftStart';
        const placeholder = isStart ? TEXT.validation.selectPlaceholder.start : TEXT.validation.selectPlaceholder.end;

        select.innerHTML = `<option value="">${placeholder}</option>`;

        // Generate 12h options (1:00 to 12:45)
        for (let hour = 1; hour <= 12; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const displayTime = `${hour}:${minute.toString().padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = displayTime;
                option.textContent = displayTime;

                if (displayTime === defaultValue) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        }
    }

    // Initialize time selects for English version
    function initializeEnglishTimeSelects() {
        generateTimeOptions12h('shiftStart', CONFIG.TIME.defaultStart);
        generateTimeOptions12h('shiftEnd', CONFIG.TIME.defaultEnd);

        // Set default AM/PM values
        const startAmPm = document.querySelector(`input[name="shiftStartAmPm"][value="${CONFIG.TIME.defaultStartAmPm}"]`);
        const endAmPm = document.querySelector(`input[name="shiftEndAmPm"][value="${CONFIG.TIME.defaultEndAmPm}"]`);

        if (startAmPm) startAmPm.checked = true;
        if (endAmPm) endAmPm.checked = true;
    }

    // ================== INITIALIZE FORM ==================

    function init() {
        if (typeof window.initUnifiedForm !== 'function') {
            setTimeout(init, 100);
            return;
        }

        window.initUnifiedForm({
            lang: currentLang,
            text: TEXT,
            config: CONFIG,
            dateLocale: 'en',
            flatpickrLocale: 'default',
            getShiftTime24h: getShiftTime24h,
            getShiftTimeFrench: getShiftTimeFrench,
            serviceLabels: TEXT.serviceLabels,
            formLanguageName: 'English',
            fieldLabels: FIELD_LABELS
        });

        // Initialize 12h time selects
        initializeEnglishTimeSelects();
    }

    init();
});
