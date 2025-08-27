/**
 * Search Service
 * Frontend service for vector and text search functionality
 */

import { getAPIClient } from './api-client.js';

class SearchService {
    constructor() {
        this.apiClient = getAPIClient();
        this.searchHistory = [];
        this.maxHistorySize = 20;
        this.searchCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Load search history from localStorage
        this.loadSearchHistory();
        
        console.log('🔍 Search service initialized');
    }
    
    /**
     * Perform hybrid search (combines text and semantic search)
     */
    async search(query, options = {}) {
        if (!query || query.trim().length === 0) {
            return { results: [], total: 0, query: '', searchType: 'hybrid' };
        }
        
        const cleanQuery = query.trim();
        const cacheKey = this.generateCacheKey(cleanQuery, options);
        
        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('🎯 Returning cached search results');
            return cached;
        }
        
        try {
            console.log(`🔍 Performing hybrid search: "${cleanQuery}"`);
            
            const searchOptions = {
                limit: 10,
                entityTypes: ['workflow', 'opportunity', 'node', 'task'],
                ...options
            };
            
            const results = await this.apiClient.hybridSearch(cleanQuery, searchOptions);
            
            // Add to search history
            this.addToHistory(cleanQuery, results.total);
            
            // Cache results
            this.addToCache(cacheKey, results);
            
            console.log(`✅ Search complete: ${results.total} results found`);
            return results;
            
        } catch (error) {
            console.error('Search failed:', error);
            throw new Error(`Search failed: ${error.message}`);
        }
    }
    
    /**
     * Perform semantic search only
     */
    async semanticSearch(query, options = {}) {
        if (!query || query.trim().length === 0) {
            return { results: [], total: 0, query: '', searchType: 'semantic' };
        }
        
        try {
            const results = await this.apiClient.semanticSearch(query.trim(), options);
            this.addToHistory(query.trim(), results.total, 'semantic');
            return results;
        } catch (error) {
            console.error('Semantic search failed:', error);
            throw error;
        }
    }
    
    /**
     * Perform text search only
     */
    async textSearch(query, options = {}) {
        if (!query || query.trim().length === 0) {
            return { results: [], total: 0, query: '', searchType: 'text' };
        }
        
        try {
            const results = await this.apiClient.textSearch(query.trim(), options);
            this.addToHistory(query.trim(), results.total, 'text');
            return results;
        } catch (error) {
            console.error('Text search failed:', error);
            throw error;
        }
    }
    
    /**
     * Generate embedding for text
     */
    async generateEmbedding(text, entityType = 'text') {
        try {
            return await this.apiClient.generateEmbedding(text, entityType);
        } catch (error) {
            console.error('Embedding generation failed:', error);
            throw error;
        }
    }
    
    /**
     * Get search service status
     */
    async getStatus() {
        try {
            return await this.apiClient.getSearchStatus();
        } catch (error) {
            console.error('Failed to get search status:', error);
            return {
                status: 'error',
                textSearch: 'unavailable',
                semanticSearch: 'unavailable',
                error: error.message
            };
        }
    }
    
    /**
     * Search with autocomplete suggestions
     */
    async searchWithSuggestions(query, options = {}) {
        const results = await this.search(query, options);
        
        // Generate suggestions based on results and history
        const suggestions = this.generateSuggestions(query, results);
        
        return {
            ...results,
            suggestions
        };
    }
    
    /**
     * Filter results by entity type
     */
    filterResultsByType(results, entityTypes) {
        if (!entityTypes || entityTypes.length === 0) {
            return results;
        }
        
        return {
            ...results,
            results: results.results.filter(result => entityTypes.includes(result.type))
        };
    }
    
    /**
     * Sort results by relevance, date, or type
     */
    sortResults(results, sortBy = 'relevance') {
        const sortedResults = [...results.results];
        
        switch (sortBy) {
            case 'relevance':
                // Already sorted by API (semantic first, then text)
                break;
                
            case 'date':
                sortedResults.sort((a, b) => {
                    const dateA = new Date(a.created_at || a.updated_at || 0);
                    const dateB = new Date(b.created_at || b.updated_at || 0);
                    return dateB - dateA;
                });
                break;
                
            case 'type':
                sortedResults.sort((a, b) => {
                    const typeOrder = { workflow: 1, opportunity: 2, node: 3, task: 4 };
                    return (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5);
                });
                break;
                
            case 'similarity':
                sortedResults.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
                break;
        }
        
        return {
            ...results,
            results: sortedResults
        };
    }
    
    // ===== SEARCH HISTORY MANAGEMENT =====
    
    addToHistory(query, resultCount, searchType = 'hybrid') {
        const historyItem = {
            query,
            resultCount,
            searchType,
            timestamp: new Date().toISOString()
        };
        
        // Remove duplicate queries
        this.searchHistory = this.searchHistory.filter(item => item.query !== query);
        
        // Add to beginning
        this.searchHistory.unshift(historyItem);
        
        // Limit history size
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
        
        // Save to localStorage
        this.saveSearchHistory();
    }
    
    getSearchHistory() {
        return [...this.searchHistory];
    }
    
    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
    }
    
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('ui_process_search_history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load search history:', error);
            this.searchHistory = [];
        }
    }
    
    saveSearchHistory() {
        try {
            localStorage.setItem('ui_process_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Failed to save search history:', error);
        }
    }
    
    // ===== CACHE MANAGEMENT =====
    
    generateCacheKey(query, options) {
        const optionsStr = JSON.stringify({
            entityTypes: options.entityTypes || [],
            workflowId: options.workflowId || null,
            limit: options.limit || 10
        });
        return `${query}::${optionsStr}`;
    }
    
    addToCache(key, results) {
        this.searchCache.set(key, {
            results,
            timestamp: Date.now()
        });
        
        // Clean old cache entries
        this.cleanCache();
    }
    
    getFromCache(key) {
        const cached = this.searchCache.get(key);
        if (!cached) return null;
        
        const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
        if (isExpired) {
            this.searchCache.delete(key);
            return null;
        }
        
        return cached.results;
    }
    
    cleanCache() {
        const now = Date.now();
        for (const [key, cached] of this.searchCache.entries()) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.searchCache.delete(key);
            }
        }
    }
    
    clearCache() {
        this.searchCache.clear();
    }
    
    // ===== SUGGESTION GENERATION =====
    
    generateSuggestions(query, results) {
        const suggestions = [];
        
        // Add suggestions based on search results
        results.results.slice(0, 3).forEach(result => {
            if (result.title && !suggestions.includes(result.title)) {
                suggestions.push(result.title);
            }
        });
        
        // Add suggestions from search history
        this.searchHistory
            .filter(item => item.query.toLowerCase().includes(query.toLowerCase()) && item.query !== query)
            .slice(0, 2)
            .forEach(item => {
                if (!suggestions.includes(item.query)) {
                    suggestions.push(item.query);
                }
            });
        
        return suggestions.slice(0, 5);
    }
    
    // ===== UTILITY METHODS =====
    
    isAvailable() {
        return this.apiClient.isConnected();
    }
    
    getSearchStats() {
        return {
            historyCount: this.searchHistory.length,
            cacheSize: this.searchCache.size,
            recentSearches: this.searchHistory.slice(0, 5).map(item => ({
                query: item.query,
                resultCount: item.resultCount,
                searchType: item.searchType
            }))
        };
    }
    
    // Format results for display
    formatResultForDisplay(result) {
        const baseResult = {
            id: result.id,
            type: result.type,
            title: result.title || result.name || result.text || 'Untitled',
            description: result.description || '',
            searchType: result.searchType || 'text',
            similarity: result.similarity
        };
        
        // Add type-specific formatting
        switch (result.type) {
            case 'workflow':
                return {
                    ...baseResult,
                    icon: '🔄',
                    subtitle: `Workflow • Version ${result.version || '1.0.0'}`,
                    metadata: `Created: ${this.formatDate(result.created_at)}`
                };
                
            case 'opportunity':
                return {
                    ...baseResult,
                    icon: '💼',
                    subtitle: `Opportunity • ${result.status || 'Active'}`,
                    metadata: `Priority: ${result.priority || 'Medium'}`
                };
                
            case 'node':
                return {
                    ...baseResult,
                    icon: '🔹',
                    subtitle: `Node • ${result.node_type || 'Unknown'}`,
                    metadata: result.workflow_name ? `In: ${result.workflow_name}` : ''
                };
                
            case 'task':
                return {
                    ...baseResult,
                    icon: '✓',
                    subtitle: `Task • ${result.status || 'Not Started'}`,
                    metadata: `Priority: ${result.priority || 'Medium'}`
                };
                
            default:
                return {
                    ...baseResult,
                    icon: '📄',
                    subtitle: result.type || 'Item',
                    metadata: ''
                };
        }
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (error) {
            return '';
        }
    }
}

// Create singleton instance
let searchServiceInstance = null;

export function getSearchService() {
    if (!searchServiceInstance) {
        searchServiceInstance = new SearchService();
    }
    return searchServiceInstance;
}

export { SearchService };

// Make available globally
if (typeof window !== 'undefined') {
    window.SearchService = SearchService;
    window.getSearchService = getSearchService;
}