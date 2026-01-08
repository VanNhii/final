
import sys
import os
import requests
import json
import time

# Force UTF-8 for stdout/stderr to handle Vietnamese on Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_config
from src.database import get_database

def get_first_candidate():
    try:
        db = get_database()
        # Ensure connection
        if not db.client:
            db.connect()
            
        candidate = db.get_collection('candidates').find_one({}, {'_id': 1})
        if candidate:
            return str(candidate['_id'])
        return None
    except Exception as e:
        print(f"Error getting candidate: {e}")
        return None

def test_career_coach_flow():
    config = get_config()
    host = config.API_HOST
    if host == "0.0.0.0":
        host = "localhost"
    base_url = f"http://{host}:{config.API_PORT}"
    
    print(f"Testing against {base_url}")
    
    # 1. Get a candidate
    candidate_id = get_first_candidate()
    if not candidate_id:
        print("No candidate found in DB. Cannot test.")
        # Try a fallback ID if you know one, otherwise exit
        # candidate_id = "60d5ecb8b5c9c62c3c0a1b1a" 
        return

    print(f"Using Candidate ID: {candidate_id}")
    
    session_id = None
    
    # Helper to send message
    def send(text, sleep_sec=1):
        nonlocal session_id
        print(f"\n[USER]: {text}")
        payload = {
            "candidate_id": candidate_id,
            "question": text,
            "session_id": session_id or ""
        }
        try:
            res = requests.post(f"{base_url}/api/ai/candidate/chat/general", json=payload)
            if res.status_code != 200:
                print(f"[ERROR] Status {res.status_code}: {res.text}")
                return None
            
            data = res.json()
            # Update session_id
            if data.get("data") and data["data"].get("state"):
                session_id = data["data"]["state"]["session_id"]
                
            msg = data.get("message", "")
            print(f"[ASSISTANT]: {msg}")
            
            # Print extra structured data if available
            result = data.get("data", {}).get("result", {})
            
            if "cover_letter" in result:
                print(f"   -> Generated Cover Letter (length={len(result['cover_letter'])})")
                
            if "roadmap" in result:
                roadmap = result["roadmap"]
                title = roadmap.get("title", "Roadmap")
                phases = roadmap.get("phases", [])
                print(f"   -> Generated Roadmap: {title} with {len(phases)} phases")
                
            if "critique" in result:
                critique = result["critique"]
                score = critique.get("ats_score", 0)
                print(f"   -> CV Critique: Score {score}/10")
                
            time.sleep(sleep_sec)
            return data
        except Exception as e:
            print(f"[EXCEPTION] {e}")
            return None

    # 2. Start Conversation
    send("Chào bạn")
    
    # 3. Search Job
    # Try a broad search to ensure we get results
    resp = send("tìm job python")
    
    # Check if we got suggestions
    sugs = resp.get("data", {}).get("result", {}).get("suggestions", []) if resp else []
    if not sugs:
        print("No jobs found. Cannot proceed with selection.")
        # Try relaxed
        resp = send("tìm job IT")
        sugs = resp.get("data", {}).get("result", {}).get("suggestions", []) if resp else []
        
    if sugs:
        print(f"   -> Found {len(sugs)} jobs.")
        # 4. Select Job 1
        send("chọn 1")
        
        # 5. Test Cover Letter
        print("\n--- TEST: COVER LETTER (English) ---")
        send("viết cover letter cho job này")
        
        print("\n--- TEST: COVER LETTER (Vietnamese - Thư giới thiệu) ---")
        send("viết thư giới thiệu")

        print("\n--- TEST: COVER LETTER (Vietnamese - Thư xin việc) ---")
        send("viết thư xin việc")
        
        # 6. Test Roadmap
        print("\n--- TEST: ROADMAP ---")
        send("lộ trình 14 ngày")
        
        # 7. Test CV Critique
        print("\n--- TEST: CV CRITIQUE ---")
        send("review cv của mình")
        
    else:
        print("Still no jobs found. Skipping job-dependent tests.")

if __name__ == "__main__":
    test_career_coach_flow()
