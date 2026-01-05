{
    "job_id": "6946f5be180c5c71295f12ab",
    "candidate_ids": ["6946f5ce180c5c71295fe5be", "6946f5cf180c5c71295fe5cc", "6946f5cf180c5c71295fe5e8"],
    "top_n": 3,
    "question": "Xếp hạng 3 ứng viên tiềm năng nhất và đề xuất bước tiếp theo cho từng người."
}

{
    "job_id": "6946f5be180c5c71295f12ab",
    "candidate_ids": ["6946f5ce180c5c71295fe5be", "6946f5cf180c5c71295fe5cc", "6946f5cf180c5c71295fe5e8"],
    "question": "Tìm các ứng viên có trên 5 năm kinh nghiệm và đã từng làm việc với AWS."
}

{
    "job_id": "6946f5be180c5c71295f12ab",
    "candidate_ids": ["6946f5ce180c5c71295fe5be", "6946f5cf180c5c71295fe5cc"],
    "question": "So sánh chi tiết giữa ứng viên 6946f5ce180c5c71295fe5be và 6946f5cf180c5c71295fe5cc"
}

{
    "session_id": "DÁN_SESSION_ID_VỪA_NHẬN_ĐƯỢC_Ở_TRÊN",
    "job_id": "6946f5be180c5c71295f12ab",
    "message": "Dựa trên CV tôi vừa gửi, tôi cần học thêm gì để làm tốt Job này?"
}

{
    "candidate_id": "6946f5ce180c5c71295fe5be",
    "job_id": "6946f5be180c5c71295f12ab",
    "message": "Hãy lập cho tôi lộ trình 3 tháng cụ thể để bổ sung các kỹ năng còn thiếu cho vị trí này."
}
{
    "candidate_id": "6946f5ce180c5c71295fe5be",
    "job_id": "6946f5be180c5c71295f12ab",
    "message": "Đánh giá mức độ phù hợp của tôi với job này và giải thích tại sao điểm số lại như vậy?"
}

---------------- DÀNH CHO RECRUITER ---------------
Lọc thâm niên	
    "Tìm trong danh sách những ai có trên 5 năm kinh nghiệm và liệt kê điểm mạnh của họ."----	Test hàm _filter_candidates_by_question và regex bắt số năm.
So sánh đối đầu	
    "So sánh ứng viên ...5cc và ...5be, ai có tiềm năng đào tạo thành Fullstack tốt hơn?-------"	Test hàm _compare_two_candidates và tính logic của LLM.
Hỏi về rủi ro
	"Ứng viên nào có rủi ro về mức lương hoặc địa điểm làm việc nhất trong 3 người này?"------	Test khả năng suy luận của AI dựa trên Location (Hà Nội vs Quảng Ninh).


    db.rag_chunks.createIndex(
  { "metadata.doc_type": 1, "metadata.job_id": 1, "metadata.chunk_index": 1 },
  { name: "job_chunks_lookup" }
)

db.rag_chunks.createIndex(
  { "metadata.doc_type": 1, "metadata.candidate_id": 1, "metadata.chunk_index": 1 },
  { name: "candidate_chunks_lookup" }
)

db.rag_chunks.createIndex(
  { "metadata.doc_type": 1, "metadata.source_updated_at": 1 },
  { name: "rag_incremental_sync" }
)

{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "metadata.doc_type"
    },
    {
      "type": "filter",
      "path": "metadata.job_id"
    },
    {
      "type": "filter",
      "path": "metadata.candidate_id"
    }
  ]
}


======================= test cho candidate POST /api/ai/candidate/chat/general
{ "candidate_id":"{{candidate_id}}", "message":"Tôi muốn job backend remote", "limit":5 }
POST /api/ai/candidate/chat/general
Body:

{ "candidate_id":"{{candidate_id}}", "message":"Tôi muốn job backend remote", "limit":5 }


Reply chọn:

{ "candidate_id":"{{candidate_id}}", "session_id":"{{session_id}}", "message":"chọn 1" }


Hỏi sâu:

{ "candidate_id":"{{candidate_id}}", "session_id":"{{session_id}}", "message":"Tôi thiếu gì để pass? Lộ trình 2 tuần." }

Recruiter

POST /api/ai/recruiter/chat/general

{ "message":"Tôi muốn tuyển desktop dev winforms", "limit":5 }


chọn 1

top 20

hỏi sâu: “So sánh top1 top2…”