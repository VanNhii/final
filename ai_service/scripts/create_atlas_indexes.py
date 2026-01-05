"""
Script to create MongoDB indexes for RAG collection filter fields.
This script creates:
1. Regular MongoDB indexes (B-tree) for filter fields
2. Provides instructions for creating Atlas Search Index and Vector Search Index

IMPORTANT: 
- Regular indexes: Created automatically by this script
- Atlas Search Index: Must be created in Atlas UI (for text search)
- Vector Search Index: Must be created in Atlas UI (for vector search)

For MongoDB Atlas, you MUST create Search Indexes in Atlas UI:
1. Go to Atlas UI > Database > Search > Create Search Index
2. Create Vector Search Index for embedding field
3. Create Search Index for text search
"""

import os
import sys
import json
from dotenv import load_dotenv
from pymongo import MongoClient

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "datn_1")
RAG_COLLECTION = os.getenv("RAG_COLLECTION", "rag_chunks")

if not MONGODB_URI:
    raise RuntimeError("Missing MONGODB_URI")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
rag_col = db[RAG_COLLECTION]

print(f"\n=== Creating indexes for {RAG_COLLECTION} ===")

indexes_to_create = [
    {
        "name": "job_city_norm_filter",
        "keys": [("metadata.job_location_city_norm", 1)],
        "description": "Index for filtering jobs by city (normalized)"
    },
    {
        "name": "job_work_location_norm_filter",
        "keys": [("metadata.job_work_location_norm", 1)],
        "description": "Index for filtering jobs by work location (normalized)"
    },
    {
        "name": "candidate_city_norm_filter",
        "keys": [("metadata.city_norm", 1)],
        "description": "Index for filtering candidates by city (normalized)"
    },
    {
        "name": "job_doc_type_city",
        "keys": [("metadata.doc_type", 1), ("metadata.job_location_city_norm", 1)],
        "description": "Compound index for job doc_type and city"
    },
    {
        "name": "job_doc_type_work_location",
        "keys": [("metadata.doc_type", 1), ("metadata.job_work_location_norm", 1)],
        "description": "Compound index for job doc_type and work location"
    }
]

created = []
failed = []

for idx_def in indexes_to_create:
    try:
        # Check if index already exists
        existing_indexes = rag_col.list_indexes()
        index_names = [idx["name"] for idx in existing_indexes]
        
        if idx_def["name"] in index_names:
            print(f"⏭️  Index '{idx_def['name']}' already exists, skipping...")
            continue
            
        rag_col.create_index(idx_def["keys"], name=idx_def["name"], background=True)
        print(f"✅ Created index: {idx_def['name']} - {idx_def['description']}")
        created.append(idx_def["name"])
    except Exception as e:
        print(f"❌ Failed to create index '{idx_def['name']}': {e}")
        failed.append((idx_def["name"], str(e)))

print(f"\n=== Summary ===")
print(f"✅ Created: {len(created)} indexes")
print(f"❌ Failed: {len(failed)} indexes")

if failed:
    print("\n⚠️  Note: Some indexes failed to create.")
    print("For MongoDB Atlas, you may need to create Search Indexes in Atlas UI:")
    print("1. Go to Atlas UI > Database > Search")
    print("2. Create Search Index for your collection")
    print("3. Add filter fields: metadata.job_location_city_norm, metadata.job_work_location_norm")
    print("\nOr if using regular MongoDB (not Atlas), indexes should be created automatically.")

if created:
    print(f"\n✅ Successfully created {len(created)} regular MongoDB indexes!")

print("\n" + "="*70)
print("📋 NEXT STEPS: Create Atlas Search Indexes in Atlas UI")
print("="*70)

# Get config from env
vector_index_name = os.getenv("VECTOR_INDEX_NAME", "vector_index")
text_index_name = os.getenv("TEXT_INDEX_NAME", "rag_text_index")
vector_path = os.getenv("VECTOR_PATH", "embedding")
embedding_dim = os.getenv("EMBEDDING_DIM", "1024")  # BAAI/bge-m3 default is 1024

print(f"\n1️⃣  CREATE VECTOR SEARCH INDEX (Required for $vectorSearch)")
print(f"   Index name: {vector_index_name}")
print(f"   Collection: {RAG_COLLECTION}")
print(f"   Database: {DB_NAME}")
print("\n   Steps in Atlas UI:")
print("   a) Go to: Atlas UI > Database > Search > Create Search Index")
print("   b) Select: 'JSON Editor'")
print("   c) Paste this configuration:")
print()

vector_index_config = {
    "name": vector_index_name,
    "type": "vectorSearch",
    "definition": {
        "fields": [
            {
                "type": "vector",
                "path": vector_path,
                "numDimensions": int(embedding_dim),
                "similarity": "cosine"
            },
            {
                "type": "filter",
                "path": "metadata.doc_type"
            },
            {
                "type": "filter",
                "path": "metadata.visibility"
            },
            {
                "type": "filter",
                "path": "metadata.job_location_city_norm"
            },
            {
                "type": "filter",
                "path": "metadata.job_work_location_norm"
            },
            {
                "type": "filter",
                "path": "metadata.city_norm"
            }
        ]
    }
}

print(json.dumps(vector_index_config, indent=2))
print("\n   d) Click 'Next' and 'Create Search Index'")
print("   e) Wait for index to build (may take a few minutes)")

print(f"\n2️⃣  CREATE TEXT SEARCH INDEX (Optional, for hybrid search)")
print(f"   Index name: {text_index_name}")
print(f"   Collection: {RAG_COLLECTION}")
print(f"   Database: {DB_NAME}")
print("\n   Steps in Atlas UI:")
print("   a) Go to: Atlas UI > Database > Search > Create Search Index")
print("   b) Select: 'JSON Editor'")
print("   c) Paste this configuration:")
print()

text_index_config = {
    "name": text_index_name,
    "type": "search",
    "definition": {
        "mappings": {
            "dynamic": False,
            "fields": {
                "text": {
                    "type": "string",
                    "analyzer": "lucene.standard"
                },
                "metadata": {
                    "type": "document",
                    "fields": {
                        "doc_type": {"type": "string"},
                        "job_title": {"type": "string"},
                        "job_company_name": {"type": "string"},
                        "primary_skills_known_display": {"type": "string"}
                    }
                }
            }
        }
    }
}

print(json.dumps(text_index_config, indent=2))
print("\n   d) Click 'Next' and 'Create Search Index'")

print("\n" + "="*70)
print("✅ After creating indexes in Atlas UI, your vector search will work!")
print("="*70)
print("\n💡 Tip: You can check index status in Atlas UI > Database > Search")
print("   Indexes must be 'Active' before they can be used.")

