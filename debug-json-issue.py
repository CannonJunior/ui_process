#!/usr/bin/env python3
import requests
import json

def test_json_issue():
    """Debug the JSON parsing issue."""
    
    # Test different ways of sending the command
    test_commands = [
        '/node-create process "Test Node"',
        '/task-create "Test Task" "Test Node" high',
        '/connect "Start" "End"'
    ]
    
    for cmd in test_commands:
        print(f"\n=== Testing: {cmd} ===")
        
        # Method 1: Normal JSON
        try:
            payload = {"message": cmd}
            print(f"Payload: {json.dumps(payload)}")
            
            response = requests.post(
                "http://localhost:3001/api/mcp/parse-workflow-command",
                json=payload,
                timeout=5
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text[:200]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_json_issue()