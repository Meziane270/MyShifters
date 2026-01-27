document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Check for saved theme preference or prefer-color-scheme
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    // Set initial theme - default is dark, so we check for light
    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        body.classList.add('light-mode');
    }

    // Toggle theme on button click
    themeToggle.addEventListener('click', function() {
        body.classList.toggle('light-mode');

        // Save preference to localStorage
        if (body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.setItem('theme', 'dark');
        }
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                body.classList.add('light-mode');
            } else {
                body.classList.remove('light-mode');
            }
        }
    });
});