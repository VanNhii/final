import sys
import os
import requests
import json
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_config
from src.database import get_database

def get_test_data():
    try:
        db = get_database()
        if not db.client:
            db.connect()
        
        job = db.get_collection('jobs').find_one({'is_active': True}, {'_id': 1})
        cands = list(db.get_collection('candidates').find({}, {'_id': 1}, limit=3))
        
        return {
            "job_id": str(job['_id']) if job else None,
            "candidate_ids": [str(c['_id']) for c in cands]
        }
    except Exception as e:
        print(f"Error getting data: {e}")
        return None

def test_recruiter_flow():
    config = get_config()
    host = config.API_HOST
    if host == "0.0.0.0":
        host = "localhost"
    base_url = f"http://{host}:{config.API_PORT}"
    
    print(f"Testing against {base_url}")
    
    data = get_test_data()
    if not data or not data["job_id"]:
        print("No job data found.")
        return

    print(f"Job ID: {data['job_id']}")
    print(f"Candidate IDs: {data['candidate_ids']}")
    
    session_id = None
    recruiter_user_id = "test_recruiter_1" # Mock ID
    
    def send(text, payload_extra=None):
        nonlocal session_id
        try:
            print(f"\n[RECRUITER]: {text.encode('utf-8', errors='ignore').decode('utf-8')}")
        except Exception:
            print(f"\n[RECRUITER]: {text}")
        payload = {
            "recruiter_user_id": recruiter_user_id,
            "question": text,
            "session_id": session_id or "",
            "job_id": data["job_id"],
            "candidate_ids": data["candidate_ids"]
        }
        if payload_extra:
            payload.update(payload_extra)
            
        try:
            res = requests.post(f"{base_url}/api/ai/recruiter/chat/general", json=payload)
            if res.status_code != 200:
                print(f"[ERROR] Status {res.status_code}: {res.text}")
                return None
            
            data_resp = res.json()
            if data_resp.get("data") and data_resp["data"].get("state"):
                session_id = data_resp["data"]["state"]["session_id"]
                
            msg = data_resp.get("message", "")
            print(f"[ASSISTANT]: {msg}")
            
            result = data_resp.get("data", {}).get("result", {})
            if "jd" in result:
                jd = result["jd"]
                if jd:
                    print(f"   -> Generated JD: {jd.get('job_title')}")
                else:
                     print("   -> Generated JD is empty (LLM off?)")
            if "email" in result:
                email = result["email"]
                if email:
                    print(f"   -> Drafted Email: {email.get('subject')}")
                else:
                    print("   -> Drafted Email is empty (LLM off?)")
                
            time.sleep(1)
            return data_resp
        except Exception as e:
            print(f"[EXCEPTION] {e}")
            return None

    # 1. Generate JD (Independent of Job ID in context, but we send it anyway)
    print("\n--- TEST: JD GENERATOR ---")
    send("soạn jd cho vị trí Senior React Developer tại TP.HCM lương 3000$")
    
    # 2. Outreach (Invite)
    print("\n--- TEST: OUTREACH INVITE ---")
    send("soạn email mời phỏng vấn ứng viên đầu tiên")
    
    # 3. Schedule (Invite with time)
    print("\n--- TEST: SCHEDULE INTERVIEW ---")
    send("đặt lịch phỏng vấn ứng viên này vào 9h sáng thứ 2 tuần sau")
    
    # 4. Outreach (Reject)
    print("\n--- TEST: OUTREACH REJECT ---")
    send("từ chối ứng viên vì thiếu kinh nghiệm")

if __name__ == "__main__":
    test_recruiter_flow()
