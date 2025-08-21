#!/usr/bin/env python3
import requests
import json

def test_specific_commands():
    commands = ["/commands", "/status"]
    
    for cmd in commands:
        print(f"\n=== Testing: {cmd} ===")
        
        # Test as workflow command
        try:
            resp1 = requests.post(
                "http://localhost:3001/api/mcp/parse-workflow-command",
                json={"message": cmd},
                timeout=5
            )
            print(f"Workflow test - Status: {resp1.status_code}")
            if resp1.status_code == 200:
                result1 = resp1.json()
                print(f"Workflow result: {result1}")
                if result1.get('is_workflow_command'):
                    print("✅ Recognized as workflow command")
                    continue
        except Exception as e:
            print(f"Workflow test error: {e}")
        
        # Test as regular command
        try:
            resp2 = requests.post(
                "http://localhost:3001/api/mcp/parse-message",
                json={"message": cmd},
                timeout=5
            )
            print(f"Regular test - Status: {resp2.status_code}")
            if resp2.status_code == 200:
                result2 = resp2.json()
                print(f"Regular result: {result2}")
                if result2.get('is_command'):
                    print("✅ Recognized as regular command")
                else:
                    print("❌ Not recognized as any command")
            else:
                print(f"❌ HTTP error: {resp2.status_code}")
        except Exception as e:
            print(f"Regular test error: {e}")

if __name__ == "__main__":
    test_specific_commands()