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
            publicKey: window.__ENV__?.EMAILJS_PUBLIC_KEY || "3d1G_24v013gRjTFO"
        }
    };

    // Language-specific text - ENGLISH VERSION
    const TEXT = {
        validation: {
            required: {
                masculine: ' is required',
                feminine: ' is required'
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
    const getShiftTimeFrench = (fieldPrefix) => {
        const time24h = getShiftTime24h(fieldPrefix);
        return window.convert24hToFrench(time24h);
    };

    // Function to generate time options for English version (12h format)
    // Max value is 12:00 (noon), no AM/PM in the displayed text
    function generateTimeOptions12h(selectId, defaultValue) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const isStart = selectId === 'shiftStart';
        const placeholder = isStart ? TEXT.validation.selectPlaceholder.start : TEXT.validation.selectPlaceholder.end;

        // Clear existing options
        select.innerHTML = `<option value="">${placeholder}</option>`;

        // Generate times from 12:00 AM to 12:00 PM (noon) in 15-minute intervals
        // We'll generate 12:00 AM (midnight) to 11:45 AM and 12:00 PM (noon)
        const times = [];

        // Add 12:00 AM (midnight)
        times.push('00:00');

        // Add times from 12:15 AM to 11:45 AM
        for (let hour = 0; hour < 12; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                if (hour === 0 && minute === 0) continue; // Skip 12:00 AM already added
                const time24h = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                times.push(time24h);
            }
        }

        // Add 12:00 PM (noon) - this is the maximum
        times.push('12:00');

        // Add times from 12:15 PM to 11:45 PM (if you want to allow afternoon/evening times)
        // Comment out if you only want morning times up to noon
        for (let hour = 12; hour < 24; hour++) {
            for (let minute = 15; minute < 60; minute += 15) {
                if (hour === 12 && minute === 0) continue; // Skip 12:00 PM already added
                const time24h = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                times.push(time24h);
            }
        }

        times.forEach(time24h => {
            const option = document.createElement('option');
            option.value = time24h;

            // Format for display: just the time, no AM/PM (e.g., "7:00" or "12:00")
            const [hours, minutes] = time24h.split(':');
            let hour = parseInt(hours);

            // Convert to 12-hour format for display
            let displayHour = hour % 12 || 12;

            // Display as "7:00", "7:15", "12:00", etc.
            option.textContent = `${displayHour}:${minutes}`;

            // Set default value if matches
            if (time24h === defaultValue) {
                option.selected = true;
            }

            select.appendChild(option);
        });
    }

    // Initialize time selects for English version
    function initializeEnglishTimeSelects() {
        if (currentLang === 'en') {
            generateTimeOptions12h('shiftStart', CONFIG.TIME.defaultStart);
            generateTimeOptions12h('shiftEnd', CONFIG.TIME.defaultEnd);

            // Set default AM/PM values
            const startAmPm = document.querySelector(`input[name="shiftStartAmPm"][value="${CONFIG.TIME.defaultStartAmPm}"]`);
            const endAmPm = document.querySelector(`input[name="shiftEndAmPm"][value="${CONFIG.TIME.defaultEndAmPm}"]`);

            if (startAmPm) startAmPm.checked = true;
            if (endAmPm) endAmPm.checked = true;
        }
    }

    // ================== INITIALIZE FORM ==================

    // Wait for dependencies to load
    setTimeout(function() {
        // Check if Flatpickr is loaded
        if (typeof flatpickr === 'undefined') {
            console.warn('Flatpickr not loaded, using default locale');
            initFormWithDefaultLocale();
            return;
        }

        // Check if English locale exists
        const hasEnglishLocale = flatpickr.l10ns && flatpickr.l10ns.en;

        // Initialize the form using the core logic
        if (typeof window.initUnifiedForm === 'function') {
            window.initUnifiedForm({
                lang: currentLang,
                text: TEXT,
                config: CONFIG,
                dateLocale: 'en',
                flatpickrLocale: hasEnglishLocale ? 'en' : 'default',
                getShiftTime24h: getShiftTime24h,
                getShiftTimeFrench: getShiftTimeFrench,
                serviceLabels: TEXT.serviceLabels,
                formLanguageName: 'English',
                fieldLabels: FIELD_LABELS
            });

            // Initialize time selects AFTER the form is set up
            setTimeout(initializeEnglishTimeSelects, 200);
        } else {
            console.error('form-core.js not loaded. initUnifiedForm function not found.');
        }

    }, 100);

    // Fallback function
    function initFormWithDefaultLocale() {
        if (typeof window.initUnifiedForm === 'function') {
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

            // Initialize time selects AFTER the form is set up
            setTimeout(initializeEnglishTimeSelects, 200);
        }
    }

});