import os
import subprocess

def create_migrations():
    """Create Django migrations for the models"""
    try:
        # Make migrations
        result = subprocess.run(['python', 'manage.py', 'makemigrations'], 
                              capture_output=True, text=True)
        print("Makemigrations output:")
        print(result.stdout)
        if result.stderr:
            print("Errors:")
            print(result.stderr)
        
        # Apply migrations
        result = subprocess.run(['python', 'manage.py', 'migrate'], 
                              capture_output=True, text=True)
        print("\nMigrate output:")
        print(result.stdout)
        if result.stderr:
            print("Errors:")
            print(result.stderr)
            
        print("\nDatabase setup complete!")
        
    except Exception as e:
        print(f"Error creating migrations: {e}")

if __name__ == "__main__":
    create_migrations()
