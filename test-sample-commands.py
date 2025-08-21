#!/usr/bin/env python3
"""
Focused test script to identify command parsing issues.
Tests a small sample of commands to understand the problems.
"""

import requests
import json
import time

def test_command(command):
    """Test a single command."""
    try:
        print(f"Testing: {command}")
        
        # Test as workflow command
        response = requests.post(
            "http://localhost:3001/api/mcp/parse-workflow-command",
            json={"message": command},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text[:200]}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('is_workflow_command'):
                print(f"  ✅ Recognized as workflow command: {result.get('command_type')}")
                return True
            else:
                print(f"  ❌ Not workflow command: {result.get('error', 'Unknown')}")
        
        # Test as regular command  
        response2 = requests.post(
            "http://localhost:3001/api/mcp/parse-message",
            json={"message": command},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response2.status_code == 200:
            result2 = response2.json()
            if result2.get('is_command'):
                print(f"  ✅ Recognized as regular command: {result2.get('command_type')}")
                return True
            else:
                print(f"  ❌ Not any command: {result2.get('error', 'Unknown')}")
        
        return False
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """Test a focused set of commands to identify patterns."""
    test_commands = [
        # Basic commands that should work
        "/node-create process",
        "/node-create process TestNode",
        
        # Commands with quotes that are failing
        '/node-create process "Test Node"',
        "/node-create process \"Test Node\"",
        
        # Help commands
        "/help",
        "/status",
        
        # Complex commands
        "/task-create \"Test Task\" \"Test Node\" high",
        "/connect \"Start\" \"End\"",
    ]
    
    print("🔬 Focused Command Testing")
    print("=" * 40)
    
    for i, cmd in enumerate(test_commands, 1):
        print(f"\n[{i}] {cmd}")
        test_command(cmd)
        time.sleep(1)  # Avoid rate limiting

if __name__ == "__main__":
    main()