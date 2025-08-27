/**
 * Search Component
 * Vector and text search interface for UI Process
 */

import { getSearchService } from '../../services/search-service.js';

class SearchComponent {
    constructor(options = {}) {
        this.searchService = getSearchService();
        this.containerId = options.containerId || 'search-container';
        this.options = {
            placeholder: 'Search workflows, opportunities, nodes, and tasks...',
            showHistory: true,
            showSuggestions: true,
            autoFocus: false,
            maxResults: 20,
            ...options
        };
        
        // State
        this.isSearching = false;
        this.currentQuery = '';
        this.currentResults = [];
        this.selectedIndex = -1;
        
        // Event listeners
        this.onResultSelect = options.onResultSelect || this.defaultResultSelectHandler;
        this.onSearchStart = options.onSearchStart || (() => {});
        this.onSearchComplete = options.onSearchComplete || (() => {});
        
        console.log('🔍 Search component initialized');
    }
    
    /**
     * Initialize the search component
     */
    async init() {
        await this.render();
        this.attachEventListeners();
        this.loadSearchStatus();
        
        if (this.options.autoFocus) {
            this.focusSearchInput();
        }
    }
    
    /**
     * Render the search interface
     */
    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Search container not found: ${this.containerId}`);
            return;
        }
        
        container.innerHTML = `
            <div class="search-component">
                <div class="search-input-container">
                    <div class="search-input-wrapper">
                        <span class="search-icon">🔍</span>
                        <input 
                            type="text" 
                            id="search-input" 
                            class="search-input" 
                            placeholder="${this.options.placeholder}"
                            autocomplete="off"
                        >
                        <div class="search-actions">
                            <button id="search-mode-btn" class="search-mode-btn" title="Search Mode: Hybrid">
                                <span class="mode-icon">🎯</span>
                            </button>
                            <button id="search-clear-btn" class="search-clear-btn" title="Clear Search" style="display: none;">
                                <span>✕</span>
                            </button>
                        </div>
                    </div>
                    <div class="search-status" id="search-status"></div>
                </div>
                
                <div class="search-results-container" id="search-results-container" style="display: none;">
                    <div class="search-results-header">
                        <span class="results-count" id="results-count"></span>
                        <div class="search-filters">
                            <select id="entity-type-filter" class="entity-filter">
                                <option value="">All Types</option>
                                <option value="workflow">Workflows</option>
                                <option value="opportunity">Opportunities</option>
                                <option value="node">Nodes</option>
                                <option value="task">Tasks</option>
                            </select>
                            <select id="sort-filter" class="sort-filter">
                                <option value="relevance">Relevance</option>
                                <option value="date">Date</option>
                                <option value="type">Type</option>
                                <option value="similarity">Similarity</option>
                            </select>
                        </div>
                    </div>
                    <div class="search-results" id="search-results"></div>
                </div>
                
                ${this.options.showHistory ? `
                <div class="search-history-container" id="search-history-container" style="display: none;">
                    <div class="search-history-header">
                        <span>Recent Searches</span>
                        <button id="clear-history-btn" class="clear-history-btn">Clear</button>
                    </div>
                    <div class="search-history" id="search-history"></div>
                </div>
                ` : ''}
                
