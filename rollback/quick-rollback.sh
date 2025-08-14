#!/bin/bash

# Quick Emergency Rollback - One-Command Reversion
# For immediate emergency situations

set -e

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "==============================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if we have a latest checkpoint
if [[ -f "$SCRIPT_DIR/backups/latest_checkpoint" ]]; then
    LATEST=$(cat "$SCRIPT_DIR/backups/latest_checkpoint")
    echo "🔄 Rolling back to: $LATEST"
    
    # Force restore without confirmation
    "$SCRIPT_DIR/rollback.sh" --force --restore latest
    
    echo "✅ Emergency rollback completed!"
    echo "🔍 Please verify application functionality"
else
    echo "❌ No checkpoint found for emergency rollback"
    echo "💡 Create a checkpoint first: ./rollback.sh --create"
    exit 1
fi