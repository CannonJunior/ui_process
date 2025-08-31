#!/usr/bin/env python3
"""
MCP Server for Chat Command Processing
Handles command parsing and routing for the workflow application's chat interface.
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


class ChatCommandServer:
    """MCP Server for processing chat commands and routing to appropriate handlers."""
    
    def __init__(self):
        self.command_patterns = {
            # Note-taking commands
            'note': r'^/note(?:\s+(.+))?$',
            'note-create': r'^/note[-_]?create\s+(.+)$',
            'note-search': r'^/note[-_]?search\s+(.+)$',
            'note-find': r'^/note[-_]?find\s+(.+)$',
            'note-tag': r'^/note[-_]?tag\s+(\S+)\s+(.+)$',
            'note-list': r'^/note[-_]?list(?:\s+(.*))?$',
            'note-link': r'^/note[-_]?link\s+(\S+)\s+(\S+)$',
            
            # Opportunity commands  
            'opp': r'^/opp(?:\s+(.+))?$',
            'opp-create': r'^/opp[-_]?create\s+(.+)$',
            'opp-list': r'^/opp[-_]?list(?:\s+(.*))?$',
            'opp-link': r'^/opp[-_]?link\s+(\S+)\s+(\S+)$',
            'opp-search': r'^/opp[-_]?search\s+(.+)$',
            
            # Task commands
            'task-note': r'^/task[-_]?note\s+(\S+)\s+(.+)$',
            'task-link': r'^/task[-_]?link\s+(\S+)\s+(\S+)$',
            
            # Analysis commands
            'analyze': r'^/analyze\s+(.+)$',
            'suggest': r'^/suggest(?:\s+(.+))?$',
            'associate': r'^/associate\s+(\S+)\s+(\S+)$',
            
            # Database commands
            'sql': r'^/sql\s+(?:"([^"]+)"|(.+))$',
            'db-query': r'^/db[-_]?query\s+(?:"([^"]+)"|(.+))$',
            
            # Help and info commands
            'help': r'^/help(?:\s+(.*))?$',
            'commands': r'^/commands$',
            'status': r'^/status$'
        }
        
        # Command descriptions for help system
        self.command_descriptions = {
            '/note': 'General note operations',
            '/note-create &lt;content&gt;': 'Create a new note',
            '/note-search &lt;query&gt;': 'Search notes by content',
            '/note-find &lt;query&gt;': 'Find notes (alias for search)',
            '/note-tag &lt;note_id&gt; &lt;tags&gt;': 'Add tags to a note',
            '/note-list [filters]': 'List notes with optional filters',
            '/note-link &lt;note_id&gt; &lt;target_id&gt;': 'Link note to opportunity/task',
            
            '/opp': 'General opportunity operations',
            '/opp-create &lt;title&gt;': 'Create a new opportunity',
            '/opp-list [filters]': 'List opportunities',
            '/opp-link &lt;opp_id&gt; &lt;target_id&gt;': 'Link opportunity to task/workflow',
            '/opp-search &lt;query&gt;': 'Search opportunities',
            
            '/task-note &lt;task_id&gt; &lt;content&gt;': 'Create note for specific task',
            '/task-link &lt;task_id&gt; &lt;note_id&gt;': 'Link task to note',
            
            '/analyze &lt;text&gt;': 'Analyze text for potential associations',
            '/suggest [context]': 'Get suggestions for current context',
            '/associate &lt;id1&gt; &lt;id2&gt;': 'Create association between items',
            
            '/sql &lt;query&gt;': 'Execute PostgreSQL query directly',
            '/db-query &lt;query&gt;': 'Execute PostgreSQL query (alias for /sql)',
            
            '/help [command]': 'Show help information',
            '/commands': 'List all available commands',
            '/status': 'Show system status',
            
            # Workflow Commands (Node Management)
            '/node-create &lt;type&gt; [name] [x,y]': 'Create a new node (process, decision, terminal)',
            '/node-delete &lt;identifier&gt;': 'Delete a node by name or ID',
            '/node-rename &lt;old&gt; &lt;new&gt;': 'Rename a node',
            '/node-move &lt;node&gt; &lt;x,y&gt;': 'Move a node to position',
            '/node-type &lt;node&gt; &lt;type&gt;': 'Change node type',
            
            # Workflow Commands (Task Management)
            '/task-create &lt;name&gt; [node] [priority]': 'Create a new task',
            '/task-delete &lt;identifier&gt;': 'Delete a task',
            '/task-move &lt;task&gt; &lt;target-node&gt;': 'Move task to node',
            '/task-advance &lt;task&gt; &lt;target-node&gt;': 'Advance task to node',
            '/task-priority &lt;task&gt; &lt;priority&gt;': 'Set task priority (low, normal, high, urgent)',
            
            # Workflow Commands (Flowlines)
            '/connect &lt;source&gt; &lt;target&gt; [type]': 'Create flowline between nodes',
            '/disconnect &lt;source&gt; &lt;target&gt;': 'Remove flowline',
            '/flowline-type &lt;source&gt; &lt;target&gt; &lt;type&gt;': 'Change flowline type',
            '/disconnect all': 'Remove all flowlines',
            
            # Workflow Commands (Tags)
            '/tag-create &lt;name&gt; [category] [props]': 'Create a new tag',
            '/tag-add &lt;tag&gt; &lt;element&gt;': 'Add tag to element',
            '/tag-remove &lt;tag&gt; &lt;element&gt;': 'Remove tag from element',
            '/tag-list [filter]': 'List tags',
            
            # Workflow Commands (Workflow Management)
            '/workflow-save [filename]': 'Save current workflow',
            '/workflow-load &lt;filename&gt;': 'Load workflow file',
            '/workflow-export [format]': 'Export workflow (json, png, svg, pdf)',
            '/workflow-clear [confirm]': 'Clear/reset workflow',
            '/workflow-status': 'Show workflow statistics',
            '/workflow-stats': 'Show detailed workflow stats',
            
            # Workflow Commands (Matrix & Views)
            '/matrix-enter': 'Enter Eisenhower Matrix mode',
            '/matrix-exit': 'Exit Eisenhower Matrix mode',
            '/matrix-move &lt;task&gt; &lt;quadrant&gt;': 'Move task in matrix',
            '/matrix-show [quadrant]': 'Show matrix quadrant',
            
            # Workflow Commands (View & Navigation)
            '/view-zoom &lt;level&gt;': 'Zoom view (in, out, fit, reset)',
            '/view-center [node]': 'Center view on node',
            '/view-focus &lt;element&gt;': 'Focus on element',
            '/select &lt;element&gt;': 'Select element',
            '/select-all [type]': 'Select all elements of type',
            '/select-none': 'Clear selection',
            '/goto &lt;node&gt;': 'Navigate to node',
            '/find &lt;name&gt;': 'Find element by name'
        }
    
    @mcp.tool(
        name="parse_chat_input",
        description="Parse chat input to determine if it's a command or regular text"
    )
    async def parse_chat_input(self, input_text: str) -> Dict[str, Any]:
        """
        Parse chat input to identify commands and extract parameters.
        
        Args:
            input_text: Raw input from chat interface
        
        Returns:
            Dict containing parsing results and command information
        """
        try:
            input_text = input_text.strip()
            
            # Check if input starts with command prefix
            if not input_text.startswith('/'):
                return {
                    'is_command': False,
                    'type': 'text',
                    'content': input_text,
                    'should_process_with_llm': True
                }
            
            # Try to match against known command patterns
            for command_name, pattern in self.command_patterns.items():
                match = re.match(pattern, input_text, re.IGNORECASE)
                if match:
                    parsed_command = self._parse_command_match(command_name, match, input_text)
                    parsed_command['original_input'] = input_text
                    return parsed_command
            
            # Unknown command
            return {
                'is_command': True,
                'type': 'unknown_command',
                'command': input_text.split()[0],
                'error': f"Unknown command: {input_text.split()[0]}",
                'suggestion': self._suggest_similar_command(input_text.split()[0]),
                'should_process_with_llm': False
            }
            
        except Exception as e:
            logger.error(f"Error parsing chat input: {e}")
            return {
                'is_command': False,
                'type': 'error',
                'error': str(e),
                'should_process_with_llm': True
            }
    
    @mcp.tool(
        name="validate_command",
        description="Validate command parameters and suggest corrections"
    )
    async def validate_command(self, command_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate parsed command data and provide suggestions for corrections.
        
        Args:
            command_data: Parsed command data from parse_chat_input
        
        Returns:
            Dict containing validation results and suggestions
        """
        try:
            if not command_data.get('is_command'):
                return {
                    'valid': True,
                    'type': 'text',
                    'action': 'process_with_llm'
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
            if command_type in ['note-create', 'note']:
                content = parameters.get('content')
                if not content or len(content.strip()) < 3:
                    validation_result['errors'].append("Note content too short (minimum 3 characters)")
                    validation_result['valid'] = False
                
                if len(content) > 10000:
                    validation_result['warnings'].append("Note content is very long (>10k chars)")
            
            elif command_type in ['note-search', 'note-find', 'opp-search']:
                query = parameters.get('query')
                if not query or len(query.strip()) < 2:
                    validation_result['errors'].append("Search query too short (minimum 2 characters)")
                    validation_result['valid'] = False
            
            elif command_type == 'opp-create':
                title = parameters.get('title')
                if not title or len(title.strip()) < 3:
                    validation_result['errors'].append("Opportunity title too short (minimum 3 characters)")
                    validation_result['valid'] = False
            
            elif command_type in ['note-link', 'opp-link', 'task-link', 'associate']:
                id1 = parameters.get('id1') or parameters.get('source_id')
                id2 = parameters.get('id2') or parameters.get('target_id')
                
                if not id1 or not id2:
                    validation_result['errors'].append("Both IDs required for linking")
                    validation_result['valid'] = False
            
            # Add suggestions for improvement
            if validation_result['valid']:
                validation_result['suggestions'] = self._generate_command_suggestions(command_type, parameters)
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Error validating command: {e}")
            return {
                'valid': False,
                'errors': [str(e)]
            }
    
    @mcp.tool(
        name="generate_command_help",
        description="Generate help information for commands"
    )
    async def generate_command_help(self, command: str = None) -> Dict[str, Any]:
        """
        Generate help information for specific command or all commands.
        
        Args:
            command: Optional specific command to get help for
        
        Returns:
            Dict containing help information
        """
        try:
            if command:
                # Help for specific command
                command = command.lstrip('/')
                
                # Find matching commands
                matches = []
                for cmd, desc in self.command_descriptions.items():
                    if command.lower() in cmd.lower():
                        matches.append({'command': cmd, 'description': desc})
                
                if matches:
                    return {
                        'type': 'specific_help',
                        'query': command,
                        'matches': matches,
                        'examples': self._get_command_examples(command)
                    }
                else:
                    return {
                        'type': 'command_not_found',
                        'query': command,
                        'suggestion': self._suggest_similar_command(f"/{command}"),
                        'all_commands': list(self.command_descriptions.keys())
                    }
            else:
                # General help
                categories = {
                    'Note Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith('/note')],
                    'Opportunity Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith('/opp')],
                    'Node Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith('/node')],
                    'Task Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith('/task')],
                    'Flowline Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith(('/connect', '/disconnect', '/flowline'))],
                    'Tag Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith('/tag')],
                    'Workflow Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith('/workflow')],
                    'Matrix Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith('/matrix')],
                    'View & Navigation': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith(('/view', '/select', '/goto', '/find'))],
                    'Analysis Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith(('/analyze', '/suggest', '/associate'))],
                    'Database Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith(('/sql', '/db'))],
                    'General Commands': [cmd for cmd in self.command_descriptions.keys() if cmd.startswith(('/help', '/commands', '/status'))]
                }
                
                return {
                    'type': 'general_help',
                    'categories': categories,
                    'descriptions': self.command_descriptions,
                    'getting_started': [
                        '/node-create process "Start Process"',
                        '/task-create "My Task" "Start Process"',
                        '/note-create "Meeting notes"',
                        '/sql "SELECT * FROM workflows LIMIT 5"',
                        '/workflow-status',
                        '/help sql'
                    ]
                }
                
        except Exception as e:
            logger.error(f"Error generating help: {e}")
            return {
                'type': 'error',
                'error': str(e)
            }
    
    @mcp.tool(
        name="suggest_command_completion",
        description="Suggest command completions based on partial input"
    )
    async def suggest_command_completion(self, partial_input: str) -> Dict[str, Any]:
        """
        Suggest command completions for partial input.
        
        Args:
            partial_input: Partial command input
        
        Returns:
            Dict containing completion suggestions
        """
        try:
            if not partial_input.startswith('/'):
                return {
                    'suggestions': [],
                    'type': 'not_command'
                }
            
            partial_command = partial_input.lower()
            
            # Find matching commands
            suggestions = []
            for cmd in self.command_descriptions.keys():
                if cmd.lower().startswith(partial_command):
                    suggestions.append({
                        'command': cmd,
                        'description': self.command_descriptions[cmd],
                        'completion': cmd[len(partial_input):] if len(cmd) > len(partial_input) else ''
                    })
            
            # Sort by relevance (exact matches first, then alphabetical)
            suggestions.sort(key=lambda x: (not x['command'].lower().startswith(partial_command), x['command']))
            
            return {
                'suggestions': suggestions[:10],  # Limit to top 10
                'partial_input': partial_input,
                'has_suggestions': len(suggestions) > 0
            }
            
        except Exception as e:
            logger.error(f"Error suggesting completions: {e}")
            return {
                'suggestions': [],
                'error': str(e)
            }
    
    @mcp.tool(
        name="extract_context_from_input",
        description="Extract contextual information from input for LLM processing"
    )
    async def extract_context_from_input(
        self, 
        input_text: str, 
        conversation_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extract contextual information from input to help with LLM processing.
        
        Args:
            input_text: Current input text
            conversation_history: Previous conversation messages
        
        Returns:
            Dict containing extracted context
        """
        try:
            context = {
                'entities': self._extract_entities(input_text),
                'intent': self._classify_intent(input_text),
                'topics': self._extract_topics(input_text),
                'references': self._extract_references(input_text),
                'sentiment': self._analyze_sentiment(input_text)
            }
            
            # Add conversation context if available
            if conversation_history:
                context['conversation_context'] = self._analyze_conversation_context(conversation_history)
            
            # Determine if this might benefit from note-taking
            context['note_worthy'] = self._assess_note_worthiness(input_text, context)
            
            # Suggest potential commands
            context['suggested_commands'] = self._suggest_commands_for_input(input_text, context)
            
            return context
            
        except Exception as e:
            logger.error(f"Error extracting context: {e}")
            return {
                'entities': [],
                'intent': 'unknown',
                'topics': [],
                'error': str(e)
            }
    
    # Helper methods
    
    def _parse_command_match(self, command_name: str, match: re.Match, original_input: str) -> Dict[str, Any]:
        """Parse regex match into structured command data."""
        groups = match.groups()
        
        result = {
            'is_command': True,
            'command_type': command_name,
            'parameters': {},
            'raw_params': groups
        }
        
        # Parse based on command type
        if command_name in ['note', 'note-create']:
            result['parameters']['content'] = groups[0] if groups[0] else ''
            result['action'] = 'create_note'
            
        elif command_name in ['note-search', 'note-find', 'opp-search']:
            result['parameters']['query'] = groups[0] if groups[0] else ''
            result['action'] = 'search_notes' if 'note' in command_name else 'search_opportunities'
            
        elif command_name == 'note-tag':
            result['parameters']['note_id'] = groups[0] if len(groups) > 0 else ''
            result['parameters']['tags'] = groups[1].split() if len(groups) > 1 else []
            result['action'] = 'add_tags_to_note'
            
        elif command_name == 'note-list':
            filters = groups[0] if groups[0] else ''
            result['parameters']['filters'] = self._parse_list_filters(filters)
            result['action'] = 'list_notes'
            
        elif command_name == 'note-link':
            result['parameters']['note_id'] = groups[0] if len(groups) > 0 else ''
            result['parameters']['target_id'] = groups[1] if len(groups) > 1 else ''
            result['action'] = 'link_note'
            
        elif command_name == 'opp-create':
            # Parse title and optional description
            content = groups[0] if groups[0] else ''
            parts = content.split(' - ', 1)  # Split on ' - ' for title - description
            result['parameters']['title'] = parts[0].strip('"\'')
            result['parameters']['description'] = parts[1] if len(parts) > 1 else ''
            result['action'] = 'create_opportunity'
            
        elif command_name == 'opp-list':
            filters = groups[0] if groups[0] else ''
            result['parameters']['filters'] = self._parse_list_filters(filters)
            result['action'] = 'list_opportunities'
            
        elif command_name == 'task-note':
            result['parameters']['task_id'] = groups[0] if len(groups) > 0 else ''
            result['parameters']['content'] = groups[1] if len(groups) > 1 else ''
            result['action'] = 'create_task_note'
            
        elif command_name == 'analyze':
            result['parameters']['text'] = groups[0] if groups[0] else ''
            result['action'] = 'analyze_text'
            
        elif command_name == 'help':
            result['parameters']['topic'] = groups[0] if groups[0] else None
            result['action'] = 'show_help'
            
        elif command_name == 'commands':
            result['action'] = 'list_commands'
            
        elif command_name == 'status':
            result['action'] = 'show_status'
        
        return result
    
    def _parse_list_filters(self, filter_string: str) -> Dict[str, Any]:
        """Parse filter string for list commands."""
        filters = {}
        
        if not filter_string:
            return filters
        
        # Parse tag filters: tag:tag1,tag2
        tag_match = re.search(r'tag:([^\s]+)', filter_string)
        if tag_match:
            filters['tags'] = tag_match.group(1).split(',')
        
        # Parse opportunity filter: opp:opp-123
        opp_match = re.search(r'opp:([^\s]+)', filter_string)
        if opp_match:
            filters['opportunity_id'] = opp_match.group(1)
        
        # Parse task filter: task:task-456
        task_match = re.search(r'task:([^\s]+)', filter_string)
        if task_match:
            filters['task_id'] = task_match.group(1)
        
        # Parse limit: limit:10
        limit_match = re.search(r'limit:(\d+)', filter_string)
        if limit_match:
            filters['limit'] = int(limit_match.group(1))
        
        return filters
    
    def _suggest_similar_command(self, unknown_command: str) -> Optional[str]:
        """Suggest similar command for unknown input."""
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
    
    def _generate_command_suggestions(self, command_type: str, parameters: Dict[str, Any]) -> List[str]:
        """Generate suggestions for improving commands."""
        suggestions = []
        
        if command_type in ['note-create', 'note']:
            content = parameters.get('content', '')
            if content and len(content) < 20:
                suggestions.append("Consider adding more detail to your note")
            if not any(char in content for char in '.!?'):
                suggestions.append("Consider ending with proper punctuation")
        
        elif command_type == 'opp-create':
            title = parameters.get('title', '')
            if not parameters.get('description'):
                suggestions.append("Consider adding a description with ' - description'")
            if title and len(title.split()) < 2:
                suggestions.append("Consider using a more descriptive title")
        
        return suggestions
    
    def _get_command_examples(self, command: str) -> List[str]:
        """Get example usage for a command."""
        examples = {
            'note': [
                '/note "Meeting with client about website redesign"',
                '/note-create "Remember to follow up on the proposal"'
            ],
            'note-search': [
                '/note-search "website redesign"',
                '/note-find "client meeting"'
            ],
            'opp': [
                '/opp-create "Website Redesign Project - Complete overhaul of company site"',
                '/opp-list tag:web,design'
            ],
            'help': [
                '/help note',
                '/help opp-create',
                '/commands'
            ],
            'sql': [
                '/sql "SELECT * FROM workflows LIMIT 5"',
                '/sql "SELECT COUNT(*) FROM tasks WHERE status = \'completed\'"',
                '/sql "SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'"'
            ],
            'db': [
                '/db-query "SELECT * FROM opportunities ORDER BY created_at DESC LIMIT 10"',
                '/db-query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'workflows\'"',
                '/db-query "SELECT status, COUNT(*) as count FROM tasks GROUP BY status"'
            ]
        }
        
        # Find examples for command or similar commands
        for key, example_list in examples.items():
            if key in command.lower():
                return example_list
        
        return []
    
    def _extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities from text (simple version)."""
        entities = []
        
        # Extract potential IDs
        id_patterns = [
            (r'\b(opp-\w+)\b', 'opportunity_id'),
            (r'\b(task-\w+)\b', 'task_id'),
            (r'\b(note-\w+)\b', 'note_id'),
            (r'\b(workflow-\w+)\b', 'workflow_id')
        ]
        
        for pattern, entity_type in id_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                entities.append({
                    'text': match,
                    'type': entity_type,
                    'confidence': 0.9
                })
        
        # Extract dates
        date_pattern = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b'
        date_matches = re.findall(date_pattern, text)
        for match in date_matches:
            entities.append({
                'text': match,
                'type': 'date',
                'confidence': 0.8
            })
        
        return entities
    
    def _classify_intent(self, text: str) -> str:
        """Classify the intent of the input."""
        text_lower = text.lower()
        
        intent_keywords = {
            'create': ['create', 'add', 'new', 'make'],
            'search': ['find', 'search', 'look for', 'locate'],
            'update': ['update', 'modify', 'change', 'edit'],
            'delete': ['delete', 'remove', 'drop'],
            'list': ['list', 'show all', 'display'],
            'link': ['link', 'connect', 'associate', 'relate'],
            'question': ['what', 'how', 'why', 'when', 'where', '?']
        }
        
        for intent, keywords in intent_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return intent
        
        return 'unknown'
    
    def _extract_topics(self, text: str) -> List[str]:
        """Extract topics from text."""
        # Simple keyword extraction
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Common topics in project management
        topic_keywords = {
            'meeting': ['meeting', 'call', 'discussion'],
            'deadline': ['deadline', 'due', 'urgent'],
            'project': ['project', 'initiative', 'campaign'],
            'client': ['client', 'customer', 'stakeholder'],
            'design': ['design', 'ui', 'ux', 'layout'],
            'development': ['development', 'coding', 'programming'],
            'testing': ['test', 'testing', 'qa', 'quality'],
            'deployment': ['deploy', 'deployment', 'release']
        }
        
        topics = []
        for topic, keywords in topic_keywords.items():
            if any(keyword in words for keyword in keywords):
                topics.append(topic)
        
        return topics
    
    def _extract_references(self, text: str) -> List[str]:
        """Extract references to other items."""
        references = []
        
        # Extract @ mentions
        mentions = re.findall(r'@(\w+)', text)
        references.extend(mentions)
        
        # Extract hashtags
        hashtags = re.findall(r'#(\w+)', text)
        references.extend(hashtags)
        
        return references
    
    def _analyze_sentiment(self, text: str) -> str:
        """Analyze sentiment (simple version)."""
        positive_words = ['good', 'great', 'excellent', 'success', 'complete', 'finished']
        negative_words = ['problem', 'issue', 'error', 'failed', 'urgent', 'blocked']
        
        text_lower = text.lower()
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return 'positive'
        elif negative_count > positive_count:
            return 'negative'
        else:
            return 'neutral'
    
    def _analyze_conversation_context(self, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze conversation context from history."""
        if not history:
            return {}
        
        recent_topics = []
        recent_commands = []
        
        # Analyze last few messages
        for msg in history[-5:]:
            content = msg.get('content', '')
            if content.startswith('/'):
                recent_commands.append(content.split()[0])
            else:
                recent_topics.extend(self._extract_topics(content))
        
        return {
            'recent_topics': list(set(recent_topics)),
            'recent_commands': list(set(recent_commands)),
            'conversation_length': len(history)
        }
    
    def _assess_note_worthiness(self, text: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Assess if input is worth saving as a note."""
        score = 0
        reasons = []
        
        # Length indicates substance
        if len(text) > 50:
            score += 0.3
            reasons.append("substantial_content")
        
        # Contains actionable items
        action_words = ['todo', 'need to', 'should', 'must', 'action', 'task']
        if any(word in text.lower() for word in action_words):
            score += 0.4
            reasons.append("actionable_content")
        
        # Contains specific details
        if context.get('entities'):
            score += 0.2
            reasons.append("contains_entities")
        
        # Mentions dates or deadlines
        if 'deadline' in context.get('topics', []):
            score += 0.3
            reasons.append("time_sensitive")
        
        # Contains decisions or outcomes
        decision_words = ['decided', 'agreed', 'concluded', 'result']
        if any(word in text.lower() for word in decision_words):
            score += 0.3
            reasons.append("contains_decisions")
        
        return {
            'score': min(score, 1.0),
            'worthy': score > 0.5,
            'reasons': reasons
        }
    
    def _suggest_commands_for_input(self, text: str, context: Dict[str, Any]) -> List[Dict[str, str]]:
        """Suggest relevant commands based on input analysis."""
        suggestions = []
        
        intent = context.get('intent')
        topics = context.get('topics', [])
        note_worthy = context.get('note_worthy', {})
        
        # Suggest note creation for substantial content
        if note_worthy.get('worthy'):
            suggestions.append({
                'command': '/note-create',
                'reason': 'Content appears worth saving as a note'
            })
        
        # Suggest opportunity creation for project-related content
        if 'project' in topics or any(word in text.lower() for word in ['project', 'initiative']):
            suggestions.append({
                'command': '/opp-create',
                'reason': 'Content mentions projects or initiatives'
            })
        
        # Suggest search if asking questions
        if intent == 'question' or '?' in text:
            suggestions.append({
                'command': '/note-search',
                'reason': 'Appears to be asking a question'
            })
        
        # Suggest analysis for complex content
        if len(text) > 100 and context.get('entities'):
            suggestions.append({
                'command': '/analyze',
                'reason': 'Complex content could benefit from analysis'
            })
        
        return suggestions[:3]  # Limit to top 3 suggestions


async def main():
    """Main entry point for the MCP server."""
    server = ChatCommandServer()
    
    logger.info("Chat command MCP server initialized")
    
    # Example usage for testing
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Test command parsing
        test_inputs = [
            "/note-create Meeting with client went well, need to follow up next week",
            "/opp-create Website Redesign - Complete overhaul with new branding",
            "/note-search client meeting",
            "/help note",
            "This is just regular text that should go to LLM",
            "/unknown-command"
        ]
        
        for test_input in test_inputs:
            print(f"\nTesting: {test_input}")
            result = await server.parse_chat_input(test_input)
            print(f"Result: {json.dumps(result, indent=2)}")


if __name__ == "__main__":
    asyncio.run(main())