                <div class="search-loading" id="search-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <span>Searching...</span>
                </div>
            </div>
        `;
        
        // Add CSS styles
        this.addStyles();
    }
    
    /**
     * Add CSS styles for the search component
     */
    addStyles() {
        if (document.getElementById('search-component-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'search-component-styles';
        styles.textContent = `
            .search-component {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                position: relative;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .search-input-container {
                position: relative;
                margin-bottom: 12px;
            }
            
            .search-input-wrapper {
                display: flex;
                align-items: center;
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
            
            .search-input-wrapper:focus-within {
                border-color: #3b82f6;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            }
            
            .search-icon {
                padding: 12px 16px;
                color: #6b7280;
                font-size: 18px;
            }
            
            .search-input {
                flex: 1;
                border: none;
                outline: none;
                padding: 12px 8px;
                font-size: 16px;
                background: transparent;
            }
            
            .search-actions {
                display: flex;
                align-items: center;
                padding: 4px 8px;
                gap: 4px;
            }
            
            .search-mode-btn, .search-clear-btn {
                border: none;
                background: #f8fafc;
                border-radius: 8px;
                padding: 8px;
                cursor: pointer;
                transition: background-color 0.2s ease;
                display: flex;
                align-items: center;
            }
            
            .search-mode-btn:hover, .search-clear-btn:hover {
                background: #e2e8f0;
            }
            
            .search-status {
                margin-top: 8px;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 14px;
                display: none;
            }
            
            .search-status.error {
                background: #fef2f2;
                color: #dc2626;
                display: block;
            }
            
            .search-status.success {
                background: #f0fdf4;
                color: #16a34a;
                display: block;
            }
            
            .search-results-container {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                max-height: 400px;
                overflow: hidden;
            }
            
            .search-results-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #f1f5f9;
                background: #f8fafc;
                border-radius: 12px 12px 0 0;
            }
            
            .results-count {
                font-size: 14px;
                color: #6b7280;
                font-weight: 500;
            }
            
            .search-filters {
                display: flex;
                gap: 8px;
            }
            
            .entity-filter, .sort-filter {
                padding: 4px 8px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 12px;
                background: white;
            }
            
            .search-results {
                max-height: 320px;
                overflow-y: auto;
                padding: 8px 0;
            }
            
            .search-result-item {
                display: flex;
                align-items: flex-start;
                padding: 12px 16px;
                cursor: pointer;
                transition: background-color 0.2s ease;
                border-left: 3px solid transparent;
            }
            
            .search-result-item:hover,
            .search-result-item.selected {
                background: #f8fafc;
                border-left-color: #3b82f6;
            }
            
            .result-icon {
                font-size: 20px;
                margin-right: 12px;
                margin-top: 2px;
            }
            
            .result-content {
                flex: 1;
                min-width: 0;
            }
            
            .result-title {
                font-size: 15px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .result-subtitle {
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 4px;
            }
            
            .result-description {
                font-size: 13px;
                color: #4b5563;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .result-metadata {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-top: 6px;
                font-size: 12px;
                color: #9ca3af;
            }
            
            .search-type-badge {
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                text-transform: uppercase;
            }
            
            .search-type-badge.semantic {
                background: #ddd6fe;
                color: #7c3aed;
            }
            
            .search-type-badge.text {
                background: #dcfce7;
                color: #16a34a;
            }
            
            .similarity-score {
                font-weight: 500;
                color: #3b82f6;
            }
            
            .search-history-container {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                margin-top: 8px;
            }
            
            .search-history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 14px;
                font-weight: 500;
            }
            
            .clear-history-btn {
                border: none;
                background: none;
                color: #6b7280;
                cursor: pointer;
                font-size: 12px;
            }
            
            .clear-history-btn:hover {
                color: #dc2626;
            }
            
            .search-history {
                padding: 8px 0;
            }
            
            .history-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s ease;
            }
            
            .history-item:hover {
                background: #f8fafc;
            }
            
            .history-query {
                flex: 1;
                color: #374151;
            }
            
            .history-meta {
                font-size: 12px;
                color: #9ca3af;
            }
            
            .search-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 24px;
                color: #6b7280;
            }
            
            .loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #f3f4f6;
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .no-results {
                padding: 24px 16px;
                text-align: center;
                color: #6b7280;
            }
            
            .no-results-icon {
                font-size: 32px;
                margin-bottom: 8px;
            }
            
            .no-results-text {
                font-size: 14px;
                margin-bottom: 4px;
            }
            
