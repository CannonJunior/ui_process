#!/bin/bash

# Emergency Rollback Script
# Provides immediate reversion capabilities during refactoring

set -e  # Exit on any error

echo "🚨 Process Flow Designer - Emergency Rollback System"
echo "===================================================="

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Function to display usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [BACKUP_ID]"
    echo
    echo "Options:"
    echo "  -l, --list           List available backups"
    echo "  -c, --create         Create new backup checkpoint"
    echo "  -r, --restore ID     Restore from specific backup"
    echo "  -f, --force          Force rollback without confirmation"
    echo "  -s, --status         Show current git status"
    echo "  -h, --help           Show this help message"
    echo
    echo "Examples:"
    echo "  $0 --create                    # Create backup before changes"
    echo "  $0 --list                      # List all available backups"
    echo "  $0 --restore 20241201_143022   # Restore specific backup"
    echo "  $0 --force --restore latest    # Force restore latest backup"
    echo
}

# Function to create backup checkpoint
create_backup() {
    echo "💾 Creating backup checkpoint..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup metadata
    local backup_id="checkpoint_$TIMESTAMP"
    local backup_file="$BACKUP_DIR/$backup_id.tar.gz"
    local metadata_file="$BACKUP_DIR/$backup_id.meta"
    
    # Create metadata
    cat > "$metadata_file" << EOF
{
    "id": "$backup_id",
    "timestamp": "$(date -Iseconds)",
    "description": "Automatic checkpoint before refactoring changes",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "files_changed": $(git status --porcelain 2>/dev/null | wc -l || echo 0),
    "size": 0
}
EOF
    
    # Create backup archive
    cd "$PROJECT_DIR"
    echo "📦 Archiving project files..."
    
    tar -czf "$backup_file" \
        --exclude="rollback/backups" \
        --exclude="tests/reports" \
        --exclude="node_modules" \
        --exclude=".git/objects" \
        --exclude="*.log" \
        .
    
    # Update metadata with actual size
    local size=$(du -h "$backup_file" | cut -f1)
    sed -i "s/\"size\": 0/\"size\": \"$size\"/" "$metadata_file"
    
    echo "✅ Backup created: $backup_id"
    echo "📦 Size: $size"
    echo "📄 Location: $backup_file"
    echo
    
    # Create quick reference
    echo "$backup_id" > "$BACKUP_DIR/latest_checkpoint"
    
    return 0
}

