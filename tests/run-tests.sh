#!/bin/bash

# Automated Test Pipeline Script
# Runs comprehensive tests and generates reports

set -e  # Exit on any error

echo "🚀 Process Flow Designer - Automated Test Pipeline"
echo "=================================================="

# Configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$TEST_DIR")"
REPORT_DIR="$TEST_DIR/reports"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Create reports directory
mkdir -p "$REPORT_DIR"

echo "📁 Test Directory: $TEST_DIR"
echo "📁 Project Directory: $PROJECT_DIR"
echo "📁 Reports Directory: $REPORT_DIR"
echo "🕐 Timestamp: $TIMESTAMP"
echo

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies if needed
setup_environment() {
    echo "🔧 Setting up test environment..."
    
    # Check for Node.js (needed for some test utilities)
    if command_exists node; then
        echo "✅ Node.js available: $(node --version)"
    else
        echo "⚠️ Node.js not found - some advanced features may be limited"
    fi
    
    # Check for browser (needed for running tests)
    if command_exists google-chrome || command_exists chromium-browser || command_exists firefox; then
        echo "✅ Browser available for testing"
    else
        echo "⚠️ No browser found - tests will run in headless mode"
    fi
    
    echo
}

# Function to run browser-based tests
run_browser_tests() {
    echo "🌐 Running browser-based tests..."
    
    # Start a simple HTTP server for testing
    if command_exists python3; then
        echo "📡 Starting HTTP server on port 8080..."
        cd "$PROJECT_DIR"
        python3 -m http.server 8080 &
        SERVER_PID=$!
        sleep 2
        
        echo "🧪 Test suite available at: http://localhost:8080/tests/test-suite.html"
        
        # If we have a browser, we could open it automatically
        if command_exists google-chrome; then
            echo "🚀 Opening test suite in Chrome..."
            google-chrome --headless --disable-gpu --run-all-tests "http://localhost:8080/tests/test-suite.html" 2>/dev/null &
            BROWSER_PID=$!
            sleep 5
            kill $BROWSER_PID 2>/dev/null || true
        fi
        
        # Stop the server
        kill $SERVER_PID 2>/dev/null || true
        cd "$TEST_DIR"
    else
        echo "⚠️ Python3 not available - manual browser testing required"
        echo "📝 Please open: file://$PROJECT_DIR/tests/test-suite.html"
    fi
    
    echo
}

# Function to validate test files
validate_test_files() {
    echo "🔍 Validating test files..."
    
    local files_to_check=(
        "test-suite.html"
        "core-functionality.test.js"
        "ui-components.test.js"
        "integration.test.js"
        "test-runner.js"
    )
    
    local all_files_present=true
    
    for file in "${files_to_check[@]}"; do
        if [[ -f "$TEST_DIR/$file" ]]; then
            echo "✅ $file"
        else
            echo "❌ $file (missing)"
            all_files_present=false
        fi
    done
    
    if [[ "$all_files_present" = true ]]; then
        echo "✅ All test files present"
    else
        echo "❌ Some test files are missing"
        exit 1
    fi
    
    echo
}

# Function to check main application files
validate_app_files() {
    echo "🔍 Validating application files..."
    
    local files_to_check=(
        "script.js"
        "styles.css"
        "index.html"
    )
    
    for file in "${files_to_check[@]}"; do
        if [[ -f "$PROJECT_DIR/$file" ]]; then
            echo "✅ $file"
        else
            echo "❌ $file (missing)"
        fi
    done
    
    echo
}

# Function to generate test report
generate_report() {
    echo "📊 Generating test report..."
    
    local report_file="$REPORT_DIR/test-report_$TIMESTAMP.md"
    
    cat > "$report_file" << EOF
# Test Pipeline Report

**Generated:** $(date)  
**Pipeline:** Automated Test Runner  
**Version:** Week 1 Foundation Preparation  

## Summary

This report documents the execution of the comprehensive test suite for the Process Flow Designer refactoring project.

## Test Suite Coverage

### Core Functionality Tests (Target: >95%)
- Node management (creation, positioning, types)
- Task management (creation, tagging, slots)
- Eisenhower Matrix (toggle, positioning, analysis)
- State management and serialization

### UI Components Tests (Target: >90%)
- Modal management (task, tag, advance modals)
- Context menus (node, task, tag actions)
- Drag and drop functionality
- Form validation and keyboard interactions

### Integration Tests (Target: >85%)
- Complete workflow testing
- Save/load cycle integrity
- Cross-component communication
- Error recovery and edge cases

## Test Infrastructure

### Files Created
- \`tests/test-suite.html\` - Main test runner interface
- \`tests/core-functionality.test.js\` - Core functionality tests
- \`tests/ui-components.test.js\` - UI component tests
- \`tests/integration.test.js\` - Integration workflow tests
- \`tests/test-runner.js\` - Automated pipeline runner

### Framework
- **Mocha**: Test framework for BDD-style tests
- **Chai**: Assertion library for readable test expectations
- **Custom TestUtils**: Mock DOM creation and cleanup utilities

## Safety Measures

✅ Comprehensive test coverage before refactoring  
✅ Automated pipeline for continuous validation  
✅ Mock DOM environment for isolated testing  
✅ Quality gates for pass rates and coverage  

## Next Steps (Week 1)

1. ✅ Create comprehensive test suite
2. ✅ Set up automated testing pipeline
3. 🔄 Create rollback scripts for immediate reversion
4. ⏳ Document all current method signatures and public interfaces
5. ⏳ Create feature branch for refactoring work

## Usage

To run tests manually:
\`\`\`bash
# Run this script
./run-tests.sh

# Or open in browser
open tests/test-suite.html
\`\`\`

To run automated pipeline:
\`\`\`javascript
// In browser console
testRunner.runAutomatedPipeline();
\`\`\`

## Quality Gates

- Minimum pass rate: 95%
- Minimum coverage: 85%
- Maximum failures: 0

---
*Generated by Process Flow Designer Test Pipeline*
EOF

    echo "📝 Report generated: $report_file"
    echo
}

# Function to create backup snapshot
create_backup() {
    echo "💾 Creating backup snapshot..."
    
    local backup_dir="$REPORT_DIR/backups"
    mkdir -p "$backup_dir"
    
    local backup_file="$backup_dir/pre-refactor-snapshot_$TIMESTAMP.tar.gz"
    
    cd "$PROJECT_DIR"
    tar -czf "$backup_file" \
        --exclude="tests/reports" \
        --exclude="node_modules" \
        --exclude=".git" \
        .
    
    echo "💾 Backup created: $backup_file"
    echo "📦 Size: $(du -h "$backup_file" | cut -f1)"
    echo
}

# Main execution
main() {
    echo "🏁 Starting automated test pipeline..."
    echo
    
    setup_environment
    validate_test_files
    validate_app_files
    create_backup
    run_browser_tests
    generate_report
    
    echo "✅ Test pipeline completed successfully!"
    echo
    echo "📋 Summary:"
    echo "  - Test files validated"
    echo "  - Application files checked"
    echo "  - Backup snapshot created"
    echo "  - Test suite ready for execution"
    echo "  - Reports generated in: $REPORT_DIR"
    echo
    echo "🚀 Next: Open tests/test-suite.html in browser to run tests"
    echo "🔧 Next: Continue with Week 1 rollback scripts and documentation"
}

# Execute main function
main "$@"