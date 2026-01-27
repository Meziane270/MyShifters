/**
 * Core logic for the unified contact form.
 * This file contains all the shared functionality between the French and English versions.
 * Language-specific configurations are passed via the langConfig object.
 */
window.initUnifiedForm = function(langConfig) {
    "use strict";

    // Destructure configuration for easier access
    const {
        lang,
        text,
        config,
        dateLocale,
        flatpickrLocale,
        getShiftTimeFrench,
        serviceLabels,
        formLanguageName,
        fieldLabels
    } = langConfig;

    // ================== STATE & CACHE ==================
    let touchedFields = new Set();
    const form = document.getElementById('unifiedForm');
    let datePickerInstance = null;
    const formElements = {};
    let calendlyModal = null;

    // ================== INITIALIZATION ==================
    function init() {
        if (!form) {
            console.error('Form not found');
            return;
        }

        cacheFormElements();
        initFlatpickr();
        initTimeSelects();
        initFormValidation();
        initFormSubmission();
        initClearDatesButton();
        initCalendlyModal();
    }

    function cacheFormElements() {
        formElements.submitBtn = form.querySelector('button[type="submit"]');
        formElements.loadingDiv = document.querySelector('.loading');
        formElements.successMsg = document.querySelector('.sent-message');
        formElements.errorMsg = document.querySelector('.error-message');
        formElements.selectedDatesList = document.getElementById('selectedDatesList');
        formElements.bookingDatesHidden = document.getElementById('bookingDatesHidden');
        formElements.clearDatesBtn = document.getElementById('clearDates');
        formElements.datePickerInput = document.getElementById('datePicker');

        formElements.fields = {
            contact_name: form.querySelector('[name="contact_name"]'),
            contact_phone: form.querySelector('[name="contact_phone"]'),
            contact_email: form.querySelector('[name="contact_email"]'),
            position: form.querySelector('[name="position"]'),
            hotel_name: form.querySelector('[name="hotel_name"]'),
            hotel_address: form.querySelector('[name="hotel_address"]'),
            city: form.querySelector('[name="city"]'),
            department: form.querySelector('[name="department"]'),
            serviceType: form.querySelector('[name="serviceType"]'),
            shiftStart: form.querySelector('[name="shiftStart"]'),
            shiftEnd: form.querySelector('[name="shiftEnd"]'),
            message: form.querySelector('[name="message"]'),
            pms: form.querySelector('[name="pms"]'),
            company_website: form.querySelector('[name="company_website"]')
        };

        // Language-specific caching for AM/PM radio buttons (English only)
        if (lang === 'en') {
            formElements.amPm = {
                shiftStartAM: document.getElementById('shiftStartAM'),
                shiftStartPM: document.getElementById('shiftStartPM'),
                shiftEndAM: document.getElementById('shiftEndAM'),
                shiftEndPM: document.getElementById('shiftEndPM')
            };
        }
    }

    // ================== FLATPICKR ==================
    // ================== FLATPICKR ==================
    function initFlatpickr() {
        if (!formElements.datePickerInput) return;

        // Fonction de callback pour le changement de dates
        function handleDateChange(selectedDates) {
            updateSelectedDatesList(selectedDates);
            validateDateField();
        }

        // Vérifier si Flatpickr est chargé
        if (typeof flatpickr === 'undefined') {
            console.warn('Flatpickr non chargé, utilisation du fallback');
            fallbackDateInput();
            return;
        }

        try {
            // Vérifier si la locale existe
            let actualLocale = flatpickrLocale;
            if (flatpickrLocale !== 'default' && (!flatpickr.l10ns || !flatpickr.l10ns[flatpickrLocale])) {
                console.warn(`Locale ${flatpickrLocale} non trouvée, utilisation de 'default'`);
                actualLocale = 'default';
            }

            datePickerInstance = flatpickr("#datePicker", {
                mode: "multiple",
                dateFormat: "d/m/Y",
                locale: actualLocale,
                minDate: "today",
                onChange: handleDateChange
            });
        } catch (error) {
            console.error('Flatpickr initialization failed:', error);
            fallbackDateInput();
        }
    }

    function fallbackDateInput() {
        if (formElements.datePickerInput) {
            // Simple message d'erreur
            formElements.datePickerInput.type = 'text';
            formElements.datePickerInput.readOnly = true;
            formElements.datePickerInput.placeholder = "Sélection de dates temporairement indisponible";
            formElements.datePickerInput.style.color = '#999';
        }
    }

    function updateSelectedDatesList(selectedDates) {
        if (!formElements.selectedDatesList || !formElements.bookingDatesHidden) return;

        if (selectedDates.length === 0) {
            formElements.selectedDatesList.innerHTML = `<span class="no-dates">${text.validation.noDates}</span>`;
            formElements.bookingDatesHidden.value = '';
            return;
        }

        selectedDates.sort((a, b) => a - b);

        const formattedDates = selectedDates.map(date => {
            return date.toLocaleDateString(dateLocale, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        });

        formElements.selectedDatesList.innerHTML = formattedDates.map(date =>
            `<span class="date-badge">${date}</span>`
        ).join('');

        formElements.bookingDatesHidden.value = selectedDates.map(date =>
            date.toISOString().split('T')[0]
        ).join(',');
    }

    // ================== TIME SELECTS ==================
    function initTimeSelects() {
        if (lang === 'fr') {
            generateTimeOptions24h('shiftStart', config.TIME.defaultStart);
            generateTimeOptions24h('shiftEnd', config.TIME.defaultEnd);
        } else if (lang === 'en') {
            // Set default values for time selects (12h format)
            if (formElements.fields.shiftStart) {
                formElements.fields.shiftStart.value = config.TIME.defaultStart;
            }
            if (formElements.fields.shiftEnd) {
                formElements.fields.shiftEnd.value = config.TIME.defaultEnd;
            }

            // Set default AM/PM values
            if (formElements.amPm) {
                if (config.TIME.defaultStartAmPm === 'AM' && formElements.amPm.shiftStartAM) {
                    formElements.amPm.shiftStartAM.checked = true;
                } else if (formElements.amPm.shiftStartPM) {
                    formElements.amPm.shiftStartPM.checked = true;
                }

                if (config.TIME.defaultEndAmPm === 'AM' && formElements.amPm.shiftEndAM) {
                    formElements.amPm.shiftEndAM.checked = true;
                } else if (formElements.amPm.shiftEndPM) {
                    formElements.amPm.shiftEndPM.checked = true;
                }
            }
        }
    }

    // Only used for French (24h format)
    function generateTimeOptions24h(selectId, defaultValue) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const placeholder = selectId === 'shiftStart' ?
            text.validation.selectPlaceholder.start :
            text.validation.selectPlaceholder.end;

        select.innerHTML = `<option value="">${placeholder}</option>`;

        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const timeValue = hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0');
                const timeDisplay = hour.toString().padStart(2, '0') + 'h' + (minute === 0 ? '00' : minute.toString());
                const option = document.createElement('option');
                option.value = timeValue;
                option.textContent = timeDisplay;
                if (timeValue === defaultValue) option.selected = true;
                select.appendChild(option);
            }
        }
    }

    // ================== FORM VALIDATION ==================
    function initFormValidation() {
        Object.keys(formElements.fields).forEach(fieldName => {
            const field = formElements.fields[fieldName];
            if (!field) return;

            field.addEventListener('blur', function() {
                if (!touchedFields.has(fieldName)) {
                    touchedFields.add(fieldName);
                }
                validateField(fieldName);
            });

            if (['contact_phone', 'contact_email'].includes(fieldName)) {
                field.addEventListener('input', function() {
                    if (touchedFields.has(fieldName)) {
                        validateField(fieldName);
                    }
                });
            }

            field.addEventListener('focus', function() {
                clearFieldError(fieldName);
            });
        });

        if (formElements.datePickerInput) {
            formElements.datePickerInput.addEventListener('blur', function() {
                validateDateField();
            });
        }

        ['serviceType', 'shiftStart', 'shiftEnd'].forEach(fieldName => {
            const field = formElements.fields[fieldName];
            if (field) {
                field.addEventListener('change', function() {
                    touchedFields.add(fieldName);
                    validateField(fieldName);
                });
            }
        });
    }

    // Ligne 302-316, REMPLACEZ par :
    function getRequiredSuffix(fieldName) {
        // Si text.validation.required est une chaîne, retournez-la directement
        if (typeof text.validation.required === 'string') {
            return text.validation.required;
        }

        // Si c'est un objet avec masculine/feminine (ancienne version)
        if (lang === 'fr' && text.validation.required && typeof text.validation.required === 'object') {
            // Simple logique de genre
            const feminineFields = ['position', 'hotel_address', 'city', 'department', 'message'];
            const isFeminine = feminineFields.includes(fieldName);

            return isFeminine ?
                (text.validation.required.feminine || ' est requise') :
                (text.validation.required.masculine || ' est requis');
        }

        // Fallback par défaut
        return ' est requis';
    }

    function getFieldLabel(fieldName) {
        // Use the provided fieldLabels map, or fallback to the field's placeholder/name
        if (fieldLabels && fieldLabels[fieldName]) {
            return fieldLabels[fieldName];
        }
        const field = formElements.fields[fieldName];
        return field ? (field.placeholder || field.name) : fieldName;
    }

    function validateField(fieldName) {
        const field = formElements.fields[fieldName];
        if (!field) return true;

        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // List of fields that are required and should be validated
        const requiredFields = ['contact_name', 'contact_phone', 'contact_email', 'position',
            'hotel_name', 'hotel_address', 'city', 'department',
            'serviceType', 'shiftStart', 'shiftEnd'
        ];

        if (field.required || requiredFields.includes(fieldName)) {

            if (!value) {
                isValid = false;
                errorMessage = getFieldLabel(fieldName) + getRequiredSuffix(fieldName);
            } else {
                switch (fieldName) {
                    case 'contact_phone':
                        if (!config.REGEX.phone.test(value)) {
                            isValid = false;
                            errorMessage = text.validation.invalid.phone;
                        }
                        break;
                    case 'contact_email':
                        if (!config.REGEX.email.test(value)) {
                            isValid = false;
                            errorMessage = text.validation.invalid.email;
                        }
                        break;
                    case 'serviceType':
                        if (value === '') {
                            isValid = false;
                            errorMessage = getFieldLabel(fieldName) + getRequiredSuffix(fieldName);
                        }
                        break;
                    case 'shiftStart':
                    case 'shiftEnd':
                        // Time validation is handled by the select element's required attribute and the empty option
                        if (value === '') {
                            isValid = false;
                            errorMessage = getFieldLabel(fieldName) + getRequiredSuffix(fieldName);
                        }
                        break;
                }
            }
        }

        if (!isValid) {
            displayFieldError(fieldName, errorMessage);
        } else {
            clearFieldError(fieldName);
        }

        return isValid;
    }

    function validateDateField() {
        const fieldName = 'bookingDates';
        const field = formElements.bookingDatesHidden;
        if (!field) return true;

        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        if (field.required && !value) {
            isValid = false;
            errorMessage = text.validation.invalid.dates;
        }

        if (!isValid) {
            displayFieldError(fieldName, errorMessage);
        } else {
            clearFieldError(fieldName);
        }

        return isValid;
    }

    function displayFieldError(fieldName, message) {
        const field = formElements.fields[fieldName] || formElements.datePickerInput;
        if (!field) return;

        const container = field.closest('.form-group') || field.closest('.form-check') || field.closest('.col-lg-6') || field.closest('.col-md-6') || field.closest('.col-12');
        if (!container) return;

        let errorDiv = container.querySelector('.validate');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.classList.add('validate');
            container.appendChild(errorDiv);
        }

        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        field.classList.add('is-invalid');
    }

    function clearFieldError(fieldName) {
        const field = formElements.fields[fieldName] || formElements.datePickerInput;
        if (!field) return;

        const container = field.closest('.form-group') || field.closest('.form-check') || field.closest('.col-lg-6') || field.closest('.col-md-6') || field.closest('.col-12');
        if (!container) return;

        const errorDiv = container.querySelector('.validate');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
        field.classList.remove('is-invalid');
    }

    function validateForm() {
        let isValid = true;
        // Validate all fields
        Object.keys(formElements.fields).forEach(fieldName => {
            // Ensure all fields are "touched" for validation on submit
            touchedFields.add(fieldName);
            if (!validateField(fieldName)) {
                isValid = false;
            }
        });

        // Validate date field separately
        if (!validateDateField()) {
            isValid = false;
        }

        return isValid;
    }

    // ================== FORM SUBMISSION ==================
    function initFormSubmission() {
        form.addEventListener('submit', handleFormSubmit);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        hideMessages();

        if (!validateForm()) {
            showUserMessage('❌ ' + text.submission.error.validation, 'error');
            return;
        }

        formElements.submitBtn.disabled = true;
        const originalBtnContent = formElements.submitBtn.innerHTML;
        formElements.submitBtn.innerHTML = text.submission.sending;

        if (formElements.loadingDiv) {
            formElements.loadingDiv.style.display = 'block';
        }

        try {
            const templateParams = prepareTemplateParams();

            const emailPromise = emailjs.send(
                config.EMAILJS.serviceId,
                config.EMAILJS.templateId,
                templateParams,
                config.EMAILJS.publicKey
            );

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(text.submission.error.timeout)), 15000)
            );

            const response = await Promise.race([emailPromise, timeoutPromise]);

            if (response && response.status === 200) {
                showUserMessage(text.submission.success, 'success');
                resetForm();
            } else {
                throw new Error(text.submission.error.server);
            }

        } catch (error) {
            console.error('Form Error:', error);
            let errorMessage = text.submission.error.generic;

            if (error.message === text.submission.error.timeout) {
                errorMessage = text.submission.error.timeout;
            } else if (error.message.includes('The public key is required')) {
                errorMessage = 'EmailJS Public Key is missing. Check your configuration.';
            } else if (error.message.includes('Network Error')) {
                errorMessage = text.submission.error.service;
            } else if (error.message === text.submission.error.server) {
                errorMessage = text.submission.error.server;
            }

            showUserMessage('❌ ' + errorMessage, 'error');
        } finally {
            formElements.submitBtn.disabled = false;
            formElements.submitBtn.innerHTML = originalBtnContent;

            if (formElements.loadingDiv) {
                formElements.loadingDiv.style.display = 'none';
            }
        }
    }

    function prepareTemplateParams() {
        const formData = new FormData(form);

        // 1. Get form values
        const contact_name = formData.get('contact_name');
        const contact_phone = formData.get('contact_phone');
        const contact_email = formData.get('contact_email');
        const position = formData.get('position');
        const hotel_name = formData.get('hotel_name');
        const hotel_address = formData.get('hotel_address');
        const city = formData.get('city');
        const department = formData.get('department');
        const serviceType = formData.get('serviceType');
        const pms = formData.get('pms');
        const message = formData.get('message');

        // 2. Date processing
        const bookingDatesValue = formElements.bookingDatesHidden ? formElements.bookingDatesHidden.value : '';
        let bookingDatesSimple = '';
        let bookingDatesDetailed = '';

        if (bookingDatesValue) {
            // Simple format (e.g., 01/12/2025)
            bookingDatesSimple = bookingDatesValue.split(',').map(dateStr => {
                const [year, month, day] = dateStr.split('-');
                return `${day}/${month}/${year}`;
            }).join(', ');

            bookingDatesDetailed = bookingDatesValue.split(',').map(dateStr => {
                const [year, month, day] = dateStr.split('-');
                const date = new Date(year, month - 1, day);
                return date.toLocaleDateString(dateLocale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            }).join(', ');
        }

        // 3. Time processing
        const shiftStartFrench = getShiftTimeFrench('shiftStart');
        const shiftEndFrench = getShiftTimeFrench('shiftEnd');

        // 4. Service label translation (to French for the EmailJS template)
        const serviceTypeFrench = serviceLabels[serviceType] || 'Autre';

        // 5. Create parameters for EmailJS
        return {
            contact_name: contact_name,
            contact_phone: contact_phone,
            contact_email: contact_email,
            position: position,
            hotel_name: hotel_name,
            hotel_address: hotel_address,
            city: city,
            department: department,
            serviceType: serviceTypeFrench, // Always French for the template
            pms: pms || 'Non spécifié',
            bookingDatesHidden: bookingDatesSimple,
            bookingDatesArray: bookingDatesDetailed,
            shiftStart: shiftStartFrench,
            shiftEnd: shiftEndFrench,
            message: message || '(Aucun détail supplémentaire fourni)',

            current_date: new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            current_time: new Date().toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            }),

            form_language: formLanguageName
        };
    }

    function resetForm() {
        form.reset();
        touchedFields.clear();

        if (datePickerInstance) {
            datePickerInstance.clear();
        }
        updateSelectedDatesList([]);

        initTimeSelects();

        Object.keys(formElements.fields).forEach(fieldName => {
            clearFieldError(fieldName);
        });
        validateDateField();
    }

    // ================== UTILITIES ==================
    function hideMessages() {
        if (formElements.successMsg) {
            formElements.successMsg.style.display = 'none';
        }
        if (formElements.errorMsg) {
            formElements.errorMsg.style.display = 'none';
        }
    }

    function showUserMessage(message, type) {
        hideMessages();

        const target = (type === 'success') ? formElements.successMsg : formElements.errorMsg;
        if (target) {
            target.textContent = message;
            target.style.display = 'block';
            target.setAttribute('role', 'alert');
            target.setAttribute('aria-live', 'assertive');

            if (type === 'success') {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        } else {
            alert(message);
        }
    }

    // ================== CALENDLY MODAL ==================
    function initCalendlyModal() {
        const modalElement = document.getElementById('calendlyModal');
        if (modalElement) {
            // Check if bootstrap is available
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                calendlyModal = new bootstrap.Modal(modalElement);
            } else {
                console.warn('Bootstrap Modal not found. Calendly modal functionality will be limited.');
            }

            const confirmBtn = document.getElementById('confirmCalendly');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', function() {
                    localStorage.setItem('calendlyCookiesAccepted', 'true');
                    localStorage.setItem('calendlyConsentDate', new Date().toISOString());

                    if (calendlyModal) {
                        calendlyModal.hide();
                    }

                    redirectToCalendly();
                });
            }
        }
    }

    function initClearDatesButton() {
        if (formElements.clearDatesBtn) {
            formElements.clearDatesBtn.addEventListener('click', function() {
                if (datePickerInstance) {
                    datePickerInstance.clear();
                }
                updateSelectedDatesList([]);
                validateDateField();
            });
        }
    }

    window.showCalendlyWarning = function(source) {
        if (localStorage.getItem('calendlyCookiesAccepted')) {
            redirectToCalendly();
            return;
        }

        if (calendlyModal) {
            calendlyModal.show();
        } else {
            redirectToCalendly();
        }
    };

    function redirectToCalendly() {
        window.location.href = 'https://calendly.com/myshifters-extras/30min';
    }

    // ================== START APPLICATION ==================
    init();
};

// Helper functions for time conversion (used by language-specific scripts)
window.convert12hTo24h = function(time12h, ampm) {
    if (!time12h) return '';

    const [hoursStr, minutesStr] = time12h.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr || '00';

    if (ampm === 'PM' && hours < 12) {
        hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

window.convert24hToFrench = function(time24h) {
    if (!time24h) return '';
    const [hours, minutes] = time24h.split(':');
    return `${hours}h${minutes === '00' ? '00' : minutes}`;
};


