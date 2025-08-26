#!/bin/bash

# PostgreSQL + pgvector Setup Script
# This script sets up PostgreSQL with pgvector extension for the UI Process application

set -e

echo "🚀 Setting up PostgreSQL with pgvector for UI Process..."

# Update package lists
echo "📦 Updating package lists..."
sudo apt update

# Install PostgreSQL and development headers
echo "🔧 Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib postgresql-server-dev-all

# Install build tools for pgvector
echo "🛠️ Installing build dependencies for pgvector..."
sudo apt install -y build-essential git

# Start and enable PostgreSQL service
echo "▶️ Starting PostgreSQL service..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check PostgreSQL is running
echo "✅ Checking PostgreSQL status..."
sudo systemctl status postgresql --no-pager

# Install pgvector extension
echo "🧩 Installing pgvector extension..."
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

echo "🏗️ Setting up database and user..."

# Create database user for the application
sudo -u postgres psql -c "CREATE USER ui_process_user WITH PASSWORD 'ui_process_dev_password';"
sudo -u postgres psql -c "ALTER USER ui_process_user CREATEDB;"

# Create application database
sudo -u postgres psql -c "CREATE DATABASE ui_process_dev OWNER ui_process_user;"

# Enable pgvector extension in the database
sudo -u postgres psql -d ui_process_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
sudo -u postgres psql -d ui_process_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Grant necessary permissions
sudo -u postgres psql -d ui_process_dev -c "GRANT ALL PRIVILEGES ON DATABASE ui_process_dev TO ui_process_user;"
sudo -u postgres psql -d ui_process_dev -c "GRANT ALL ON SCHEMA public TO ui_process_user;"

echo "🎯 Testing database connection..."
PGPASSWORD=ui_process_dev_password psql -h localhost -U ui_process_user -d ui_process_dev -c "SELECT version();"

echo "🎉 PostgreSQL with pgvector setup completed successfully!"
echo ""
echo "📋 Database Connection Details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: ui_process_dev"
echo "   Username: ui_process_user"
echo "   Password: ui_process_dev_password"
echo ""
echo "🔗 Connection URL: postgresql://ui_process_user:ui_process_dev_password@localhost:5432/ui_process_dev"
echo ""
echo "✨ Next steps:"
echo "   1. Run the database migration script"
echo "   2. Start the API server"
echo "   3. Configure the frontend to use the API"