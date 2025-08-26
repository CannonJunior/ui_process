/**
 * Database Setup Script
 * Creates database and user if they don't exist
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'ui_process_dev';
const DB_USER = process.env.DB_USER || 'ui_process_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'ui_process_dev_password';

async function setupDatabase() {
    console.log('🏗️  Setting up database...');

    try {
        // Create user (ignore error if exists)
        try {
            execSync(`sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"`, {
                stdio: 'inherit'
            });
            console.log(`✅ User '${DB_USER}' created`);
        } catch (error) {
            console.log(`ℹ️  User '${DB_USER}' may already exist`);
        }

        // Grant create database permission
        try {
            execSync(`sudo -u postgres psql -c "ALTER USER ${DB_USER} CREATEDB;"`, {
                stdio: 'inherit'
            });
            console.log(`✅ User '${DB_USER}' granted CREATEDB permission`);
        } catch (error) {
            console.log('⚠️  Could not grant CREATEDB permission');
        }

        // Create database (ignore error if exists)
        try {
            execSync(`sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"`, {
                stdio: 'inherit'
            });
            console.log(`✅ Database '${DB_NAME}' created`);
        } catch (error) {
            console.log(`ℹ️  Database '${DB_NAME}' may already exist`);
        }

        // Enable extensions
        try {
            execSync(`sudo -u postgres psql -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS vector;"`, {
                stdio: 'inherit'
            });
            console.log('✅ pgvector extension enabled');
        } catch (error) {
            console.log('⚠️  Could not enable pgvector extension');
        }

        try {
            execSync(`sudo -u postgres psql -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS \\"uuid-ossp\\";"`, {
                stdio: 'inherit'
            });
            console.log('✅ uuid-ossp extension enabled');
        } catch (error) {
            console.log('⚠️  Could not enable uuid-ossp extension');
        }

        // Grant permissions
        try {
            execSync(`sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"`, {
                stdio: 'inherit'
            });
            execSync(`sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"`, {
                stdio: 'inherit'
            });
            console.log(`✅ Permissions granted to '${DB_USER}'`);
        } catch (error) {
            console.log('⚠️  Could not grant all permissions');
        }

        console.log('🎉 Database setup completed!');
        console.log('');
        console.log('📋 Database Details:');
        console.log(`   Database: ${DB_NAME}`);
        console.log(`   User: ${DB_USER}`);
        console.log(`   Host: localhost`);
        console.log(`   Port: 5432`);

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    }
}

setupDatabase();