import os
import sys

# Add server directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import SessionLocal

def alter_db():
    db = SessionLocal()
    try:
        # Check current columns in knowledge_document_chunks
        result = db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'knowledge_document_chunks';
        """))
        columns = {row[0]: row[1] for row in result.fetchall()}
        print("Current columns in knowledge_document_chunks:", columns)
        
        # Ensure 'embedding' column exists
        if 'embedding' not in columns:
            print("Adding 'embedding' column...")
            db.execute(text("ALTER TABLE knowledge_document_chunks ADD COLUMN embedding double precision[];"))
            db.commit()
            print("'embedding' column added successfully.")
            
        # Ensure 'pgvector' extension and 'embedding_vector' column exist if pgvector is installed
        try:
            from pgvector.sqlalchemy import Vector
            print("pgvector is installed. Checking database extension...")
            db.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            db.commit()
            
            # Re-fetch columns
            result = db.execute(text("""
                SELECT column_name FROM information_schema.columns WHERE table_name = 'knowledge_document_chunks';
            """))
            current_cols = [row[0] for row in result.fetchall()]
            
            if 'embedding_vector' not in current_cols:
                print("Adding 'embedding_vector' column...")
                db.execute(text("ALTER TABLE knowledge_document_chunks ADD COLUMN embedding_vector vector(1536);"))
                db.commit()
                print("'embedding_vector' column added successfully.")
        except Exception as pge:
            print(f"pgvector setup skipped or failed: {pge}")
            db.rollback()

        # Let's check alembic status and try to stamp it to the head so migrations don't keep trying to run
        print("Database schema alignment check complete.")
        
    except Exception as e:
        print(f"Error altering DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    alter_db()
