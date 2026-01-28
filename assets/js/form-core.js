/**
 * Core logic for the unified contact form.
 * This file contains all the SHARED functionality between French and English versions.
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
        fieldLabels,
        getFieldLabel, // Optional override
        getRequiredSuffix // Optional override
    } = langConfig;

    // ================== STATE & CACHE ==================
    let touchedFields = new Set();
    const form = document.getElementById('unifiedForm');
    let datePickerInstance = null;
    const formElements = {};
    let calendlyModal = null;
    let isSubmitting = false; // Sécurité anti-double envoi

    // ================== INITIALIZATION ==================
    function init() {
        if (!form) {
            console.error('Form not found');
            return;
        }

        // 🔒 Anti double initialisation (CRITIQUE)
        if (form.dataset.initialized === 'true') {
            return;
        }
        form.dataset.initialized = 'true';

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
    }

    // ================== FLATPICKR ==================
    function initFlatpickr() {
        if (!formElements.datePickerInput) return;

        function handleDateChange(selectedDates) {
            updateSelectedDatesList(selectedDates);
            validateDateField();
        }

        if (typeof flatpickr === 'undefined') {
            console.warn('Flatpickr not loaded');
            fallbackDateInput();
            return;
        }

        try {
            datePickerInstance = flatpickr("#datePicker", {
                mode: "multiple",
                dateFormat: "d/m/Y",
                locale: flatpickrLocale,
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
            formElements.datePickerInput.type = 'text';
            formElements.datePickerInput.readOnly = true;
            formElements.datePickerInput.placeholder = "Date selection temporarily unavailable";
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
        if (formElements.fields.shiftStart && config.TIME.defaultStart) {
            formElements.fields.shiftStart.value = config.TIME.defaultStart;
        }
        if (formElements.fields.shiftEnd && config.TIME.defaultEnd) {
            formElements.fields.shiftEnd.value = config.TIME.defaultEnd;
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

    // Helper to get required suffix (can be overridden by langConfig)
    const _getRequiredSuffix = function(fieldName) {
        if (typeof getRequiredSuffix === 'function') {
            return getRequiredSuffix(fieldName);
        }
        if (typeof text.validation.required === 'string') {
            return text.validation.required;
        }
        return text.validation.required?.default || '';
    };

    // Helper to get field label (can be overridden by langConfig)
    const _getFieldLabel = function(fieldName) {
        if (typeof getFieldLabel === 'function') {
            return getFieldLabel(fieldName);
        }
        if (fieldLabels && fieldLabels[fieldName]) {
            return fieldLabels[fieldName];
        }
        const field = formElements.fields[fieldName];
        return field ? (field.placeholder || field.name) : fieldName;
    };

    function validateField(fieldName) {
        const field = formElements.fields[fieldName];
        if (!field) return true;

        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        const requiredFields = ['contact_name', 'contact_phone', 'contact_email', 'position',
            'hotel_name', 'hotel_address', 'city', 'department',
            'serviceType', 'shiftStart', 'shiftEnd'
        ];

        if (field.required || requiredFields.includes(fieldName)) {
            if (!value) {
                isValid = false;
                errorMessage = _getFieldLabel(fieldName) + _getRequiredSuffix(fieldName);
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
                    case 'shiftStart':
                    case 'shiftEnd':
                        if (value === '') {
                            isValid = false;
                            errorMessage = _getFieldLabel(fieldName) + _getRequiredSuffix(fieldName);
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
        const field = formElements.bookingDatesHidden;
        if (!field) return true;

        const value = field.value.trim();
        let isValid = true;

        if (!value) {
            isValid = false;
            const errorMessage = text.validation.invalid.dates;
            displayFieldError('bookingDates', errorMessage);
        } else {
            clearFieldError('bookingDates');
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
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '0.875em';
        errorDiv.style.marginTop = '0.25rem';
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
        Object.keys(formElements.fields).forEach(fieldName => {
            touchedFields.add(fieldName);
            if (!validateField(fieldName)) {
                isValid = false;
            }
        });

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
        e.stopPropagation();

        if (isSubmitting) return;

        hideMessages();

        if (!validateForm()) {
            showUserMessage('❌ ' + text.submission.error.validation, 'error');
            return;
        }

        isSubmitting = true;
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
                setTimeout(() => reject(new Error('TIMEOUT')), 20000)
            );

            const response = await Promise.race([emailPromise, timeoutPromise]);

            if (response && (response.status === 200 || response.text === 'OK')) {
                showUserMessage(text.submission.success, 'success');
                resetForm();
            } else {
                throw new Error('SERVER_ERROR');
            }

        } catch (error) {
            console.error('Form Error:', error);
            let errorMessage = text.submission.error.generic;

            if (error.message === 'TIMEOUT') {
                errorMessage = text.submission.error.timeout;
            } else if (error.message.includes('public key')) {
                errorMessage = 'EmailJS Public Key is missing.';
            } else if (error.message === 'SERVER_ERROR') {
                errorMessage = text.submission.error.server;
            }

            showUserMessage('❌ ' + errorMessage, 'error');
        } finally {
            isSubmitting = false;
            formElements.submitBtn.disabled = false;
            formElements.submitBtn.innerHTML = originalBtnContent;

            if (formElements.loadingDiv) {
                formElements.loadingDiv.style.display = 'none';
            }
        }
    }

    function prepareTemplateParams() {
        const formData = new FormData(form);

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

        const bookingDatesValue = formElements.bookingDatesHidden ? formElements.bookingDatesHidden.value : '';
        let bookingDatesSimple = '';
        let bookingDatesDetailed = '';

        if (bookingDatesValue) {
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

        const shiftStartFrench = getShiftTimeFrench('shiftStart');
        const shiftEndFrench = getShiftTimeFrench('shiftEnd');
        const serviceTypeFrench = serviceLabels[serviceType] || 'Autre';

        return {
            contact_name: contact_name,
            contact_phone: contact_phone,
            contact_email: contact_email,
            position: position,
            hotel_name: hotel_name,
            hotel_address: hotel_address,
            city: city,
            department: department,
            serviceType: serviceTypeFrench,
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
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                calendlyModal = new bootstrap.Modal(modalElement);
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
