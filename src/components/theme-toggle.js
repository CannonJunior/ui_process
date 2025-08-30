/**
 * Theme Toggle Component
 * Multi-state toggle for Light/Dark/Sunrise themes
 */
export class ThemeToggle {
    constructor(containerId, themeController) {
        this.container = document.getElementById(containerId);
        this.themeController = themeController;
        this.isAnimating = false;
        
        if (!this.container) {
            console.error(`Theme toggle container not found: ${containerId}`);
            return;
        }
        
        this.init();
    }

    /**
     * Initialize the theme toggle component
     */
    init() {
        this.createToggleElement();
        this.bindEvents();
        this.updateVisualState();
        
        console.log('🎨 Theme Toggle initialized');
    }

    /**
     * Create the toggle element and inject into DOM
     */
    createToggleElement() {
        const toggleHTML = `
            <div class="theme-toggle-wrapper" role="radiogroup" aria-label="Choose theme">
                <div class="theme-toggle-container">
                    <input type="radio" id="theme-light" name="theme" value="light" class="theme-radio sr-only">
                    <label for="theme-light" class="theme-option" data-theme="light" title="Light theme">
                        <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"/>
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                        </svg>
                        <span class="theme-label">Light</span>
                    </label>
                    
                    <input type="radio" id="theme-dark" name="theme" value="dark" class="theme-radio sr-only">
                    <label for="theme-dark" class="theme-option" data-theme="dark" title="Dark theme">
                        <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                        <span class="theme-label">Dark</span>
                    </label>
                    
                    <input type="radio" id="theme-sunrise" name="theme" value="sunrise" class="theme-radio sr-only">
                    <label for="theme-sunrise" class="theme-option" data-theme="sunrise" title="Sunrise theme">
                        <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 18a5 5 0 0 0-10 0"/>
                            <line x1="12" y1="9" x2="12" y2="2"/>
                            <line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/>
                            <line x1="1" y1="18" x2="3" y2="18"/>
                            <line x1="21" y1="18" x2="23" y2="18"/>
                            <line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/>
                            <line x1="23" y1="22" x2="1" y2="22"/>
                        </svg>
                        <span class="theme-label">Sunrise</span>
                    </label>
                    
                    <div class="theme-selector-bg" aria-hidden="true"></div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = toggleHTML;
        this.cacheElements();
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.toggleContainer = this.container.querySelector('.theme-toggle-container');
        this.radioButtons = this.container.querySelectorAll('.theme-radio');
        this.themeOptions = this.container.querySelectorAll('.theme-option');
        this.selectorBg = this.container.querySelector('.theme-selector-bg');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Handle theme option clicks
        this.themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const theme = option.dataset.theme;
                this.selectTheme(theme);
            });
            
            // Keyboard support
            option.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const theme = option.dataset.theme;
                    this.selectTheme(theme);
                }
                
                // Arrow key navigation
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.navigateOptions(e.key === 'ArrowRight' ? 1 : -1);
                }
            });
        });
        
        // Listen for external theme changes
        document.addEventListener('themeChanged', (e) => {
            this.updateVisualState(e.detail.theme);
        });
    }

    /**
     * Select a theme
     */
    selectTheme(theme) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.themeController.setTheme(theme);
        this.updateVisualState(theme);
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('themeToggleChanged', {
            detail: { theme }
        }));
        
        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
    }

    /**
     * Navigate between options using keyboard
     */
    navigateOptions(direction) {
        const themes = ['light', 'dark', 'sunrise'];
        const currentTheme = this.themeController.getCurrentState().theme;
        const currentIndex = themes.indexOf(currentTheme);
        const nextIndex = (currentIndex + direction + themes.length) % themes.length;
        
        this.selectTheme(themes[nextIndex]);
        
        // Focus the new option
        const newOption = this.container.querySelector(`[data-theme="${themes[nextIndex]}"]`);
        if (newOption) {
            newOption.focus();
        }
    }

    /**
     * Update visual state to reflect current theme
     */
    updateVisualState(theme = null) {
        const currentTheme = theme || this.themeController.getCurrentState().theme;
        
        // Update radio button states
        this.radioButtons.forEach(radio => {
            radio.checked = radio.value === currentTheme;
        });
        
        // Update visual selection
        this.themeOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.theme === currentTheme);
            option.setAttribute('aria-selected', option.dataset.theme === currentTheme);
        });
        
        // Animate selector background
        this.animateSelectorBackground(currentTheme);
    }

    /**
     * Animate the selector background to the active option
     */
    animateSelectorBackground(theme) {
        const activeOption = this.container.querySelector(`[data-theme="${theme}"]`);
        if (!activeOption || !this.selectorBg) return;
        
        const containerRect = this.toggleContainer.getBoundingClientRect();
        const optionRect = activeOption.getBoundingClientRect();
        
        const translateX = optionRect.left - containerRect.left;
        const width = optionRect.width;
        
        this.selectorBg.style.transform = `translateX(${translateX}px)`;
        this.selectorBg.style.width = `${width}px`;
    }

    /**
     * Get current selected theme
     */
    getCurrentTheme() {
        return this.themeController.getCurrentState().theme;
    }

    /**
     * Programmatically set theme (useful for external controls)
     */
    setTheme(theme) {
        this.selectTheme(theme);
    }

    /**
     * Enable/disable the toggle
     */
    setEnabled(enabled) {
        this.themeOptions.forEach(option => {
            option.classList.toggle('disabled', !enabled);
            option.setAttribute('aria-disabled', !enabled);
        });
    }
}

/**
 * Initialize theme toggle with default container
 */
export function initializeThemeToggle(themeController, containerId = 'theme-toggle-container') {
    return new ThemeToggle(containerId, themeController);
}