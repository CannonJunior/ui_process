# 🚨 Emergency Rollback System

Critical safety infrastructure for the Process Flow Designer refactoring project.

## Overview

The rollback system provides immediate reversion capabilities during refactoring to prevent the failures experienced in the previous refactor attempt. It offers multiple levels of backup and recovery options.

## Quick Start

```bash
# Create backup before making changes
./rollback.sh --create

# Emergency one-command rollback
./quick-rollback.sh

# List all available backups
./rollback.sh --list

# Restore specific backup
./rollback.sh --restore checkpoint_20241201_143022
```

## Scripts

### `rollback.sh` - Main Rollback System
Full-featured backup and restore system with metadata tracking.

**Commands:**
- `--create` - Create new backup checkpoint
- `--list` - List all available backups  
- `--restore ID` - Restore from specific backup
- `--force` - Skip confirmation prompts
- `--status` - Show current project status

**Examples:**
```bash
./rollback.sh --create                     # Before making changes
./rollback.sh --list                       # See available backups
./rollback.sh --restore latest             # Restore latest backup
./rollback.sh --force --restore latest     # Force restore
```

### `quick-rollback.sh` - Emergency Rollback
One-command emergency reversion for critical situations.

```bash
./quick-rollback.sh  # Immediate rollback to latest checkpoint
```

## Backup Structure

```
rollback/
├── backups/
│   ├── checkpoint_YYYYMMDD_HHMMSS.tar.gz  # Backup archives
│   ├── checkpoint_YYYYMMDD_HHMMSS.meta    # Metadata files
│   ├── emergency_before_rollback_*.tar.gz # Auto-created before restore
│   └── latest_checkpoint                   # Reference to latest backup
├── rollback.sh                            # Main rollback script
├── quick-rollback.sh                      # Emergency rollback
└── README.md                              # This documentation
```

## Backup Metadata

Each backup includes metadata:
- Unique ID and timestamp
- Git branch and commit information
- File change count
- Archive size
- Description

## Safety Features

### Automatic Emergency Backup
Before any restore operation, the system automatically creates an emergency backup of the current state, ensuring no work is ever lost.

### Validation Checks
- Verifies backup file integrity
- Checks environment requirements
- Validates project structure

### Force Protection
Confirmation prompts prevent accidental rollbacks unless `--force` flag is used.

## Usage Patterns

### Before Starting Refactoring
```bash
# Create initial checkpoint
./rollback.sh --create

# Verify it was created
./rollback.sh --list
```

### During Development
```bash
# Create checkpoints at major milestones
./rollback.sh --create  # After completing each module

# Check status if something goes wrong
./rollback.sh --status
```

### Emergency Situations
```bash
# If something breaks badly
./quick-rollback.sh

# Or restore to specific known-good state
./rollback.sh --restore checkpoint_20241201_143022
```

### After Emergency Rollback
```bash
# Verify functionality
cd ../tests && ./run-tests.sh

# Check what was restored
./rollback.sh --status

# Create new checkpoint after fixes
./rollback.sh --create
```

## Integration with Week 1 Plan

This rollback system addresses the critical lesson learned from the previous failed refactor:

> **Previous Failure:** "implementing the full plan without incremental testing broke the web application"

**Safety Measures:**
1. **Checkpoint Before Changes** - Every module extraction starts with backup
2. **Emergency Reversion** - One-command rollback if tests fail
3. **State Preservation** - All work preserved through emergency backups
4. **Rapid Recovery** - Minimize downtime during development

## Troubleshooting

### "No backups found"
```bash
./rollback.sh --create  # Create first backup
```

### "Backup file not found"
```bash
./rollback.sh --list    # Check available backups
```

### "Not a git repository"
This is normal - the system works with or without git.

### "Environment validation failed"
Ensure you're in the correct project directory with `script.js` present.

## Technical Details

### Archive Contents
Backups include:
- All source files (`script.js`, `styles.css`, etc.)
- Configuration files
- Test infrastructure
- Documentation

### Exclusions
- `rollback/backups/` (prevents recursive backups)
- `tests/reports/` (temporary test reports)
- `node_modules/` (if present)
- `.git/objects/` (large git objects)
- `*.log` files

### File Sizes
Typical backup sizes:
- Initial project: ~50KB
- With test suite: ~100KB
- Full project: <1MB

## Security Notes

- Backups are stored locally only
- No sensitive data should be in backups
- Emergency backups prevent data loss during restore
- All operations are logged with timestamps

---

## Quick Reference Card

| Command | Purpose |
|---------|---------|
| `./rollback.sh --create` | Create backup |
| `./quick-rollback.sh` | Emergency rollback |
| `./rollback.sh --list` | List backups |
| `./rollback.sh --status` | Check status |

**Emergency Hotline:** `./quick-rollback.sh`

---
*Part of Process Flow Designer Week 1 Foundation Preparation*