#!/usr/bin/env python3
"""
Debug script to test workflow command parsing
"""

import re

# Copy the command patterns from workflow-command-server.py
command_patterns = {
    # Node Management Commands
    'node-create': r'^/node[-_]?create\s+(\w+)(?:\s+"([^"]+)")?(?:\s+(\d+),(\d+))?$',
    'node-delete': r'^/(?:node[-_]?delete|delete[-_]?node|remove[-_]?node)\s+(.+)$',
    'node-rename': r'^/node[-_]?rename\s+"([^"]+)"\s+"([^"]+)"$',
    'node-move': r'^/node[-_]?move\s+(.+)\s+(\d+),(\d+)$',
    'node-type': r'^/node[-_]?type\s+(.+)\s+(\w+)$',
    
    # Task Management Commands
    'task-create': r'^/(?:task[-_]?create|add[-_]?task|create[-_]?task)\s+"([^"]+)"(?:\s+"([^"]+)")?(?:\s+(\w+))?$',
    'task-delete': r'^/task[-_]?delete\s+(.+)$',
    'task-move': r'^/task[-_]?move\s+(.+)\s+"([^"]+)"$',
    'task-advance': r'^/task[-_]?advance\s+(.+)\s+"([^"]+)"$',
    'task-priority': r'^/task[-_]?priority\s+(.+)\s+(\w+)$',
    
    # Flowline Management Commands
    'flowline-create': r'^/(?:flowline[-_]?create|connect)\s+"([^"]+)"\s+"([^"]+)"(?:\s+(\w+))?$',
    'flowline-delete': r'^/(?:flowline[-_]?delete|disconnect)\s+"([^"]+)"\s+"([^"]+)"$',
    'flowline-type': r'^/flowline[-_]?type\s+"([^"]+)"\s+"([^"]+)"\s+(\w+)$',
    'disconnect-all': r'^/disconnect\s+all$',
}

def test_command_parsing(test_input):
    """Test command parsing logic"""
    print(f"\n🧪 Testing: '{test_input}'")
    
    matches = []
    for command_name, pattern in command_patterns.items():
        match = re.match(pattern, test_input, re.IGNORECASE)
        if match:
            matches.append({
                'command': command_name,
                'pattern': pattern,
                'groups': match.groups()
            })
            print(f"✅ MATCH: {command_name}")
            print(f"   Groups: {match.groups()}")
    
    if not matches:
        print("❌ NO MATCHES")
    elif len(matches) > 1:
        print(f"⚠️  MULTIPLE MATCHES ({len(matches)})!")
        for match in matches:
            print(f"   - {match['command']}: {match['groups']}")
    
    return matches

if __name__ == "__main__":
    # Test the problematic command
    test_commands = [
        '/node-create process "Test Node"',
        '/node-create process',
        '/connect "Node A" "Node B"',
        '/flowline-create "Node A" "Node B"',
        '/task-create "Test Task"',
    ]
    
    print("🔍 Debugging Workflow Command Parsing")
    print("=" * 50)
    
    for cmd in test_commands:
        test_command_parsing(cmd)
    
    print("\n" + "=" * 50)
    print("✅ Debug complete")