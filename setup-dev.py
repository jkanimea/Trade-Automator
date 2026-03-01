#!/usr/bin/env python3
import os
import sys
import subprocess
from pathlib import Path

def run_command(cmd, cwd=None):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        sys.exit(1)
    return result.stdout

def main():
    print("Setting up local development environment...")
    
    # Install Node.js dependencies
    print("\n1. Installing Node.js dependencies...")
    run_command("npm install")
    
    # Install Python dependencies
    print("\n2. Installing Python dependencies...")
    python_dir = Path(__file__).parent / "python"
    run_command("pip install -r requirements.txt", cwd=python_dir)
    
    # Start Docker services
    print("\n3. Starting Docker services...")
    run_command("docker-compose up -d postgres pgadmin")
    
    # Wait for database to be ready
    print("\n4. Waiting for database to be ready...")
    run_command("sleep 10")
    
    # Run database migrations
    print("\n5. Running database migrations...")
    run_command("npm run db:push")
    
    print("\n6. Creating .env.local from example...")
    if not Path("../.env.local").exists():
        run_command("cp .env.example ../.env.local")
        print("\nIMPORTANT: Please edit .env.local with your actual credentials:")
        print("  - TELEGRAM_API_ID and TELEGRAM_API_HASH from my.telegram.org")
        print("  - cTrader credentials from your broker")
        print("  - Twelve Data API key for price verification")
    else:
        print("Found existing .env.local file")
    
    print("\nSetup completed!")
    print("Next steps:")
    print("1. Edit .env.local with your credentials")
    print("2. Run 'npm run dev:services' to start all services")
    print("3. Access frontend at http://localhost:5000")
    print("4. Access pgAdmin at http://localhost:5050 (admin@local.dev / admin123)")

if __name__ == "__main__":
    main()