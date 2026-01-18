#!/bin/bash

# eStokvel Development Startup Script
echo "?? Starting eStokvel Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_message "Node.js version: $(node --version)"
print_message "npm version: $(npm --version)"

# Check Docker
print_message "Checking Docker..."
if ! docker info &> /dev/null; then
    print_warning "Docker is not running. Attempting to start Docker containers..."
    docker-compose up -d
    sleep 5
else
    print_success "Docker is running"
fi

# Check if database containers are running
print_message "Checking database containers..."
if docker ps | grep -q "postgres"; then
    print_success "PostgreSQL container is running"
else
    print_warning "PostgreSQL container not found. Starting containers..."
    docker-compose up -d postgres redis
    sleep 10
fi

# Generate Prisma client
print_message "Generating Prisma client..."
npx prisma generate
if [ $? -eq 0 ]; then
    print_success "Prisma client generated"
else
    print_warning "Prisma client generation had warnings"
fi

# Reset and seed database (optional - comment out if you want to keep data)
# print_message "Resetting and seeding database..."
# npx prisma db push --force-reset
# npx ts-node prisma/seed.ts

print_message "Starting development server with nodemon..."
print_message "Watching: src/, prisma/, server.ts"
print_message "Auto-restart on file changes: ?"
print_message "Hot reload: ?"
echo ""
print_message "Available endpoints after server starts:"
print_message "  http://localhost:5000/"
print_message "  http://localhost:5000/health"
print_message "  http://localhost:5000/api/auth/register"
print_message "  http://localhost:5000/api/auth/login"
echo ""
print_message "Test credentials:"
print_message "  Phone: 27831234567"
print_message "  Password: password123"
echo ""
print_message "Press Ctrl+C to stop the server"
echo ""

# Start nodemon
nodemon
