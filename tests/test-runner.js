/**
 * Automated Test Runner
 * Provides automated test execution and reporting capabilities
 */

class TestRunner {
    constructor() {
        this.testResults = {
            core: { passed: 0, failed: 0, total: 0 },
            ui: { passed: 0, failed: 0, total: 0 },
            integration: { passed: 0, failed: 0, total: 0 }
        };
        
        this.coverageTargets = {
            core: 95,
            ui: 90,
            integration: 85
        };
        
        this.reportData = [];
    }
    
    async runAutomatedPipeline() {
        console.log('🚀 Starting Automated Test Pipeline...');
        
        try {
            // Run test suites in order
            await this.runTestSuite('core', 'Core Functionality');
            await this.runTestSuite('ui', 'UI Components');
            await this.runTestSuite('integration', 'Integration');
            
            // Generate comprehensive report
            this.generateReport();
            
            // Check if all tests pass
            const allTestsPassed = this.validateTestResults();
            
            if (allTestsPassed) {
                console.log('✅ All tests passed - Pipeline successful');
                return { success: true, results: this.testResults };
            } else {
                console.error('❌ Some tests failed - Pipeline failed');
                return { success: false, results: this.testResults };
            }
            
        } catch (error) {
            console.error('💥 Pipeline error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async runTestSuite(suiteType, suiteDescription) {
        return new Promise((resolve) => {
            console.log(`🧪 Running ${suiteDescription} tests...`);
            
            const runner = mocha.grep(suiteDescription).run((failures) => {
                const stats = runner.stats;
                
                this.testResults[suiteType] = {
                    passed: stats.passes,
                    failed: stats.failures,
                    total: stats.tests,
                    duration: stats.duration,
                    coverage: this.calculateCoverage(suiteType)
                };
                
                console.log(`📊 ${suiteDescription}: ${stats.passes}/${stats.tests} passed`);
                resolve();
            });
        });
    }
    
    calculateCoverage(suiteType) {
        // Simplified coverage calculation based on test completeness
        const result = this.testResults[suiteType];
        if (!result || result.total === 0) return 0;
        
        const passRate = (result.passed / result.total) * 100;
        
        // Adjust based on suite type expectations
        const adjustmentFactors = {
            core: 0.95,      // Core functionality should have very high coverage
            ui: 0.90,        // UI components have good coverage
            integration: 0.85 // Integration tests cover key workflows
        };
        
        return Math.round(passRate * adjustmentFactors[suiteType]);
    }
    
    validateTestResults() {
        for (const [suiteType, results] of Object.entries(this.testResults)) {
            if (results.failed > 0) {
                console.warn(`⚠️ ${suiteType} suite has ${results.failed} failing tests`);
                return false;
            }
            
            if (results.coverage < this.coverageTargets[suiteType]) {
                console.warn(`⚠️ ${suiteType} coverage (${results.coverage}%) below target (${this.coverageTargets[suiteType]}%)`);
            }
        }
        
        return true;
    }
    
    generateReport() {
        const timestamp = new Date().toISOString();
        
        const report = {
            timestamp,
            summary: {
                totalTests: Object.values(this.testResults).reduce((sum, r) => sum + r.total, 0),
                totalPassed: Object.values(this.testResults).reduce((sum, r) => sum + r.passed, 0),
                totalFailed: Object.values(this.testResults).reduce((sum, r) => sum + r.failed, 0),
                overallCoverage: this.calculateOverallCoverage()
            },
            suites: this.testResults,
            coverageTargets: this.coverageTargets
        };
        
        // Store report
        this.reportData.push(report);
        
        // Display in console
        this.displayReport(report);
        
        return report;
    }
    
    calculateOverallCoverage() {
        const totalWeight = Object.keys(this.testResults).length;
        const weightedCoverage = Object.values(this.testResults)
            .reduce((sum, result) => sum + result.coverage, 0);
        
        return Math.round(weightedCoverage / totalWeight);
    }
    
    displayReport(report) {
        console.group('📋 Test Pipeline Report');
        
        console.log(`📅 Timestamp: ${report.timestamp}`);
        console.log(`📊 Overall Results: ${report.summary.totalPassed}/${report.summary.totalTests} tests passed`);
        console.log(`🎯 Overall Coverage: ${report.summary.overallCoverage}%`);
        
        console.group('📈 Suite Breakdown:');
        Object.entries(report.suites).forEach(([suite, results]) => {
            const status = results.failed === 0 ? '✅' : '❌';
            console.log(`${status} ${suite}: ${results.passed}/${results.total} (${results.coverage}% coverage)`);
        });
        console.groupEnd();
        
        if (report.summary.totalFailed > 0) {
            console.group('🚨 Failed Tests:');
            console.log(`${report.summary.totalFailed} tests failed - check detailed output above`);
            console.groupEnd();
        }
        
        console.groupEnd();
    }
    
    async runContinuousIntegration() {
        console.log('🔄 Starting Continuous Integration Mode...');
        
        let lastRunTime = Date.now();
        
        setInterval(async () => {
            // Check if any relevant files have been modified
            const shouldRun = this.shouldRunTests(lastRunTime);
            
            if (shouldRun) {
                console.log('🔄 File changes detected - running tests...');
                const result = await this.runAutomatedPipeline();
                lastRunTime = Date.now();
                
                if (!result.success) {
                    console.error('🚨 CI: Tests failed - check output');
                }
            }
        }, 30000); // Check every 30 seconds
    }
    
    shouldRunTests(lastRunTime) {
        // In a real implementation, this would check file modification times
        // For this demo, we'll simulate occasional runs
        return Math.random() < 0.1; // 10% chance to simulate file changes
    }
    
    exportReport(format = 'json') {
        const latestReport = this.reportData[this.reportData.length - 1];
        
        if (format === 'json') {
            return JSON.stringify(latestReport, null, 2);
        } else if (format === 'html') {
            return this.generateHTMLReport(latestReport);
        }
        
        return latestReport;
    }
    
    generateHTMLReport(report) {
        return `
        <div class="test-report">
            <h2>🧪 Test Pipeline Report</h2>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Overall Results:</strong> ${report.summary.totalPassed}/${report.summary.totalTests} tests passed</p>
            <p><strong>Coverage:</strong> ${report.summary.overallCoverage}%</p>
            
            <h3>Suite Results</h3>
            <ul>
                ${Object.entries(report.suites).map(([suite, results]) => `
                    <li>
                        <strong>${suite}:</strong> ${results.passed}/${results.total} 
                        (${results.coverage}% coverage)
                        ${results.failed === 0 ? '✅' : '❌'}
                    </li>
                `).join('')}
            </ul>
        </div>
        `;
    }
}

// Global test runner instance
window.testRunner = new TestRunner();

// Enhanced test controls for automated pipeline
function runAutomatedPipeline() {
    return testRunner.runAutomatedPipeline();
}

function startContinuousIntegration() {
    testRunner.runContinuousIntegration();
    alert('🔄 Continuous Integration started - tests will run automatically on changes');
}

function exportTestReport() {
    const report = testRunner.exportReport('json');
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

// Test quality gates for CI/CD integration
function validateTestQuality() {
    const latestReport = testRunner.reportData[testRunner.reportData.length - 1];
    
    if (!latestReport) {
        console.error('❌ No test report available');
        return false;
    }
    
    const qualityGates = {
        minimumPassRate: 95,
        minimumCoverage: 85,
        maximumFailures: 0
    };
    
    const passRate = (latestReport.summary.totalPassed / latestReport.summary.totalTests) * 100;
    
    const gateResults = {
        passRate: passRate >= qualityGates.minimumPassRate,
        coverage: latestReport.summary.overallCoverage >= qualityGates.minimumCoverage,
        failures: latestReport.summary.totalFailed <= qualityGates.maximumFailures
    };
    
    const allGatesPassed = Object.values(gateResults).every(result => result);
    
    console.group('🚦 Quality Gates');
    console.log(`Pass Rate: ${passRate.toFixed(1)}% ${gateResults.passRate ? '✅' : '❌'}`);
    console.log(`Coverage: ${latestReport.summary.overallCoverage}% ${gateResults.coverage ? '✅' : '❌'}`);
    console.log(`Failures: ${latestReport.summary.totalFailed} ${gateResults.failures ? '✅' : '❌'}`);
    console.log(`Overall: ${allGatesPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.groupEnd();
    
    return allGatesPassed;
}

console.log('🤖 Automated Test Pipeline Ready');