#!/bin/bash

# Knowledge Graph Setup Script
# Initializes PostgreSQL database with pgvector and sample knowledge graph data

set -e  # Exit on any error

echo "🧠 Setting up Knowledge Graph Database..."

# Check if we're in the right directory
if [ ! -f "api/package.json" ]; then
    echo "❌ Error: Run this script from the ui_process root directory"
    exit 1
fi

# Check if API server is installed
if [ ! -d "api/node_modules" ]; then
    echo "📦 Installing API server dependencies..."
    cd api
    npm install
    cd ..
fi

# Start PostgreSQL if not running (adjust for your system)
echo "🐘 Checking PostgreSQL status..."
if ! pgrep -x "postgres" > /dev/null; then
    echo "⚠️  PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On Ubuntu: sudo systemctl start postgresql"
    echo "   On macOS: brew services start postgresql"
    echo "   Or check your system's PostgreSQL service"
    exit 1
fi

# Set environment variables for database connection
export DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:password@localhost:5432/ui_process"}
export NODE_ENV=${NODE_ENV:-"development"}

echo "🔧 Using database: $DATABASE_URL"

# Run database migrations
echo "📊 Running database migrations..."
cd api

# Check if the database exists and create if needed
echo "🏗️  Setting up database structure..."
node -e "
const { testConnection, query } = require('./src/config/database.js');
const fs = require('fs');

async function setup() {
    try {
        console.log('Testing database connection...');
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }
        
        console.log('✅ Database connected');
        
        // Run knowledge graph migration
        console.log('🧠 Creating knowledge graph schema...');
        const migration = fs.readFileSync('./src/database/migrations/005-knowledge-graph.sql', 'utf8');
        await query(migration);
        console.log('✅ Knowledge graph schema created');
        
        // Insert sample data
        console.log('📝 Inserting sample knowledge graph data...');
        const sampleData = fs.readFileSync('./src/database/seeds/knowledge-graph-sample.sql', 'utf8');
        await query(sampleData);
        console.log('✅ Sample data inserted');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

setup();
"

cd ..

echo ""
echo "✅ Knowledge Graph setup completed successfully!"
echo ""
echo "🧪 Next steps:"
echo "1. Start the API server:     cd api && npm start"
echo "2. Start the web server:     python3 -m http.server 8000"
echo "3. Test KG functionality:    http://localhost:8000/test-knowledge-graph.html"
echo ""
echo "📊 Sample data includes:"
echo "   • 3 People (Alice Johnson, Bob Smith, Carol Chen)"
echo "   • 2 Companies (TechCorp Industries, DataFlow Systems)"
echo "   • 2 Documents (AI Spec, Risk Assessment)" 
echo "   • 2 Assets (Vector DB Cluster, AI Workstation)"
echo "   • 9 Relationships connecting them"
echo ""
echo "🔍 Try test queries like:"
echo "   • 'Who is Alice Johnson?'"
echo "   • 'What company does Bob Smith work for?'"
echo "   • 'Who works for TechCorp Industries?'"
echo ""