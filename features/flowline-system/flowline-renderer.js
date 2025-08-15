/**
 * Flowline Renderer
 * Specialized rendering and visual effects for flowlines
 * 
 * SAFETY: Pure rendering logic with SVG manipulation
 * Risk Level: LOW - Visual rendering with no state side effects
 */

class FlowlineRenderer {
    constructor(configService = null) {
        this.configService = configService;
        this.renderingConfig = this.initializeRenderingConfig();
        
        console.log('FlowlineRenderer: Initialized');
    }
    
    /**
     * Initialize rendering configuration
     * @returns {Object} Rendering configuration
     */
    initializeRenderingConfig() {
        return {
            arrow: {
                size: 8,
                angle: Math.PI / 6 // 30 degrees
            },
            styles: {
                straight: {
                    stroke: '#333',
                    strokeWidth: 2,
                    fill: 'none',
                    markerEnd: 'url(#arrowhead)'
                },
                perpendicular: {
                    stroke: '#333',
                    strokeWidth: 2,
                    fill: 'none',
                    markerEnd: 'url(#arrowhead)'
                },
                curved: {
                    stroke: '#333',
                    strokeWidth: 2,
                    fill: 'none',
                    markerEnd: 'url(#arrowhead)'
                },
                highlighted: {
                    stroke: '#007bff',
                    strokeWidth: 3,
                    opacity: 0.8
                }
            },
            animation: {
                duration: 300,
                easing: 'ease-in-out'
            }
        };
    }
    
    /**
     * Apply styles to a flowline element
     * @param {SVGElement} element - Flowline path element
     * @param {string} type - Flowline type
     * @param {Object} customStyles - Custom style overrides
     */
    applyFlowlineStyles(element, type = 'straight', customStyles = {}) {
        if (!element) return;
        
        const baseStyles = this.renderingConfig.styles[type] || this.renderingConfig.styles.straight;
        const styles = { ...baseStyles, ...customStyles };
        
        // Apply styles to SVG element
        Object.entries(styles).forEach(([property, value]) => {
            const svgProperty = this.convertCSSPropertyToSVG(property);
            element.setAttribute(svgProperty, value);
        });
    }
    
    /**
     * Convert CSS property names to SVG attribute names
     * @param {string} cssProperty - CSS property name
     * @returns {string} SVG attribute name
     */
    convertCSSPropertyToSVG(cssProperty) {
        const propertyMap = {
            strokeWidth: 'stroke-width',
            markerEnd: 'marker-end',
            fillOpacity: 'fill-opacity',
            strokeOpacity: 'stroke-opacity'
        };
        
        return propertyMap[cssProperty] || cssProperty;
    }
    
    /**
     * Create SVG definitions for flowline arrows and markers
     * @param {SVGElement} svg - SVG element to add definitions to
     */
    createFlowlineDefinitions(svg) {
        if (!svg) return;
        
        // Check if definitions already exist
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.appendChild(defs);
        }
        
        // Create arrowhead marker
        this.createArrowheadMarker(defs);
        
