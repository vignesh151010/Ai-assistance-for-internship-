import sys
import os
import pymysql

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.config import settings
from app.core.database import Base, engine, get_engine

def setup_mysql_database(host="localhost", port=3306, user="root", password="", db_name="internship_system"):
    print(f"Connecting to MySQL server at {host}:{port} as '{user}'...")
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            print(f"Database `{db_name}` ensured.")
        conn.close()

        # Update environment URL
        new_url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{db_name}"
        print(f"To use MySQL, set in your .env:")
        print(f"DATABASE_URL={new_url}")

        # Initialize tables
        Base.metadata.create_all(bind=engine)
        print("Database schema successfully synchronized.")
    except Exception as e:
        print(f"Error during MySQL setup: {e}")

if __name__ == "__main__":
    pwd = sys.argv[1] if len(sys.argv) > 1 else ""
    setup_mysql_database(password=pwd)