            .no-results-suggestion {
                font-size: 12px;
                color: #9ca3af;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const searchInput = document.getElementById('search-input');
        const searchModeBtn = document.getElementById('search-mode-btn');
        const searchClearBtn = document.getElementById('search-clear-btn');
        const entityFilter = document.getElementById('entity-type-filter');
        const sortFilter = document.getElementById('sort-filter');
        const clearHistoryBtn = document.getElementById('clear-history-btn');
        
        // Search input events
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                this.currentQuery = query;
                
                // Show/hide clear button
                if (searchClearBtn) {
                    searchClearBtn.style.display = query ? 'block' : 'none';
                }
                
                // Debounced search
                clearTimeout(searchTimeout);
                if (query.length >= 2) {
                    searchTimeout = setTimeout(() => this.performSearch(query), 300);
                } else if (query.length === 0) {
                    this.hideResults();
                    this.showHistory();
                }
            });
            
            searchInput.addEventListener('keydown', (e) => this.handleKeyNavigation(e));
            searchInput.addEventListener('focus', () => {
                if (this.currentQuery.length === 0) {
                    this.showHistory();
                }
            });
        }
        
        // Search mode button
        if (searchModeBtn) {
            let currentMode = 'hybrid';
            searchModeBtn.addEventListener('click', () => {
                const modes = ['hybrid', 'semantic', 'text'];
                const currentIndex = modes.indexOf(currentMode);
                currentMode = modes[(currentIndex + 1) % modes.length];
                
                const modeConfig = {
                    hybrid: { icon: '🎯', title: 'Hybrid Search' },
                    semantic: { icon: '🧠', title: 'Semantic Search' },
                    text: { icon: '🔤', title: 'Text Search' }
                };
                
                searchModeBtn.querySelector('.mode-icon').textContent = modeConfig[currentMode].icon;
                searchModeBtn.title = `Search Mode: ${modeConfig[currentMode].title}`;
                
                // Re-search if we have a query
                if (this.currentQuery) {
                    this.performSearch(this.currentQuery, { searchMode: currentMode });
                }
            });
        }
        
        // Clear search button
        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.currentQuery = '';
                searchClearBtn.style.display = 'none';
                this.hideResults();
                this.showHistory();
                searchInput.focus();
            });
        }
        
        // Filter events
        if (entityFilter) {
            entityFilter.addEventListener('change', () => this.applyFilters());
        }
        
        if (sortFilter) {
            sortFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // Clear history button
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.searchService.clearSearchHistory();
                this.showHistory();
            });
        }
    }
    
    /**
     * Perform search with the given query
     */
    async performSearch(query, options = {}) {
        if (this.isSearching) return;
        
        this.isSearching = true;
        this.showLoading();
        this.hideHistory();
        this.onSearchStart(query);
        
        try {
            const searchMode = options.searchMode || 'hybrid';
            let results;
            
            switch (searchMode) {
                case 'semantic':
                    results = await this.searchService.semanticSearch(query, {
                        limit: this.options.maxResults
                    });
                    break;
                case 'text':
                    results = await this.searchService.textSearch(query, {
                        limit: this.options.maxResults
                    });
                    break;
                default:
                    results = await this.searchService.search(query, {
                        limit: this.options.maxResults
                    });
            }
            
            this.currentResults = results;
            this.displayResults(results);
            this.onSearchComplete(query, results);
            
        } catch (error) {
            this.showError(`Search failed: ${error.message}`);
            console.error('Search error:', error);
        } finally {
            this.isSearching = false;
            this.hideLoading();
        }
    }
    
    /**
     * Display search results
     */
    displayResults(results) {
        const resultsContainer = document.getElementById('search-results-container');
        const resultsElement = document.getElementById('search-results');
        const resultsCount = document.getElementById('results-count');
        
        if (!resultsContainer || !resultsElement) return;
        
        resultsContainer.style.display = 'block';
        
        // Update count
        if (resultsCount) {
            const countText = results.total === 0 
                ? 'No results found' 
                : `${results.total} result${results.total === 1 ? '' : 's'}`;
            resultsCount.textContent = countText;
        }
        
        // Display results
        if (results.results.length === 0) {
            resultsElement.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <div class="no-results-text">No results found for "${this.currentQuery}"</div>
                    <div class="no-results-suggestion">Try different keywords or search mode</div>
                </div>
            `;
        } else {
            resultsElement.innerHTML = results.results
                .map((result, index) => this.renderSearchResult(result, index))
                .join('');
            
            // Add click handlers
            this.attachResultClickHandlers();
        }
        
        this.selectedIndex = -1;
    }
    
    /**
     * Render a single search result
     */
    renderSearchResult(result, index) {
        const formatted = this.searchService.formatResultForDisplay(result);
        
        const similarityScore = result.similarity 
            ? `<span class="similarity-score">${Math.round(result.similarity * 100)}%</span>`
            : '';
        
        const searchTypeBadge = result.searchType 
            ? `<span class="search-type-badge ${result.searchType}">${result.searchType}</span>`
            : '';
        
        return `
            <div class="search-result-item" data-index="${index}" data-id="${result.id}" data-type="${result.type}">
                <div class="result-icon">${formatted.icon}</div>
                <div class="result-content">
                    <div class="result-title">
                        ${formatted.title}
                        ${searchTypeBadge}
                    </div>
                    <div class="result-subtitle">${formatted.subtitle}</div>
                    ${formatted.description ? `<div class="result-description">${formatted.description}</div>` : ''}
                    <div class="result-metadata">
                        ${formatted.metadata}
                        ${similarityScore}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Apply current filters to results
     */
    applyFilters() {
        if (!this.currentResults) return;
        
        const entityFilter = document.getElementById('entity-type-filter');
        const sortFilter = document.getElementById('sort-filter');
        
        let filteredResults = { ...this.currentResults };
        
        // Apply entity type filter
        if (entityFilter && entityFilter.value) {
            filteredResults = this.searchService.filterResultsByType(
                filteredResults, 
                [entityFilter.value]
            );
        }
        
        // Apply sorting
        if (sortFilter && sortFilter.value) {
            filteredResults = this.searchService.sortResults(
                filteredResults, 
                sortFilter.value
            );
        }
        
        this.displayResults(filteredResults);
    }
    
    /**
     * Show search history
     */
    showHistory() {
        if (!this.options.showHistory) return;
        
        const historyContainer = document.getElementById('search-history-container');
        const historyElement = document.getElementById('search-history');
        
        if (!historyContainer || !historyElement) return;
        
        const history = this.searchService.getSearchHistory();
        
        if (history.length === 0) {
            historyContainer.style.display = 'none';
            return;
        }
        
        historyElement.innerHTML = history
            .slice(0, 5)
            .map(item => `
                <div class="history-item" data-query="${item.query}">
                    <span class="history-query">${item.query}</span>
                    <span class="history-meta">${item.resultCount} results</span>
                </div>
            `)
            .join('');
        
        // Add click handlers for history items
        historyElement.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.dataset.query;
                document.getElementById('search-input').value = query;
                this.currentQuery = query;
                this.performSearch(query);
            });
        });
        
        historyContainer.style.display = 'block';
    }
    
    /**
     * Hide search history
     */
    hideHistory() {
        const historyContainer = document.getElementById('search-history-container');
        if (historyContainer) {
            historyContainer.style.display = 'none';
        }
    }
    
    /**
     * Show/hide UI elements
     */
    showLoading() {
        document.getElementById('search-loading')?.style.setProperty('display', 'flex');
        document.getElementById('search-results-container')?.style.setProperty('display', 'none');
    }
    
    hideLoading() {
        document.getElementById('search-loading')?.style.setProperty('display', 'none');
    }
    
    hideResults() {
        document.getElementById('search-results-container')?.style.setProperty('display', 'none');
    }
    
    showError(message) {
        const statusElement = document.getElementById('search-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'search-status error';
        }
    }
    
    showSuccess(message) {
        const statusElement = document.getElementById('search-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = 'search-status success';
        }
    }
    
    hideStatus() {
        const statusElement = document.getElementById('search-status');
        if (statusElement) {
            statusElement.style.display = 'none';
        }
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeyNavigation(event) {
        const results = document.querySelectorAll('.search-result-item');
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, results.length - 1);
                this.updateSelection(results);
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection(results);
                break;
                
            case 'Enter':
                event.preventDefault();
                if (this.selectedIndex >= 0 && results[this.selectedIndex]) {
                    this.selectResult(results[this.selectedIndex]);
                }
                break;
                
            case 'Escape':
                this.hideResults();
                this.hideHistory();
                break;
        }
    }
    
    /**
     * Update visual selection
     */
    updateSelection(results) {
        results.forEach((result, index) => {
            if (index === this.selectedIndex) {
                result.classList.add('selected');
                result.scrollIntoView({ block: 'nearest' });
            } else {
                result.classList.remove('selected');
            }
        });
    }
    
    /**
     * Attach click handlers to result items
     */
    attachResultClickHandlers() {
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => this.selectResult(item));
        });
    }
    
    /**
     * Handle result selection
     */
    selectResult(element) {
        const id = element.dataset.id;
        const type = element.dataset.type;
        const index = parseInt(element.dataset.index);
        
        const result = this.currentResults.results[index];
        
        this.onResultSelect(result, { id, type });
    }
    
    /**
     * Default result select handler
     */
    defaultResultSelectHandler(result, meta) {
        console.log('Search result selected:', result);
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('searchResultSelected', {
            detail: { result, meta }
        }));
    }
    
    /**
     * Load and display search service status
     */
    async loadSearchStatus() {
        try {
            const status = await this.searchService.getStatus();
            if (status.status === 'operational') {
                this.hideStatus();
            } else {
                this.showError('Search service is not available');
            }
        } catch (error) {
            this.showError('Unable to connect to search service');
        }
    }
    
    /**
     * Focus the search input
     */
    focusSearchInput() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    /**
     * Get current search query
     */
    getCurrentQuery() {
        return this.currentQuery;
    }
    
    /**
     * Get current results
     */
    getCurrentResults() {
        return this.currentResults;
    }
    
    /**
     * Set search query programmatically
     */
    setQuery(query) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = query;
            this.currentQuery = query;
            if (query) {
                this.performSearch(query);
            }
        }
    }
    
    /**
     * Clear search
     */
    clear() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        this.currentQuery = '';
        this.currentResults = [];
        this.hideResults();
        this.hideStatus();
        this.showHistory();
    }
}

export { SearchComponent };

// Make available globally
if (typeof window !== 'undefined') {
    window.SearchComponent = SearchComponent;
}