        // Create other flowline markers
        this.createHighlightedArrowMarker(defs);
    }
    
    /**
     * Create arrowhead marker definition
     * @param {SVGElement} defs - SVG defs element
     */
    createArrowheadMarker(defs) {
        // Check if arrowhead already exists
        if (defs.querySelector('#arrowhead')) return;
        
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#333');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
    }
    
    /**
     * Create highlighted arrow marker definition
     * @param {SVGElement} defs - SVG defs element
     */
    createHighlightedArrowMarker(defs) {
        // Check if highlighted arrowhead already exists
        if (defs.querySelector('#arrowhead-highlighted')) return;
        
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead-highlighted');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#007bff');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
    }
    
    /**
     * Generate advanced path data with custom options
     * @param {number} sourceX - Source X coordinate
     * @param {number} sourceY - Source Y coordinate
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @param {string} type - Flowline type
     * @param {Object} options - Rendering options
     * @returns {string} SVG path data
     */
    generateAdvancedPathData(sourceX, sourceY, targetX, targetY, type, options = {}) {
        const {
            curvature = 50,
            cornerRadius = 10,
            offset = { x: 0, y: 0 }
        } = options;
        
        // Apply offset
        const adjSourceX = sourceX + offset.x;
        const adjSourceY = sourceY + offset.y;
        const adjTargetX = targetX + offset.x;
        const adjTargetY = targetY + offset.y;
        
        switch (type) {
            case 'perpendicular':
                return this.generatePerpendicularPath(adjSourceX, adjSourceY, adjTargetX, adjTargetY, cornerRadius);
                
            case 'curved':
                return this.generateCurvedPath(adjSourceX, adjSourceY, adjTargetX, adjTargetY, curvature);
                
            case 'bezier':
                return this.generateBezierPath(adjSourceX, adjSourceY, adjTargetX, adjTargetY);
                
            case 'stepped':
                return this.generateSteppedPath(adjSourceX, adjSourceY, adjTargetX, adjTargetY);
                
            case 'straight':
            default:
                return `M ${adjSourceX} ${adjSourceY} L ${adjTargetX} ${adjTargetY}`;
        }
    }
    
    /**
     * Generate perpendicular path with optional corner radius
     * @param {number} sourceX - Source X coordinate
     * @param {number} sourceY - Source Y coordinate
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @param {number} cornerRadius - Corner radius for rounded corners
     * @returns {string} SVG path data
     */
    generatePerpendicularPath(sourceX, sourceY, targetX, targetY, cornerRadius = 0) {
        const midX = sourceX + (targetX - sourceX) / 2;
        
        if (cornerRadius > 0) {
            // Create path with rounded corners
            const r = Math.min(cornerRadius, Math.abs(targetX - midX) / 2, Math.abs(targetY - sourceY) / 2);
            
            if (targetY > sourceY) {
                // Going down
                return `M ${sourceX} ${sourceY} 
                        L ${midX - r} ${sourceY} 
                        Q ${midX} ${sourceY} ${midX} ${sourceY + r}
                        L ${midX} ${targetY - r}
                        Q ${midX} ${targetY} ${midX + r} ${targetY}
                        L ${targetX} ${targetY}`;
            } else {
                // Going up
                return `M ${sourceX} ${sourceY} 
                        L ${midX - r} ${sourceY} 
                        Q ${midX} ${sourceY} ${midX} ${sourceY - r}
                        L ${midX} ${targetY + r}
                        Q ${midX} ${targetY} ${midX + r} ${targetY}
                        L ${targetX} ${targetY}`;
            }
        } else {
            // Sharp corners
            return `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
        }
    }
    
    /**
     * Generate curved path using quadratic bezier
     * @param {number} sourceX - Source X coordinate
     * @param {number} sourceY - Source Y coordinate
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @param {number} curvature - Curvature amount
     * @returns {string} SVG path data
     */
    generateCurvedPath(sourceX, sourceY, targetX, targetY, curvature = 50) {
        const controlX = sourceX + (targetX - sourceX) / 2;
        const controlY = sourceY + (targetY - sourceY) / 2 - curvature;
        
        return `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
    }
    
    /**
     * Generate bezier path with automatic control points
     * @param {number} sourceX - Source X coordinate
     * @param {number} sourceY - Source Y coordinate
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {string} SVG path data
     */
    generateBezierPath(sourceX, sourceY, targetX, targetY) {
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        
        // Calculate control points for smooth S-curve
        const control1X = sourceX + dx * 0.33;
        const control1Y = sourceY;
        const control2X = sourceX + dx * 0.66;
        const control2Y = targetY;
        
        return `M ${sourceX} ${sourceY} C ${control1X} ${control1Y} ${control2X} ${control2Y} ${targetX} ${targetY}`;
    }
    
    /**
     * Generate stepped path
     * @param {number} sourceX - Source X coordinate
     * @param {number} sourceY - Source Y coordinate
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {string} SVG path data
     */
    generateSteppedPath(sourceX, sourceY, targetX, targetY) {
        const stepSize = 20;
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const steps = Math.floor(Math.max(Math.abs(dx), Math.abs(dy)) / stepSize);
        
        if (steps <= 1) {
            return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
        }
        
        let path = `M ${sourceX} ${sourceY}`;
        
        for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const x = sourceX + dx * progress;
            const y = sourceY + dy * progress;
            
            // Add small step offset
            const stepOffset = (i % 2) * 5;
            path += ` L ${x + stepOffset} ${y}`;
        }
        
        path += ` L ${targetX} ${targetY}`;
        return path;
    }
    
    /**
     * Add animation to a flowline element
     * @param {SVGElement} element - Flowline path element
     * @param {string} animationType - Type of animation
     * @param {Object} options - Animation options
     */
    animateFlowline(element, animationType = 'draw', options = {}) {
        if (!element) return;
        
        const {
            duration = this.renderingConfig.animation.duration,
            easing = this.renderingConfig.animation.easing,
            delay = 0
        } = options;
        
        switch (animationType) {
            case 'draw':
                this.animateFlowlineDraw(element, duration, easing, delay);
                break;
                
            case 'highlight':
                this.animateFlowlineHighlight(element, duration, easing, delay);
                break;
                
            case 'pulse':
                this.animateFlowlinePulse(element, duration, easing, delay);
                break;
                
            case 'fade':
                this.animateFlowlineFade(element, duration, easing, delay);
                break;
        }
    }
    
    /**
     * Animate flowline drawing effect
     * @param {SVGElement} element - Flowline path element
     * @param {number} duration - Animation duration
     * @param {string} easing - Animation easing
     * @param {number} delay - Animation delay
     */
    animateFlowlineDraw(element, duration, easing, delay) {
        const pathLength = element.getTotalLength();
        
        // Set initial state
        element.style.strokeDasharray = pathLength;
        element.style.strokeDashoffset = pathLength;
        element.style.transition = `stroke-dashoffset ${duration}ms ${easing}`;
        
        // Trigger animation
        setTimeout(() => {
            element.style.strokeDashoffset = '0';
        }, delay);
        
        // Clean up after animation
        setTimeout(() => {
            element.style.strokeDasharray = '';
            element.style.strokeDashoffset = '';
            element.style.transition = '';
        }, delay + duration);
    }
    
    /**
     * Animate flowline highlight effect
     * @param {SVGElement} element - Flowline path element
     * @param {number} duration - Animation duration
     * @param {string} easing - Animation easing
     * @param {number} delay - Animation delay
     */
    animateFlowlineHighlight(element, duration, easing, delay) {
        const originalStroke = element.getAttribute('stroke');
        const originalWidth = element.getAttribute('stroke-width');
        
        element.style.transition = `stroke ${duration}ms ${easing}, stroke-width ${duration}ms ${easing}`;
        
        setTimeout(() => {
            element.setAttribute('stroke', '#007bff');
            element.setAttribute('stroke-width', '3');
            element.setAttribute('marker-end', 'url(#arrowhead-highlighted)');
        }, delay);
        
        // Revert after animation
        setTimeout(() => {
            element.setAttribute('stroke', originalStroke);
            element.setAttribute('stroke-width', originalWidth);
            element.setAttribute('marker-end', 'url(#arrowhead)');
            element.style.transition = '';
        }, delay + duration);
    }
    
    /**
     * Animate flowline pulse effect
     * @param {SVGElement} element - Flowline path element
     * @param {number} duration - Animation duration
     * @param {string} easing - Animation easing
     * @param {number} delay - Animation delay
     */
    animateFlowlinePulse(element, duration, easing, delay) {
        element.style.animation = `flowline-pulse ${duration}ms ${easing} ${delay}ms infinite`;
        
        // Add CSS animation if not exists
        this.addPulseAnimation();
        
        // Stop animation after some time
        setTimeout(() => {
            element.style.animation = '';
        }, delay + duration * 3);
    }
    
    /**
     * Animate flowline fade effect
     * @param {SVGElement} element - Flowline path element
     * @param {number} duration - Animation duration
     * @param {string} easing - Animation easing
     * @param {number} delay - Animation delay
     */
    animateFlowlineFade(element, duration, easing, delay) {
        element.style.transition = `opacity ${duration}ms ${easing}`;
        
        setTimeout(() => {
            element.style.opacity = '0.3';
        }, delay);
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transition = '';
        }, delay + duration);
    }
    
    /**
     * Add CSS animation for pulse effect
     */
    addPulseAnimation() {
        const styleId = 'flowline-pulse-animation';
        
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes flowline-pulse {
                0%, 100% { stroke-width: 2; opacity: 1; }
                50% { stroke-width: 4; opacity: 0.7; }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Calculate optimal connection points for nodes
     * @param {HTMLElement} sourceNode - Source node element
     * @param {HTMLElement} targetNode - Target node element
     * @returns {Object} Connection points {source: {x, y}, target: {x, y}}
     */
    calculateConnectionPoints(sourceNode, targetNode) {
        if (!sourceNode || !targetNode) return null;
        
        const sourceRect = sourceNode.getBoundingClientRect();
        const targetRect = targetNode.getBoundingClientRect();
        
        // Calculate center points
        const sourceCenterX = sourceRect.left + sourceRect.width / 2;
        const sourceCenterY = sourceRect.top + sourceRect.height / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;
        
        // Calculate angle between nodes
        const angle = Math.atan2(targetCenterY - sourceCenterY, targetCenterX - sourceCenterX);
        
        // Calculate edge connection points
        const sourcePoint = this.getNodeEdgePoint(sourceRect, angle);
        const targetPoint = this.getNodeEdgePoint(targetRect, angle + Math.PI);
        
        return {
            source: sourcePoint,
            target: targetPoint
        };
    }
    
    /**
     * Get connection point on node edge based on angle
     * @param {DOMRect} nodeRect - Node bounding rectangle
     * @param {number} angle - Connection angle in radians
     * @returns {Object} Connection point {x, y}
     */
    getNodeEdgePoint(nodeRect, angle) {
        const centerX = nodeRect.left + nodeRect.width / 2;
        const centerY = nodeRect.top + nodeRect.height / 2;
        const halfWidth = nodeRect.width / 2;
        const halfHeight = nodeRect.height / 2;
        
        // Normalize angle
        const normalizedAngle = angle % (2 * Math.PI);
        
        // Determine which edge the line intersects
        const cos = Math.cos(normalizedAngle);
        const sin = Math.sin(normalizedAngle);
        
        let x, y;
        
        if (Math.abs(cos) > Math.abs(sin)) {
            // Intersects left or right edge
            x = centerX + (cos > 0 ? halfWidth : -halfWidth);
            y = centerY + (halfWidth * sin / Math.abs(cos));
        } else {
            // Intersects top or bottom edge
            x = centerX + (halfHeight * cos / Math.abs(sin));
            y = centerY + (sin > 0 ? halfHeight : -halfHeight);
        }
        
        return { x, y };
    }
    
    /**
     * Update rendering configuration
     * @param {Object} newConfig - New configuration values
     */
    updateRenderingConfig(newConfig) {
        this.renderingConfig = { ...this.renderingConfig, ...newConfig };
    }
    
    /**
     * Get current rendering configuration
     * @returns {Object} Current rendering configuration
     */
    getRenderingConfig() {
        return { ...this.renderingConfig };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlowlineRenderer;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.FlowlineRenderer = FlowlineRenderer;
}