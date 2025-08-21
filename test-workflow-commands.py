#!/usr/bin/env python3
"""
Test script for all copy-paste commands in docs/workflow-commands.md
Extracts commands from documentation and tests them against the MCP service.
"""

import re
import requests
import json
import sys
import time
from pathlib import Path

class WorkflowCommandTester:
    def __init__(self):
        self.base_url = "http://localhost:3001"
        self.commands = []
        self.results = {
            "passed": [],
            "failed": [],
            "errors": []
        }
        
    def extract_commands_from_docs(self, docs_path):
        """Extract all copy-paste commands from the documentation."""
        print(f"📖 Reading documentation from: {docs_path}")
        
        with open(docs_path, 'r') as f:
            content = f.read()
        
        # Find all code blocks with copy-paste examples
        code_blocks = re.findall(r'```\n(.*?)\n```', content, re.DOTALL)
        
        commands = []
        for block in code_blocks:
            lines = block.strip().split('\n')
            for line in lines:
                line = line.strip()
                # Skip comments and empty lines
                if line.startswith('#') or not line or not line.startswith('/'):
                    continue
                commands.append(line)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_commands = []
        for cmd in commands:
            if cmd not in seen:
                seen.add(cmd)
                unique_commands.append(cmd)
        
        self.commands = unique_commands
        print(f"📝 Extracted {len(self.commands)} unique commands")
        return self.commands
    
    def check_mcp_service(self):
        """Check if MCP service is running."""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                print("✅ MCP service is running")
                return True
            else:
                print(f"❌ MCP service health check failed: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ Cannot connect to MCP service: {e}")
            return False
    
    def test_command(self, command):
        """Test a single command against the MCP service."""
        try:
            # Create payload with proper JSON handling
            payload = {"message": command}
            
            # Test workflow command parsing first
            response = requests.post(
                f"{self.base_url}/api/mcp/parse-workflow-command",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            # Handle rate limiting
            if response.status_code == 429:
                time.sleep(2)  # Wait 2 seconds for rate limit
                response = requests.post(
                    f"{self.base_url}/api/mcp/parse-workflow-command",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
            
            if response.status_code != 200:
                return False, f"HTTP {response.status_code}: {response.text[:100]}"
            
            try:
                result = response.json()
            except:
                return False, f"Invalid JSON response: {response.text[:100]}"
            
            # Check if it's recognized as a workflow command
            if not result.get('is_workflow_command', False):
                # Try parsing as regular command
                response2 = requests.post(
                    f"{self.base_url}/api/mcp/parse-message",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                
                if response2.status_code == 200:
                    try:
                        result2 = response2.json()
                        if result2.get('is_command', False):
                            return True, f"Regular command: {result2.get('command_type', 'unknown')}"
                    except:
                        pass
                
                error_msg = result.get('error', 'Unknown error')
                return False, f"Not recognized: {error_msg[:100]}"
            
            # Command was recognized
            command_type = result.get('command_type', 'unknown')
            return True, f"Workflow command: {command_type}"
            
        except requests.exceptions.RequestException as e:
            return False, f"Network error: {str(e)[:100]}"
        except Exception as e:
            return False, f"Unexpected error: {str(e)[:100]}"
    
    def run_tests(self):
        """Run tests on all extracted commands."""
        if not self.check_mcp_service():
            print("🛑 MCP service is not available. Please start it with: npm start")
            return False
        
        print(f"\n🧪 Testing {len(self.commands)} commands...\n")
        
        for i, command in enumerate(self.commands, 1):
            print(f"[{i:3d}/{len(self.commands)}] Testing: {command}")
            
            success, message = self.test_command(command)
            
            if success:
                print(f"    ✅ PASS - {message}")
                self.results["passed"].append(command)
            else:
                print(f"    ❌ FAIL - {message}")
                self.results["failed"].append((command, message))
            
            # Delay to avoid rate limiting
            time.sleep(0.5)
        
        return True
    
    def print_summary(self):
        """Print test summary."""
        total = len(self.commands)
        passed = len(self.results["passed"])
        failed = len(self.results["failed"])
        
        print(f"\n{'='*60}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total commands tested: {total}")
        print(f"✅ Passed: {passed} ({passed/total*100:.1f}%)")
        print(f"❌ Failed: {failed} ({failed/total*100:.1f}%)")
        
        if self.results["failed"]:
            print(f"\n❌ FAILED COMMANDS:")
            print(f"{'-'*60}")
            for command, error in self.results["failed"]:
                print(f"Command: {command}")
                print(f"Error:   {error}")
                print()
        
        if self.results["passed"]:
            print(f"\n✅ PASSED COMMANDS:")
            print(f"{'-'*60}")
            for command in self.results["passed"]:
                print(f"  {command}")
    
    def save_results(self, output_file):
        """Save detailed results to a file."""
        results_data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_commands": len(self.commands),
            "passed_count": len(self.results["passed"]),
            "failed_count": len(self.results["failed"]),
            "passed_commands": self.results["passed"],
            "failed_commands": [{"command": cmd, "error": err} for cmd, err in self.results["failed"]],
            "all_commands": self.commands
        }
        
        with open(output_file, 'w') as f:
            json.dump(results_data, f, indent=2)
        
        print(f"\n💾 Detailed results saved to: {output_file}")
    
    def get_failed_commands(self):
        """Return list of failed commands for fixing."""
        return [cmd for cmd, _ in self.results["failed"]]

def main():
    print("🚀 Workflow Commands Documentation Tester")
    print("="*50)
    
    docs_path = Path("docs/workflow-commands.md")
    if not docs_path.exists():
        print(f"❌ Documentation file not found: {docs_path}")
        sys.exit(1)
    
    tester = WorkflowCommandTester()
    
    # Extract commands from documentation
    commands = tester.extract_commands_from_docs(docs_path)
    
    if not commands:
        print("❌ No commands found in documentation")
        sys.exit(1)
    
    # Run tests
    if not tester.run_tests():
        sys.exit(1)
    
    # Print summary
    tester.print_summary()
    
    # Save results
    results_file = "test-results-workflow-commands.json"
    tester.save_results(results_file)
    
    # Exit with error code if there were failures
    if tester.results["failed"]:
        print(f"\n⚠️  {len(tester.results['failed'])} commands need to be fixed!")
        sys.exit(1)
    else:
        print(f"\n🎉 All commands passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()