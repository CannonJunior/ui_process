/**
 * Adaptive Theme Controller
 * Manages context-aware theming that responds to workflow modes
 */
export class AdaptiveThemeController {
    constructor() {
        this.currentMode = 'workflow';
        this.currentTheme = this.getUserPreference();
        this.isTransitioning = false;
        this.initializeTheme();
        this.setupSystemPreferenceListeners();
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        // Set initial theme
        this.applyTheme(this.currentTheme);
        
        // Set initial mode
        this.setMode(this.currentMode);
        
        // Add theme meta tag for mobile browsers
        this.updateThemeColorMeta();
        
        console.log(`🎨 Adaptive Theme Controller initialized - Theme: ${this.currentTheme}, Mode: ${this.currentMode}`);
    }

    /**
     * Get user's theme preference from localStorage or system
     */
    getUserPreference() {
        const stored = localStorage.getItem('adaptive-theme-preference');
        if (stored && ['light', 'dark', 'sunrise'].includes(stored)) {
            return stored;
        }
        
        // Fallback to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    }

    /**
     * Set the workflow mode (changes color hue)
     * @param {string} mode - workflow, matrix, opportunities, knowledgeGraph
     */
    setMode(mode) {
        if (this.isTransitioning) return;
        
        const validModes = ['workflow', 'matrix', 'opportunities', 'knowledgeGraph'];
        if (!validModes.includes(mode)) {
            console.warn(`Invalid mode: ${mode}`);
            return;
        }

        this.currentMode = mode;
        document.documentElement.setAttribute('data-mode', mode);
        this.updateThemeColorMeta();
        
        // Announce theme change for accessibility
        this.announceThemeChange(mode);
        
        console.log(`🎨 Theme mode changed to: ${mode}`);
    }

    /**
     * Set the theme variant (light, dark, sunrise)
     * @param {string} theme - light, dark, sunrise
     */
    setTheme(theme) {
        if (this.isTransitioning) return;
        
        const validThemes = ['light', 'dark', 'sunrise'];
        if (!validThemes.includes(theme)) {
            console.warn(`Invalid theme: ${theme}`);
            return;
        }

        this.isTransitioning = true;
        this.currentTheme = theme;
        
        this.applyTheme(theme);
        this.saveUserPreference(theme);
        this.updateThemeColorMeta();
        
        // Reset transition flag after animation completes
        setTimeout(() => {
            this.isTransitioning = false;
        }, 600);
        
        console.log(`🎨 Theme variant changed to: ${theme}`);
    }

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update theme-color meta tag for mobile browsers
        setTimeout(() => this.updateThemeColorMeta(), 100);
    }

    /**
     * Save user preference to localStorage
     */
    saveUserPreference(theme) {
        localStorage.setItem('adaptive-theme-preference', theme);
    }

    /**
     * Update theme-color meta tag for mobile browser UI
     */
    updateThemeColorMeta() {
        let metaTag = document.querySelector('meta[name="theme-color"]');
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.name = 'theme-color';
            document.head.appendChild(metaTag);
        }
        
        // Get computed background color
        const computedStyle = getComputedStyle(document.documentElement);
        const bgColor = computedStyle.getPropertyValue('--bg-secondary').trim();
        
        if (bgColor) {
            metaTag.content = bgColor;
        }
    }

    /**
     * Setup system preference change listeners
     */
    setupSystemPreferenceListeners() {
        // Listen for system dark mode changes
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!localStorage.getItem('adaptive-theme-preference')) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * Announce theme changes for screen readers
     */
    announceThemeChange(mode) {
        const modeNames = {
            workflow: 'Workflow',
            matrix: 'Priority Matrix',
            opportunities: 'Opportunities',
            knowledgeGraph: 'Knowledge Graph'
        };
        
        const announcement = `Theme changed to ${modeNames[mode]} mode`;
        this.announceToScreenReader(announcement);
    }

    /**
     * Announce message to screen readers
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Get current theme state
     */
    getCurrentState() {
        return {
            mode: this.currentMode,
            theme: this.currentTheme,
            isTransitioning: this.isTransitioning
        };
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(nextTheme);
    }

    /**
     * Cycle through all available themes
     */
    cycleTheme() {
        const themes = ['light', 'dark', 'sunrise'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.setTheme(themes[nextIndex]);
    }

    /**
     * Get theme-appropriate colors for dynamic elements
     */
    getThemeColors() {
        const computedStyle = getComputedStyle(document.documentElement);
        return {
            primary: computedStyle.getPropertyValue('--accent-primary').trim(),
            secondary: computedStyle.getPropertyValue('--accent-secondary').trim(),
            background: computedStyle.getPropertyValue('--bg-primary').trim(),
            text: computedStyle.getPropertyValue('--text-primary').trim(),
            border: computedStyle.getPropertyValue('--border-primary').trim()
        };
    }
}

// Create singleton instance
let themeControllerInstance = null;

/**
 * Get singleton instance of AdaptiveThemeController
 * @returns {AdaptiveThemeController}
 */
export function getAdaptiveThemeController() {
    if (!themeControllerInstance) {
        themeControllerInstance = new AdaptiveThemeController();
    }
    return themeControllerInstance;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.AdaptiveThemeController = AdaptiveThemeController;
    window.getAdaptiveThemeController = getAdaptiveThemeController;
}