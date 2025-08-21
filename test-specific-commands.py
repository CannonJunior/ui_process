#!/usr/bin/env python3
import requests
import json
import time

class SpecificTester:
    def __init__(self):
        self.base_url = "http://localhost:3001"
    
    def test_command(self, command):
        """Test a single command using the same logic as the main test script."""
        try:
            # Create payload with proper JSON handling
            payload = {"message": command}
            
            print(f"Testing: {command}")
            print(f"Payload: {json.dumps(payload)}")
            
            # Test workflow command parsing first
            response = requests.post(
                f"{self.base_url}/api/mcp/parse-workflow-command",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            print(f"Workflow response status: {response.status_code}")
            print(f"Workflow response: {response.text}")
            
            if response.status_code != 200:
                return False, f"HTTP {response.status_code}: {response.text[:100]}"
            
            try:
                result = response.json()
            except:
                return False, f"Invalid JSON response: {response.text[:100]}"
            
            print(f"Workflow result: {result}")
            
            # Check if it's recognized as a workflow command
            if not result.get('is_workflow_command', False):
                print("Not a workflow command, trying regular command...")
                
                # Try parsing as regular command
                response2 = requests.post(
                    f"{self.base_url}/api/mcp/parse-message",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                
                print(f"Regular response status: {response2.status_code}")
                print(f"Regular response: {response2.text}")
                
                if response2.status_code == 200:
                    try:
                        result2 = response2.json()
                        print(f"Regular result: {result2}")
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

def main():
    tester = SpecificTester()
    
    commands = ["/commands", "/status"]
    
    for cmd in commands:
        print(f"\n{'='*50}")
        success, message = tester.test_command(cmd)
        print(f"Result: {'PASS' if success else 'FAIL'} - {message}")
        time.sleep(1)

if __name__ == "__main__":
    main()