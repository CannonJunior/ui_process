#!/usr/bin/env python3
"""
MCP Server for Workflow Command Processing
Handles parsing and validation of workflow-specific commands for the Process Flow Designer.
"""

import asyncio
import json
import logging
import re
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple

# MCP imports (assumed to be available)
try:
    from mcp import mcp
    from mcp.server import Server
    from mcp.types import Tool, TextContent
except ImportError:
    # Fallback for development - create mock decorators
    class MockMCP:
        @staticmethod
        def tool(name: str = None, description: str = None):
            def decorator(func):
                func._mcp_tool = True
                func._mcp_name = name or func.__name__
                func._mcp_description = description or func.__doc__
                return func
            return decorator
    
    mcp = MockMCP()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WorkflowCommandServer:
    """MCP Server for processing workflow-specific commands."""
    
    def __init__(self):
        self.command_patterns = {
            # Node Management Commands
            'node-create': r'^/node[-_]?create\s+(\w+)(?:\s+(?:"([^"]+)"|(\w+)))?(?:\s+(\d+),(\d+))?$',
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
            
            # Tag Management Commands
            'tag-create': r'^/tag[-_]?create\s+"([^"]+)"(?:\s+(\w+))?(?:\s+(.+))?$',
            'tag-add': r'^/tag[-_]?add\s+"([^"]+)"\s+(.+)$',
            'tag-remove': r'^/tag[-_]?remove\s+"([^"]+)"\s+(.+)$',
            'tag-list': r'^/tag[-_]?list(?:\s+(.+))?$',
            
            # Workflow Management Commands
            'workflow-save': r'^/workflow[-_]?save(?:\s+"([^"]+)")?$',
            'workflow-load': r'^/workflow[-_]?load\s+"([^"]+)"$',
            'workflow-export': r'^/workflow[-_]?export(?:\s+(\w+))?$',
            'workflow-clear': r'^/workflow[-_]?(?:clear|reset)(?:\s+(yes|confirm))?$',
            'workflow-status': r'^/workflow[-_]?status$',
            'workflow-stats': r'^/workflow[-_]?stats$',
            
            # Matrix and View Commands
            'matrix-enter': r'^/matrix[-_]?enter$',
            'matrix-exit': r'^/matrix[-_]?exit$',
            'matrix-move': r'^/matrix[-_]?move\s+(.+)\s+(\w+[-_]\w+)$',
            'matrix-show': r'^/matrix[-_]?show(?:\s+(\w+[-_]\w+))?$',
            
            # View Operations
            'view-zoom': r'^/view[-_]?zoom\s+(.+)$',
            'view-center': r'^/view[-_]?center(?:\s+"([^"]+)")?$',
            'view-focus': r'^/view[-_]?focus\s+(.+)$',
            
            # Selection Commands
            'select': r'^/select\s+(.+)$',
            'select-all': r'^/select[-_]?all(?:\s+(\w+))?$',
            'select-none': r'^/select[-_]?none$',
            'select-by': r'^/select[-_]?by\s+(.+)$',
            
            # Navigation Commands
            'goto': r'^/goto\s+"([^"]+)"$',
            'find': r'^/find\s+"([^"]+)"$',
            'next': r'^/next(?:\s+(\w+))?$',
            'previous': r'^/previous(?:\s+(\w+))?$',
            
            # Batch Operations
            'batch-create': r'^/batch[-_]?create\s+(\w+)\s+(.+)$',
            'batch-connect': r'^/batch[-_]?connect\s+"([^"]+)"\s+"([^"]+)"$',
            'batch-tag': r'^/batch[-_]?tag\s+"([^"]+)"\s+(.+)$',
        }
        
        # Command descriptions for help system
        self.command_descriptions = {
            # Node Commands
            '/node-create <type> [name] [x,y]': 'Create a new node',
            '/node-delete <identifier>': 'Delete a node',
            '/node-rename <old> <new>': 'Rename a node',
            '/node-move <node> <x,y>': 'Move a node to position',
            '/node-type <node> <type>': 'Change node type',
            
            # Task Commands
            '/task-create <name> [node] [priority]': 'Create a new task',
            '/task-delete <identifier>': 'Delete a task',
            '/task-move <task> <target-node>': 'Move task to node',
            '/task-advance <task> <target-node>': 'Advance task to node',
            '/task-priority <task> <priority>': 'Set task priority',
            
            # Flowline Commands
            '/connect <source> <target> [type]': 'Create flowline between nodes',
            '/disconnect <source> <target>': 'Remove flowline',
            '/flowline-type <source> <target> <type>': 'Change flowline type',
            '/disconnect all': 'Remove all flowlines',
            
            # Tag Commands
            '/tag-create <name> [category] [props]': 'Create a new tag',
            '/tag-add <tag> <element>': 'Add tag to element',
            '/tag-remove <tag> <element>': 'Remove tag from element',
            '/tag-list [filter]': 'List tags',
            
            # Workflow Commands
            '/workflow-save [filename]': 'Save current workflow',
            '/workflow-load <filename>': 'Load workflow file',
            '/workflow-export [format]': 'Export workflow',
            '/workflow-clear [confirm]': 'Clear current workflow',
            '/workflow-status': 'Show workflow status',
            '/workflow-stats': 'Show detailed statistics',
            
            # Matrix Commands
            '/matrix-enter': 'Enter Eisenhower Matrix mode',
            '/matrix-exit': 'Exit matrix mode',
            '/matrix-move <task> <quadrant>': 'Move task in matrix',
            '/matrix-show [quadrant]': 'Show matrix quadrant',
            
            # View Commands
            '/view-zoom <level|in|out|fit>': 'Zoom view',
            '/view-center [node]': 'Center view on element',
            '/view-focus <element>': 'Focus on element',
            
            # Selection Commands
            '/select <identifier>': 'Select element',
            '/select-all [type]': 'Select all elements of type',
            '/select-none': 'Clear selection',
            '/select-by <criteria>': 'Select by criteria',
            
            # Navigation Commands
            '/goto <name>': 'Navigate to element',
            '/find <name>': 'Find element by name',
            '/next [type]': 'Navigate to next element',
            '/previous [type]': 'Navigate to previous element',
            
            # Batch Commands
            '/batch-create <type> <list>': 'Create multiple elements',
            '/batch-connect <sources> <targets>': 'Create multiple connections',
            '/batch-tag <tag> <elements>': 'Tag multiple elements',
        }
        
        # Valid values for various parameters
        self.valid_values = {
            'node_types': ['process', 'decision', 'terminal', 'start'],
            'flowline_types': ['sequence', 'conditional', 'error', 'parallel'],
            'task_priorities': ['low', 'normal', 'high', 'urgent'],
            'matrix_quadrants': [
                'urgent-important', 'urgent-not-important',
                'not-urgent-important', 'not-urgent-not-important'
            ],
            'view_zoom': ['in', 'out', 'fit', 'reset'],
            'element_types': ['node', 'task', 'flowline', 'tag'],
            'export_formats': ['json', 'png', 'svg', 'pdf']
        }
    
    @mcp.tool(
        name="parse_workflow_command",
        description="Parse workflow command to determine action and extract parameters"
    )
    async def parse_workflow_command(self, input_text: str) -> Dict[str, Any]:
        """
        Parse workflow command and extract structured parameters.
        
        Args:
            input_text: Raw command input from chat
        
        Returns:
            Dict containing parsing results and command information
        """
        try:
            input_text = input_text.strip()
            
            # Check if input starts with command prefix
            if not input_text.startswith('/'):
                return {
                    'is_workflow_command': False,
                    'type': 'text',
                    'should_process_with_llm': True
                }
            
            # Try to match against workflow command patterns
            for command_name, pattern in self.command_patterns.items():
                match = re.match(pattern, input_text, re.IGNORECASE)
                if match:
                    parsed_command = self._parse_workflow_match(command_name, match, input_text)
                    parsed_command['original_input'] = input_text
                    return parsed_command
            
            # Check if it's a workflow-related command that doesn't match our patterns
            workflow_keywords = [
                'node', 'task', 'flow', 'tag', 'workflow', 'matrix', 'select', 'view',
                'create', 'delete', 'move', 'connect', 'save', 'load'
            ]
            
            if any(keyword in input_text.lower() for keyword in workflow_keywords):
                return {
                    'is_workflow_command': True,
                    'type': 'unknown_workflow_command',
                    'command': input_text.split()[0],
                    'error': f"Unknown workflow command: {input_text.split()[0]}",
                    'suggestion': self._suggest_similar_workflow_command(input_text.split()[0]),
                    'should_process_with_llm': False
                }
            
            # Not a workflow command
            return {
                'is_workflow_command': False,
                'type': 'non_workflow_command',
                'should_process_with_llm': False
            }
            
        except Exception as e:
            logger.error(f"Error parsing workflow command: {e}")
            return {
                'is_workflow_command': False,
                'type': 'error',
                'error': str(e),
                'should_process_with_llm': True
            }
    
    @mcp.tool(
        name="validate_workflow_command",
        description="Validate workflow command parameters and suggest corrections"
    )
    async def validate_workflow_command(self, command_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate parsed workflow command data.
        
        Args:
            command_data: Parsed command data from parse_workflow_command
        
        Returns:
            Dict containing validation results and suggestions
        """
        try:
            if not command_data.get('is_workflow_command'):
                return {
                    'valid': True,
                    'type': 'non_workflow',
                    'action': 'pass_through'
                }
            
            command_type = command_data.get('command_type')
            parameters = command_data.get('parameters', {})
            
            validation_result = {
                'valid': True,
                'errors': [],
                'warnings': [],
                'suggestions': []
            }
            
            # Validate based on command type
            if command_type == 'node-create':
                node_type = parameters.get('type')
                if node_type and node_type not in self.valid_values['node_types']:
                    validation_result['errors'].append(f"Invalid node type '{node_type}'. Valid types: {', '.join(self.valid_values['node_types'])}")
                    validation_result['valid'] = False
                
                # Validate position if provided
                x, y = parameters.get('x'), parameters.get('y')
                if x is not None and y is not None:
                    if not (0 <= int(x) <= 2000 and 0 <= int(y) <= 2000):
                        validation_result['warnings'].append("Position outside typical canvas bounds")
            
            elif command_type == 'flowline-create':
                flowline_type = parameters.get('type', 'sequence')
                if flowline_type not in self.valid_values['flowline_types']:
                    validation_result['errors'].append(f"Invalid flowline type '{flowline_type}'. Valid types: {', '.join(self.valid_values['flowline_types'])}")
                    validation_result['valid'] = False
            
            elif command_type == 'task-priority':
                priority = parameters.get('priority')
                if priority and priority not in self.valid_values['task_priorities']:
                    validation_result['errors'].append(f"Invalid priority '{priority}'. Valid priorities: {', '.join(self.valid_values['task_priorities'])}")
                    validation_result['valid'] = False
            
            elif command_type == 'matrix-move':
                quadrant = parameters.get('quadrant')
                if quadrant and quadrant not in self.valid_values['matrix_quadrants']:
                    validation_result['errors'].append(f"Invalid matrix quadrant '{quadrant}'. Valid quadrants: {', '.join(self.valid_values['matrix_quadrants'])}")
                    validation_result['valid'] = False
            
            elif command_type == 'workflow-clear':
                if not parameters.get('confirmed'):
                    validation_result['warnings'].append("Destructive operation. Add 'yes' or 'confirm' to proceed")
                    validation_result['suggestions'].append("Use: /workflow-clear yes")
            
            # Add general suggestions for improvement
            if validation_result['valid']:
                validation_result['suggestions'] = self._generate_workflow_suggestions(command_type, parameters)
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Error validating workflow command: {e}")
            return {
                'valid': False,
                'errors': [str(e)]
            }
    
    @mcp.tool(
        name="generate_workflow_help",
        description="Generate help information for workflow commands"
    )
    async def generate_workflow_help(self, command: str = None) -> Dict[str, Any]:
        """
        Generate help information for workflow commands.
        
        Args:
            command: Optional specific command to get help for
        
        Returns:
            Dict containing help information
        """
        try:
            if command:
                # Help for specific workflow command
                command = command.lstrip('/')
                
                # Find matching commands
                matches = []
                for cmd, desc in self.command_descriptions.items():
                    if command.lower() in cmd.lower():
                        matches.append({'command': cmd, 'description': desc})
                
                if matches:
                    return {
                        'type': 'specific_workflow_help',
                        'query': command,
                        'matches': matches,
                        'examples': self._get_workflow_command_examples(command)
                    }
                else:
                    return {
                        'type': 'workflow_command_not_found',
                        'query': command,
                        'suggestion': self._suggest_similar_workflow_command(f"/{command}"),
                        'all_commands': list(self.command_descriptions.keys())
                    }
            else:
                # General workflow help
                categories = {
                    'Node Commands': [cmd for cmd in self.command_descriptions.keys() if 'node' in cmd],
                    'Task Commands': [cmd for cmd in self.command_descriptions.keys() if 'task' in cmd],
                    'Flowline Commands': [cmd for cmd in self.command_descriptions.keys() if any(x in cmd for x in ['flowline', 'connect', 'disconnect'])],
                    'Tag Commands': [cmd for cmd in self.command_descriptions.keys() if 'tag' in cmd],
                    'Workflow Commands': [cmd for cmd in self.command_descriptions.keys() if 'workflow' in cmd],
                    'Matrix Commands': [cmd for cmd in self.command_descriptions.keys() if 'matrix' in cmd],
                    'View Commands': [cmd for cmd in self.command_descriptions.keys() if 'view' in cmd],
                    'Selection Commands': [cmd for cmd in self.command_descriptions.keys() if 'select' in cmd],
                    'Navigation Commands': [cmd for cmd in self.command_descriptions.keys() if any(x in cmd for x in ['goto', 'find', 'next', 'previous'])],
                    'Batch Commands': [cmd for cmd in self.command_descriptions.keys() if 'batch' in cmd]
                }
                
                return {
                    'type': 'general_workflow_help',
                    'categories': categories,
                    'descriptions': self.command_descriptions,
                    'getting_started': [
                        '/node-create process "My Process"',
                        '/task-create "My Task" "My Process"',
                        '/workflow-save "my-workflow"',
                        '/workflow-status'
                    ]
                }
                
        except Exception as e:
            logger.error(f"Error generating workflow help: {e}")
            return {
                'type': 'error',
                'error': str(e)
            }
    
    @mcp.tool(
        name="execute_workflow_command",
        description="Execute validated workflow command and prepare for browser execution"
    )
    async def execute_workflow_command(self, command_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute workflow command validation and prepare structured data for browser execution.
        
        Args:
            command_data: Parsed command data from parse_workflow_command
        
        Returns:
            Dict containing execution readiness and command data for WorkflowBridge
        """
        try:
            if not command_data.get('is_workflow_command'):
                return {
                    'status': 'error',
                    'error': 'Not a workflow command'
                }
            
            # Validate the command first
            validation_result = await self.validate_workflow_command(command_data)
            
            if not validation_result.get('valid', False):
                return {
                    'status': 'error',
                    'error': 'Command validation failed',
                    'errors': validation_result.get('errors', []),
                    'suggestions': validation_result.get('suggestions', [])
                }
            
            # Prepare command data for WorkflowBridge execution
            action = command_data.get('action')
            parameters = command_data.get('parameters', {})
            
            # Structure the command data for the browser WorkflowBridge
            workflow_command = {
                'action': action,
                'parameters': parameters,
                'command_type': command_data.get('command_type'),
                'original_input': command_data.get('original_input', '')
            }
            
            return {
                'status': 'ready_for_execution',
                'command_data': workflow_command,
                'validation': validation_result,
                'message': f"Executing {command_data.get('command_type', 'workflow command')}..."
            }
            
        except Exception as e:
            logger.error(f"Error executing workflow command: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    # Helper methods
    
    def _parse_workflow_match(self, command_name: str, match: re.Match, original_input: str) -> Dict[str, Any]:
        """Parse regex match into structured workflow command data."""
        groups = match.groups()
        
        result = {
            'is_workflow_command': True,
            'command_type': command_name,
            'parameters': {},
            'raw_params': groups
        }
        
        # Parse based on command type
        if command_name == 'node-create':
            # Handle both quoted and unquoted names
            name = groups[1] if groups[1] else (groups[2] if groups[2] else None)
            result['parameters'] = {
                'type': groups[0] if groups[0] else 'process',
                'name': name,
                'x': groups[3] if groups[3] else None,
                'y': groups[4] if groups[4] else None
            }
            result['action'] = 'create_node'
            
        elif command_name == 'node-delete':
            result['parameters'] = {'identifier': groups[0]}
            result['action'] = 'delete_node'
            
        elif command_name == 'node-rename':
            result['parameters'] = {'old_name': groups[0], 'new_name': groups[1]}
            result['action'] = 'rename_node'
            
        elif command_name == 'node-move':
            result['parameters'] = {'identifier': groups[0], 'x': groups[1], 'y': groups[2]}
            result['action'] = 'move_node'
            
        elif command_name == 'task-create':
            result['parameters'] = {
                'name': groups[0],
                'node': groups[1] if groups[1] else None,
                'priority': groups[2] if groups[2] else 'normal'
            }
            result['action'] = 'create_task'
            
        elif command_name == 'flowline-create':
            result['parameters'] = {
                'source': groups[0],
                'target': groups[1],
                'type': groups[2] if groups[2] else 'sequence'
            }
            result['action'] = 'create_flowline'
            
        elif command_name == 'workflow-save':
            result['parameters'] = {'filename': groups[0] if groups[0] else None}
            result['action'] = 'save_workflow'
            
        elif command_name == 'workflow-status':
            result['parameters'] = {}
            result['action'] = 'show_workflow_status'
            
        elif command_name == 'matrix-enter':
            result['parameters'] = {}
            result['action'] = 'enter_matrix_mode'
            
        elif command_name == 'matrix-exit':
            result['parameters'] = {}
            result['action'] = 'exit_matrix_mode'
            
        elif command_name == 'matrix-move':
            result['parameters'] = {'task': groups[0], 'quadrant': groups[1]}
            result['action'] = 'move_task_in_matrix'
            
        elif command_name == 'task-delete':
            result['parameters'] = {'identifier': groups[0]}
            result['action'] = 'delete_task'
            
        elif command_name == 'task-move':
            result['parameters'] = {'task': groups[0], 'target_node': groups[1]}
            result['action'] = 'move_task'
            
        elif command_name == 'task-advance':
            result['parameters'] = {'task': groups[0], 'target_node': groups[1]}
            result['action'] = 'advance_task'
            
        elif command_name == 'task-priority':
            result['parameters'] = {'task': groups[0], 'priority': groups[1]}
            result['action'] = 'set_task_priority'
            
        elif command_name == 'flowline-delete':
            result['parameters'] = {'source': groups[0], 'target': groups[1]}
            result['action'] = 'delete_flowline'
            
        elif command_name == 'flowline-type':
            result['parameters'] = {'source': groups[0], 'target': groups[1], 'type': groups[2]}
            result['action'] = 'change_flowline_type'
            
        elif command_name == 'disconnect-all':
            result['parameters'] = {}
            result['action'] = 'disconnect_all_flowlines'
            
        elif command_name == 'tag-create':
            result['parameters'] = {
                'name': groups[0],
                'category': groups[1] if groups[1] else 'general',
                'properties': groups[2] if groups[2] else None
            }
            result['action'] = 'create_tag'
            
        elif command_name == 'tag-add':
            result['parameters'] = {'tag': groups[0], 'element': groups[1]}
            result['action'] = 'add_tag'
            
        elif command_name == 'tag-remove':
            result['parameters'] = {'tag': groups[0], 'element': groups[1]}
            result['action'] = 'remove_tag'
            
        elif command_name == 'tag-list':
            result['parameters'] = {'filter': groups[0] if groups[0] else None}
            result['action'] = 'list_tags'
            
        elif command_name == 'workflow-load':
            result['parameters'] = {'filename': groups[0]}
            result['action'] = 'load_workflow'
            
        elif command_name == 'workflow-export':
            result['parameters'] = {'format': groups[0] if groups[0] else 'json'}
            result['action'] = 'export_workflow'
            
        elif command_name == 'workflow-clear':
            result['parameters'] = {'confirmed': groups[0] == 'yes' or groups[0] == 'confirm' if groups[0] else False}
            result['action'] = 'clear_workflow'
            
        elif command_name == 'workflow-stats':
            result['parameters'] = {}
            result['action'] = 'show_workflow_stats'
            
        elif command_name == 'view-zoom':
            result['parameters'] = {'level': groups[0]}
            result['action'] = 'zoom_view'
            
        elif command_name == 'view-center':
            result['parameters'] = {'target': groups[0] if groups[0] else None}
            result['action'] = 'center_view'
            
        elif command_name == 'view-focus':
            result['parameters'] = {'element': groups[0]}
            result['action'] = 'focus_element'
            
        elif command_name == 'select':
            result['parameters'] = {'target': groups[0]}
            result['action'] = 'select_element'
            
        elif command_name == 'select-all':
            result['parameters'] = {'type': groups[0] if groups[0] else None}
            result['action'] = 'select_all'
            
        elif command_name == 'select-none':
            result['parameters'] = {}
            result['action'] = 'clear_selection'
            
        elif command_name == 'select-by':
            result['parameters'] = {'criteria': groups[0]}
            result['action'] = 'select_by_criteria'
            
        elif command_name == 'goto':
            result['parameters'] = {'target': groups[0]}
            result['action'] = 'navigate_to_element'
            
        elif command_name == 'find':
            result['parameters'] = {'query': groups[0]}
            result['action'] = 'find_element'
            
        elif command_name == 'next':
            result['parameters'] = {'type': groups[0] if groups[0] else None}
            result['action'] = 'navigate_next'
            
        elif command_name == 'previous':
            result['parameters'] = {'type': groups[0] if groups[0] else None}
            result['action'] = 'navigate_previous'
            
        elif command_name == 'batch-create':
            result['parameters'] = {'type': groups[0], 'data': groups[1]}
            result['action'] = 'batch_create_elements'
            
        elif command_name == 'batch-connect':
            result['parameters'] = {'sources': groups[0], 'targets': groups[1]}
            result['action'] = 'batch_connect_elements'
            
        elif command_name == 'batch-tag':
            result['parameters'] = {'tag': groups[0], 'elements': groups[1]}
            result['action'] = 'batch_tag_elements'
            
        # Default case for unhandled commands
        else:
            result['action'] = f"handle_{command_name.replace('-', '_')}"
        
        return result
    
    def _suggest_similar_workflow_command(self, unknown_command: str) -> Optional[str]:
        """Suggest similar workflow command for unknown input."""
        unknown = unknown_command.lower().lstrip('/')
        
        # Simple fuzzy matching
        best_match = None
        best_score = 0
        
        for cmd in self.command_descriptions.keys():
            cmd_clean = cmd.lower().lstrip('/')
            
            # Calculate simple similarity (common characters)
            common = len(set(unknown) & set(cmd_clean))
            score = common / max(len(unknown), len(cmd_clean))
            
            if score > best_score and score > 0.3:
                best_score = score
                best_match = cmd
        
        return best_match
    
    def _generate_workflow_suggestions(self, command_type: str, parameters: Dict[str, Any]) -> List[str]:
        """Generate suggestions for improving workflow commands."""
        suggestions = []
        
        if command_type == 'node-create':
            if not parameters.get('name'):
                suggestions.append("Consider adding a descriptive name in quotes")
            if not parameters.get('x') or not parameters.get('y'):
                suggestions.append("Add x,y coordinates to position the node precisely")
        
        elif command_type == 'flowline-create':
            if parameters.get('type') == 'sequence':
                suggestions.append("Consider using 'conditional' for decision-based flows")
        
        elif command_type == 'task-create':
            if not parameters.get('node'):
                suggestions.append("Specify target node to automatically associate the task")
        
        return suggestions
    
    def _get_workflow_command_examples(self, command: str) -> List[str]:
        """Get example usage for a workflow command."""
        examples = {
            'node': [
                '/node-create process "User Registration"',
                '/node-create decision "Age Check" 300,200',
                '/node-delete "User Registration"',
                '/node-rename "Old Name" "New Name"'
            ],
            'task': [
                '/task-create "Validate email" "User Registration"',
                '/task-move "Validate email" "Email Processing"',
                '/task-priority "Urgent Task" high'
            ],
            'flowline': [
                '/connect "Registration" "Validation" sequence',
                '/connect "Age Check" "Adult Process" conditional',
                '/disconnect "Old Connection" "Target"'
            ],
            'workflow': [
                '/workflow-save "user-registration-v1"',
                '/workflow-status',
                '/workflow-clear yes'
            ],
            'matrix': [
                '/matrix-enter',
                '/matrix-move "Important Task" urgent-important',
                '/matrix-show urgent-not-important'
            ]
        }
        
        # Find examples for command or similar commands
        for key, example_list in examples.items():
            if key in command.lower():
                return example_list
        
        return []


async def main():
    """Main entry point for the MCP server."""
    server = WorkflowCommandServer()
    
    logger.info("Workflow command MCP server initialized")
    
    # Example usage for testing
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Test command parsing
        test_inputs = [
            '/node-create process "User Registration"',
            '/task-create "Validate email" "Registration"',
            '/connect "Registration" "Validation" sequence',
            '/workflow-save "my-flow"',
            '/matrix-enter',
            '/unknown-workflow-command'
        ]
        
        for test_input in test_inputs:
            print(f"\nTesting: {test_input}")
            result = await server.parse_workflow_command(test_input)
            print(f"Result: {json.dumps(result, indent=2)}")


if __name__ == "__main__":
    asyncio.run(main())