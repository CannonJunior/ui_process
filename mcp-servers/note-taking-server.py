#!/usr/bin/env python3
"""
MCP Server for Note-Taking Integration
Provides CLI bridge and intelligent association capabilities for the workflow application.
"""

import asyncio
import json
import logging
import os
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any

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

class NoteTakingServer:
    """MCP Server for note-taking and opportunity association functionality."""
    
    def __init__(self, data_dir: str = None):
        self.data_dir = Path(data_dir or os.path.expanduser("~/.workflow-notes"))
        self.notebooks_dir = self.data_dir / "notebooks"
        self.db_path = self.data_dir / "index.db"
        
        # Ensure directories exist
        self.data_dir.mkdir(exist_ok=True)
        self.notebooks_dir.mkdir(exist_ok=True)
        (self.notebooks_dir / "opportunities").mkdir(exist_ok=True)
        (self.notebooks_dir / "tasks").mkdir(exist_ok=True)
        (self.notebooks_dir / "workflows").mkdir(exist_ok=True)
        
        # Initialize database
        self._init_database()
        
        # Validate nb installation
        self._validate_nb_installation()
    
    def _init_database(self):
        """Initialize SQLite database for associations and metadata."""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS note_associations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    note_id TEXT NOT NULL,
                    opportunity_id TEXT,
                    task_id TEXT,
                    workflow_id TEXT,
                    tags TEXT, -- JSON array
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    semantic_score REAL,
                    confidence REAL
                );
                
                CREATE TABLE IF NOT EXISTS opportunities (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    tags TEXT, -- JSON array
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT -- JSON object
                );
                
                CREATE TABLE IF NOT EXISTS semantic_cache (
                    content_hash TEXT PRIMARY KEY,
                    embedding BLOB,
                    keywords TEXT, -- JSON array
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_note_associations_note_id ON note_associations(note_id);
                CREATE INDEX IF NOT EXISTS idx_note_associations_opportunity_id ON note_associations(opportunity_id);
                CREATE INDEX IF NOT EXISTS idx_note_associations_task_id ON note_associations(task_id);
            """)
    
    def _validate_nb_installation(self):
        """Validate that nb is installed and accessible."""
        try:
            result = subprocess.run(['nb', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                logger.info(f"nb version detected: {result.stdout.strip()}")
            else:
                logger.warning("nb command failed - may not be properly installed")
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.error(f"nb not found or not accessible: {e}")
    
    @mcp.tool(
        name="create_note",
        description="Create a new note using nb CLI with optional tags and associations"
    )
    async def create_note(
        self, 
        content: str, 
        title: str = None,
        tags: List[str] = None,
        opportunity_id: str = None,
        task_id: str = None,
        notebook: str = "default"
    ) -> Dict[str, Any]:
        """
        Create a new note with optional metadata and associations.
        
        Args:
            content: The note content
            title: Optional title for the note
            tags: List of tags to apply
            opportunity_id: Optional opportunity to associate with
            task_id: Optional task to associate with  
            notebook: Notebook name (default: "default")
        
        Returns:
            Dict containing note_id, status, and any associations created
        """
        try:
            # Prepare nb command
            cmd = ['nb', 'add']
            
            # Add title if provided
            if title:
                cmd.extend(['--title', title])
            
            # Add tags if provided
            if tags:
                tag_string = ' '.join(f'#{tag}' for tag in tags)
                content = f"{content}\n\nTags: {tag_string}"
            
            # Set notebook if not default
            if notebook != "default":
                cmd.extend(['--notebook', notebook])
            
            # Execute nb command using subprocess (sync version for compatibility)
            import subprocess
            try:
                # Use synchronous subprocess for better compatibility
                process = subprocess.run(
                    cmd,
                    input=content,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                stdout = process.stdout
                stderr = process.stderr
                returncode = process.returncode
            except subprocess.TimeoutExpired:
                raise Exception("nb command timed out")
            except Exception as e:
                raise Exception(f"nb command failed: {str(e)}")
            
            if returncode != 0:
                raise Exception(f"nb command failed: {stderr}")
            
            # Extract note ID from nb output
            note_id = self._extract_note_id(stdout)
            
            # Create associations if specified
            associations = {}
            if opportunity_id or task_id:
                associations = await self._create_associations(
                    note_id, opportunity_id, task_id, tags or []
                )
            
            # Analyze content for potential associations if not manually specified
            if not opportunity_id and not task_id:
                suggestions = await self._analyze_for_associations(content, note_id)
                associations['suggestions'] = suggestions
            
            return {
                'note_id': note_id,
                'status': 'created',
                'associations': associations,
                'content_preview': content[:100] + '...' if len(content) > 100 else content
            }
            
        except Exception as e:
            logger.error(f"Error creating note: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    @mcp.tool(
        name="search_notes",
        description="Search notes using nb with optional filtering by tags and associations"
    )
    async def search_notes(
        self,
        query: str = None,
        tags: List[str] = None,
        opportunity_id: str = None,
        task_id: str = None,
        notebook: str = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Search notes with various filtering options.
        
        Args:
            query: Text to search for
            tags: Filter by tags
            opportunity_id: Filter by opportunity association
            task_id: Filter by task association
            notebook: Limit search to specific notebook
            limit: Maximum number of results
        
        Returns:
            Dict containing search results and metadata
        """
        try:
            results = []
            
            # Use nb search if query provided
            if query:
                cmd = ['nb', 'search', query]
                if notebook:
                    cmd.extend(['--notebook', notebook])
                
                # Use synchronous subprocess for compatibility
                process = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                stdout = process.stdout
                stderr = process.stderr
                
                if process.returncode == 0:
                    results.extend(self._parse_search_results(stdout))
            
            # Filter by associations if specified
            if opportunity_id or task_id or tags:
                association_results = await self._search_by_associations(
                    opportunity_id, task_id, tags
                )
                
                if query:
                    # Intersect with text search results
                    association_note_ids = {r['note_id'] for r in association_results}
                    results = [r for r in results if r.get('note_id') in association_note_ids]
                else:
                    results.extend(association_results)
            
            # Apply limit
            results = results[:limit]
            
            # Enrich results with association data
            enriched_results = await self._enrich_search_results(results)
            
            return {
                'results': enriched_results,
                'total_found': len(results),
                'query': query,
                'filters': {
                    'tags': tags,
                    'opportunity_id': opportunity_id,
                    'task_id': task_id,
                    'notebook': notebook
                }
            }
            
        except Exception as e:
            logger.error(f"Error searching notes: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    @mcp.tool(
        name="create_opportunity",
        description="Create a new opportunity for organizing tasks and notes"
    )
    async def create_opportunity(
        self,
        title: str,
        description: str = None,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create a new opportunity object.
        
        Args:
            title: Opportunity title
            description: Optional description
            tags: Optional list of tags
            metadata: Optional metadata dict
        
        Returns:
            Dict containing opportunity details
        """
        try:
            opportunity_id = f"opp-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
            
            # Store in database
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO opportunities (id, title, description, tags, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    opportunity_id,
                    title,
                    description,
                    json.dumps(tags or []),
                    json.dumps(metadata or {})
                ))
            
            # Create notebook directory for this opportunity
            opp_dir = self.notebooks_dir / "opportunities" / opportunity_id
            opp_dir.mkdir(exist_ok=True)
            
            # Create initial note with opportunity details
            await self.create_note(
                content=f"# {title}\n\n{description or 'No description provided.'}",
                title=f"Opportunity: {title}",
                tags=tags,
                opportunity_id=opportunity_id,
                notebook=f"opportunities/{opportunity_id}"
            )
            
            return {
                'opportunity_id': opportunity_id,
                'status': 'created',
                'title': title,
                'description': description,
                'tags': tags or [],
                'metadata': metadata or {}
            }
            
        except Exception as e:
            logger.error(f"Error creating opportunity: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    @mcp.tool(
        name="associate_note_with_opportunity",
        description="Create an association between a note and an opportunity"
    )
    async def associate_note_with_opportunity(
        self,
        note_id: str,
        opportunity_id: str,
        confidence: float = 1.0,
        auto_generated: bool = False
    ) -> Dict[str, Any]:
        """
        Associate a note with an opportunity.
        
        Args:
            note_id: The note identifier
            opportunity_id: The opportunity identifier
            confidence: Confidence score (0.0-1.0)
            auto_generated: Whether this was automatically suggested
        
        Returns:
            Dict containing association details
        """
        try:
            # Verify opportunity exists
            with sqlite3.connect(self.db_path) as conn:
                opp_result = conn.execute(
                    "SELECT title FROM opportunities WHERE id = ?",
                    (opportunity_id,)
                ).fetchone()
                
                if not opp_result:
                    return {
                        'status': 'error',
                        'error': f'Opportunity {opportunity_id} not found'
                    }
                
                # Create association
                conn.execute("""
                    INSERT OR REPLACE INTO note_associations 
                    (note_id, opportunity_id, confidence)
                    VALUES (?, ?, ?)
                """, (note_id, opportunity_id, confidence))
            
            return {
                'status': 'associated',
                'note_id': note_id,
                'opportunity_id': opportunity_id,
                'opportunity_title': opp_result[0],
                'confidence': confidence,
                'auto_generated': auto_generated
            }
            
        except Exception as e:
            logger.error(f"Error creating association: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    @mcp.tool(
        name="list_opportunities",
        description="List all opportunities with optional filtering"
    )
    async def list_opportunities(
        self,
        tags: List[str] = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        List opportunities with optional tag filtering.
        
        Args:
            tags: Optional tags to filter by
            limit: Maximum number of results
        
        Returns:
            Dict containing list of opportunities
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                if tags:
                    # Filter by tags (simple JSON contains check)
                    placeholders = ' OR '.join(['tags LIKE ?'] * len(tags))
                    query = f"""
                        SELECT id, title, description, tags, created_at, 
                               (SELECT COUNT(*) FROM note_associations WHERE opportunity_id = opportunities.id) as note_count
                        FROM opportunities 
                        WHERE {placeholders}
                        ORDER BY created_at DESC 
                        LIMIT ?
                    """
                    params = [f'%"{tag}"%' for tag in tags] + [limit]
                else:
                    query = """
                        SELECT id, title, description, tags, created_at,
                               (SELECT COUNT(*) FROM note_associations WHERE opportunity_id = opportunities.id) as note_count
                        FROM opportunities 
                        ORDER BY created_at DESC 
                        LIMIT ?
                    """
                    params = [limit]
                
                results = conn.execute(query, params).fetchall()
                
                opportunities = []
                for row in results:
                    opportunities.append({
                        'id': row[0],
                        'title': row[1],
                        'description': row[2],
                        'tags': json.loads(row[3]) if row[3] else [],
                        'created_at': row[4],
                        'note_count': row[5]
                    })
                
                return {
                    'opportunities': opportunities,
                    'total': len(opportunities),
                    'filters': {'tags': tags}
                }
                
        except Exception as e:
            logger.error(f"Error listing opportunities: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    @mcp.tool(
        name="analyze_text_for_associations",
        description="Analyze text content to suggest opportunities and tags"
    )
    async def analyze_text_for_associations(
        self,
        content: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Analyze text content to suggest potential associations and tags.
        
        Args:
            content: Text content to analyze
            context: Optional context information
        
        Returns:
            Dict containing suggested associations and extracted metadata
        """
        try:
            # Extract keywords and patterns
            keywords = self._extract_keywords(content)
            patterns = self._analyze_patterns(content)
            
            # Find similar opportunities
            similar_opportunities = await self._find_similar_opportunities(content)
            
            # Generate suggested tags
            suggested_tags = self._generate_suggested_tags(content, keywords, patterns)
            
            return {
                'keywords': keywords,
                'patterns': patterns,
                'similar_opportunities': similar_opportunities,
                'suggested_tags': suggested_tags,
                'confidence_scores': {
                    'keyword_extraction': 0.8,
                    'pattern_matching': 0.7,
                    'similarity_analysis': 0.6
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing text: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    # Helper methods
    
    def _extract_note_id(self, nb_output: str) -> str:
        """Extract note ID from nb command output."""
        # nb typically outputs something like "Added: [123] Note Title"
        import re
        match = re.search(r'\[(\d+)\]', nb_output)
        return match.group(1) if match else f"note-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    def _parse_search_results(self, nb_output: str) -> List[Dict[str, Any]]:
        """Parse nb search output into structured results."""
        results = []
        lines = nb_output.strip().split('\n')
        
        for line in lines:
            if line.strip():
                # Parse nb search output format
                parts = line.split(':', 2)
                if len(parts) >= 2:
                    note_id = parts[0].strip()
                    title = parts[1].strip() if len(parts) > 1 else ""
                    preview = parts[2].strip() if len(parts) > 2 else ""
                    
                    results.append({
                        'note_id': note_id,
                        'title': title,
                        'preview': preview
                    })
        
        return results
    
    async def _search_by_associations(
        self, 
        opportunity_id: str = None, 
        task_id: str = None, 
        tags: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Search notes by their associations."""
        with sqlite3.connect(self.db_path) as conn:
            conditions = []
            params = []
            
            if opportunity_id:
                conditions.append("opportunity_id = ?")
                params.append(opportunity_id)
            
            if task_id:
                conditions.append("task_id = ?")
                params.append(task_id)
            
            if tags:
                tag_conditions = ' OR '.join(['tags LIKE ?'] * len(tags))
                conditions.append(f"({tag_conditions})")
                params.extend([f'%"{tag}"%' for tag in tags])
            
            where_clause = ' AND '.join(conditions) if conditions else "1=1"
            
            query = f"""
                SELECT note_id, opportunity_id, task_id, tags, confidence
                FROM note_associations 
                WHERE {where_clause}
                ORDER BY confidence DESC
            """
            
            results = conn.execute(query, params).fetchall()
            
            return [
                {
                    'note_id': row[0],
                    'opportunity_id': row[1],
                    'task_id': row[2],
                    'tags': json.loads(row[3]) if row[3] else [],
                    'confidence': row[4]
                }
                for row in results
            ]
    
    async def _enrich_search_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enrich search results with association data."""
        enriched = []
        
        with sqlite3.connect(self.db_path) as conn:
            for result in results:
                note_id = result.get('note_id')
                if note_id:
                    # Get associations
                    associations = conn.execute("""
                        SELECT opportunity_id, task_id, tags, confidence
                        FROM note_associations 
                        WHERE note_id = ?
                    """, (note_id,)).fetchall()
                    
                    result['associations'] = [
                        {
                            'opportunity_id': row[0],
                            'task_id': row[1], 
                            'tags': json.loads(row[2]) if row[2] else [],
                            'confidence': row[3]
                        }
                        for row in associations
                    ]
                
                enriched.append(result)
        
        return enriched
    
    async def _create_associations(
        self, 
        note_id: str, 
        opportunity_id: str = None, 
        task_id: str = None, 
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """Create note associations."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO note_associations 
                (note_id, opportunity_id, task_id, tags, confidence)
                VALUES (?, ?, ?, ?, ?)
            """, (
                note_id,
                opportunity_id,
                task_id,
                json.dumps(tags or []),
                1.0  # Manual associations have full confidence
            ))
        
        return {
            'opportunity_id': opportunity_id,
            'task_id': task_id,
            'tags': tags or [],
            'confidence': 1.0
        }
    
    async def _analyze_for_associations(self, content: str, note_id: str) -> Dict[str, Any]:
        """Analyze content for potential associations."""
        return await self.analyze_text_for_associations(content)
    
    def _extract_keywords(self, content: str) -> List[str]:
        """Extract keywords from content using simple NLP techniques."""
        import re
        
        # Simple keyword extraction - can be enhanced with proper NLP
        words = re.findall(r'\b[a-zA-Z]{3,}\b', content.lower())
        
        # Filter common words (basic stopword removal)
        stopwords = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'}
        
        keywords = [word for word in set(words) if word not in stopwords and len(word) > 3]
        
        # Return top keywords by frequency
        from collections import Counter
        word_counts = Counter(words)
        top_keywords = [word for word, count in word_counts.most_common(10) if word in keywords]
        
        return top_keywords[:5]
    
    def _analyze_patterns(self, content: str) -> Dict[str, List[str]]:
        """Analyze content for patterns like dates, projects, stakeholders."""
        import re
        
        patterns = {
            'deadlines': re.findall(r'\b(?:due|deadline|by)\s+([^\s.,!?]+)', content, re.IGNORECASE),
            'projects': re.findall(r'\b(?:project|initiative|campaign)\s+([^\s.,!?]+)', content, re.IGNORECASE),
            'stakeholders': re.findall(r'\b(?:client|customer|user|stakeholder)\s+([^\s.,!?]+)', content, re.IGNORECASE),
            'technologies': re.findall(r'\b(?:using|with|via)\s+([A-Z][a-zA-Z]+)', content),
            'priorities': re.findall(r'\b(?:urgent|high|low|medium)\s+priority\b', content, re.IGNORECASE)
        }
        
        return {key: list(set(matches)) for key, matches in patterns.items() if matches}
    
    async def _find_similar_opportunities(self, content: str) -> List[Dict[str, Any]]:
        """Find opportunities with similar content."""
        # Simple keyword-based similarity for now
        content_keywords = set(self._extract_keywords(content))
        
        with sqlite3.connect(self.db_path) as conn:
            opportunities = conn.execute("""
                SELECT id, title, description, tags
                FROM opportunities
            """).fetchall()
            
            similar = []
            for opp in opportunities:
                opp_text = f"{opp[1]} {opp[2] or ''}"
                opp_keywords = set(self._extract_keywords(opp_text))
                
                # Calculate simple Jaccard similarity
                intersection = len(content_keywords & opp_keywords)
                union = len(content_keywords | opp_keywords)
                similarity = intersection / union if union > 0 else 0
                
                if similarity > 0.1:  # Threshold for similarity
                    similar.append({
                        'opportunity_id': opp[0],
                        'title': opp[1],
                        'similarity_score': similarity,
                        'matching_keywords': list(content_keywords & opp_keywords)
                    })
            
            return sorted(similar, key=lambda x: x['similarity_score'], reverse=True)[:3]
    
    def _generate_suggested_tags(self, content: str, keywords: List[str], patterns: Dict[str, List[str]]) -> List[str]:
        """Generate suggested tags based on content analysis."""
        tags = set()
        
        # Add top keywords as tags
        tags.update(keywords[:3])
        
        # Add pattern-based tags
        for pattern_type, matches in patterns.items():
            if matches:
                tags.add(pattern_type.rstrip('s'))  # Remove plural
        
        # Add content-based tags
        content_lower = content.lower()
        tag_indicators = {
            'meeting': ['meeting', 'call', 'discussion'],
            'todo': ['todo', 'task', 'action', 'need to'],
            'idea': ['idea', 'concept', 'thought'],
            'issue': ['problem', 'issue', 'bug', 'error'],
            'decision': ['decision', 'choose', 'select', 'pick']
        }
        
        for tag, indicators in tag_indicators.items():
            if any(indicator in content_lower for indicator in indicators):
                tags.add(tag)
        
        return list(tags)[:7]  # Limit to 7 tags


async def main():
    """Main entry point for the MCP server."""
    server = NoteTakingServer()
    
    # In a real MCP implementation, this would start the server
    logger.info("Note-taking MCP server initialized")
    logger.info(f"Data directory: {server.data_dir}")
    
    # Example usage for testing
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Create test opportunity
        result = await server.create_opportunity(
            title="Website Redesign Project",
            description="Complete overhaul of company website with new branding",
            tags=["web", "design", "branding"]
        )
        print("Created opportunity:", result)
        
        # Create test note
        note_result = await server.create_note(
            content="Meeting notes: Discussed color scheme and layout options. Need to review competitor sites.",
            title="Design Meeting Notes",
            tags=["meeting", "design"],
            opportunity_id=result.get('opportunity_id')
        )
        print("Created note:", note_result)


if __name__ == "__main__":
    asyncio.run(main())