# Function to list available backups
list_backups() {
    echo "📋 Available Backups:"
    echo "===================="
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        echo "❌ No backup directory found. Create a backup first."
        return 1
    fi
    
    local backup_count=0
    
    for meta_file in "$BACKUP_DIR"/*.meta; do
        if [[ -f "$meta_file" ]]; then
            local backup_id=$(basename "$meta_file" .meta)
            
            # Parse metadata (simple JSON extraction)
            local timestamp=$(grep '"timestamp"' "$meta_file" | cut -d'"' -f4)
            local size=$(grep '"size"' "$meta_file" | cut -d'"' -f4)
            local git_branch=$(grep '"git_branch"' "$meta_file" | cut -d'"' -f4)
            local git_commit=$(grep '"git_commit"' "$meta_file" | cut -d'"' -f4 | cut -c1-8)
            
            echo "🗂️  $backup_id"
            echo "   📅 Created: $timestamp"
            echo "   📦 Size: $size"
            echo "   🌿 Branch: $git_branch"
            echo "   🔗 Commit: $git_commit"
            echo
            
            ((backup_count++))
        fi
    done
    
    if [[ $backup_count -eq 0 ]]; then
        echo "❌ No backups found. Create a backup first."
        return 1
    fi
    
    echo "📊 Total backups: $backup_count"
    
    # Show latest
    if [[ -f "$BACKUP_DIR/latest_checkpoint" ]]; then
        local latest=$(cat "$BACKUP_DIR/latest_checkpoint")
        echo "🏆 Latest: $latest"
    fi
    
    return 0
}

# Function to restore from backup
restore_backup() {
    local backup_id="$1"
    local force_restore="$2"
    
    if [[ -z "$backup_id" ]]; then
        echo "❌ Backup ID required for restore operation"
        return 1
    fi
    
    # Handle 'latest' keyword
    if [[ "$backup_id" == "latest" ]]; then
        if [[ -f "$BACKUP_DIR/latest_checkpoint" ]]; then
            backup_id=$(cat "$BACKUP_DIR/latest_checkpoint")
            echo "🏆 Using latest backup: $backup_id"
        else
            echo "❌ No latest backup reference found"
            return 1
        fi
    fi
    
    local backup_file="$BACKUP_DIR/$backup_id.tar.gz"
    local metadata_file="$BACKUP_DIR/$backup_id.meta"
    
    # Validate backup exists
    if [[ ! -f "$backup_file" ]]; then
        echo "❌ Backup file not found: $backup_file"
        list_backups
        return 1
    fi
    
    if [[ ! -f "$metadata_file" ]]; then
        echo "❌ Backup metadata not found: $metadata_file"
        return 1
    fi
    
    # Show backup info
    echo "🔍 Backup Information:"
    echo "====================="
    cat "$metadata_file" | sed 's/^/   /'
    echo
    
    # Confirmation (unless forced)
    if [[ "$force_restore" != "true" ]]; then
        echo "⚠️  WARNING: This will replace all current files with backup content!"
        echo "⚠️  Current changes will be lost unless committed to git!"
        echo
        read -p "🤔 Are you sure you want to proceed? (y/N): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Rollback cancelled"
            return 1
        fi
    fi
    
    # Create emergency backup of current state
    echo "🛟 Creating emergency backup of current state..."
    local emergency_backup="$BACKUP_DIR/emergency_before_rollback_$TIMESTAMP.tar.gz"
    
    cd "$PROJECT_DIR"
    tar -czf "$emergency_backup" \
        --exclude="rollback/backups" \
        --exclude="tests/reports" \
        .
    
    echo "🛟 Emergency backup saved: $(basename "$emergency_backup")"
    
    # Perform restore
    echo "🔄 Restoring from backup..."
    
    # Extract backup
    tar -xzf "$backup_file" -C "$PROJECT_DIR"
    
    echo "✅ Restore completed successfully!"
    echo "📦 Restored from: $backup_id"
    echo "🛟 Emergency backup: $(basename "$emergency_backup")"
    echo
    echo "🔍 Recommended next steps:"
    echo "  1. Verify application functionality"
    echo "  2. Run tests: ./tests/run-tests.sh"
    echo "  3. Check git status if needed"
    echo
    
    return 0
}

# Function to show git status
show_status() {
    echo "📊 Current Project Status:"
    echo "========================="
    
    cd "$PROJECT_DIR"
    
    # Git status
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo "🌿 Git Branch: $(git rev-parse --abbrev-ref HEAD)"
        echo "🔗 Git Commit: $(git rev-parse HEAD | cut -c1-8)"
        echo
        echo "📝 Git Status:"
        git status --porcelain | head -20
        
        local changed_files=$(git status --porcelain | wc -l)
        if [[ $changed_files -gt 0 ]]; then
            echo "⚠️  $changed_files files have changes"
        else
            echo "✅ Working tree clean"
        fi
    else
        echo "❌ Not a git repository"
    fi
    
    echo
    
    # Backup status
    if [[ -d "$BACKUP_DIR" ]]; then
        local backup_count=$(find "$BACKUP_DIR" -name "*.tar.gz" | wc -l)
        echo "💾 Available backups: $backup_count"
        
        if [[ -f "$BACKUP_DIR/latest_checkpoint" ]]; then
            local latest=$(cat "$BACKUP_DIR/latest_checkpoint")
            echo "🏆 Latest backup: $latest"
        fi
    else
        echo "❌ No backup directory found"
    fi
    
    return 0
}

# Function to validate environment
validate_environment() {
    local valid=true
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_DIR/script.js" ]]; then
        echo "❌ Main application file (script.js) not found"
        echo "📁 Expected location: $PROJECT_DIR/script.js"
        valid=false
    fi
    
    # Check required tools
    if ! command -v tar >/dev/null 2>&1; then
        echo "❌ Required tool 'tar' not found"
        valid=false
    fi
    
    if [[ "$valid" != "true" ]]; then
        echo "❌ Environment validation failed"
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    local action=""
    local backup_id=""
    local force_restore=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--list)
                action="list"
                shift
                ;;
            -c|--create)
                action="create"
                shift
                ;;
            -r|--restore)
                action="restore"
                backup_id="$2"
                shift 2
                ;;
            -f|--force)
                force_restore=true
                shift
                ;;
            -s|--status)
                action="status"
                shift
                ;;
            -h|--help)
                show_usage
                return 0
                ;;
            *)
                if [[ -z "$backup_id" ]] && [[ "$action" == "restore" ]]; then
                    backup_id="$1"
                fi
                shift
                ;;
        esac
    done
    
    # Default action if none specified
    if [[ -z "$action" ]]; then
        show_usage
        return 1
    fi
    
    # Validate environment
    if ! validate_environment; then
        return 1
    fi
    
    # Execute action
    case $action in
        "create")
            create_backup
            ;;
        "list")
            list_backups
            ;;
        "restore")
            restore_backup "$backup_id" "$force_restore"
            ;;
        "status")
            show_status
            ;;
        *)
            echo "❌ Unknown action: $action"
            show_usage
            return 1
            ;;
    esac
}

# Execute main function
main "$@"