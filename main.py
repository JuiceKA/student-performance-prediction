"""
Backend FastAPI - Máy chủ xử lý dự đoán kết quả sinh viên
Khởi động bằng lệnh: uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import joblib
import numpy as np
import os
from typing import Optional

# ============================================================
# KHỞI TẠO ỨNG DỤNG
# ============================================================
app = FastAPI(
    title="Student Prediction API",
    description="API du doan ket qua hoc tap cua sinh vien bang Decision Tree",
    version="2.0.0"
)

# Cho phép Frontend (chạy ở domain khác) gọi API này
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Trong thực tế, hãy thay bằng domain cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# TẢI MÔ HÌNH
# ============================================================
MODEL_PATH = "student_model.pkl"

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(
        f"❌ Không tìm thấy file mô hình '{MODEL_PATH}'!\n"
        "👉 Hãy chạy lệnh: python train_model.py trước!"
    )

model = joblib.load(MODEL_PATH)
print(f"[OK] Da tai mo hinh tu: {MODEL_PATH}")

# ============================================================
# ĐỊNH NGHĨA DỮ LIỆU ĐẦU VÀO
# ============================================================
class StudentData(BaseModel):
    buoi_vang: int    = Field(..., ge=0, le=15, description="So buoi vang (0-15). Moi buoi vang tru 1 diem chuyen can")
    giua_ky: float    = Field(..., ge=0, le=10, description="Diem thi giua ky (0-10)")
    cuoi_ky: float    = Field(..., ge=0, le=10, description="Diem thi cuoi ky (0-10) - trong so cao nhat")
    gioi_tinh: int    = Field(..., ge=0, le=1,  description="Gioi tinh: 1=Nam, 0=Nu")

    model_config = {
        "json_schema_extra": {
            "example": {
                "buoi_vang": 2,
                "giua_ky": 7.0,
                "cuoi_ky": 7.5,
                "gioi_tinh": 1
            }
        }
    }


# ============================================================
# CÁC API ENDPOINT
# ============================================================

@app.get("/")
def root():
    """Kiểm tra server đang chạy"""
    return {
        "status": "✅ Server đang hoạt động",
        "message": "Student Prediction API v1.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": True}


@app.post("/predict")
def predict_student(data: StudentData):
    """
    Du doan ket qua hoc tap bang Decision Tree.
    - **buoi_vang**: So buoi vang (0-15). Moi buoi vang tru 1 diem chuyen can.
    - **giua_ky**  : Diem thi giua ky (0-10) - trong so 30%
    - **cuoi_ky**  : Diem thi cuoi ky (0-10) - trong so 50% (cao nhat)
    - **gioi_tinh**: Gioi tinh (1: Nam, 0: Nu)
    """
    try:
        # Tu dong tinh diem chuyen can: moi buoi vang tru 1 diem
        chuyen_can_auto = max(0.0, 10.0 - data.buoi_vang)

        # Dua vao model theo dung thu tu feature da train:
        # [chuyen_can_auto, giua_ky, cuoi_ky, buoi_vang, gioi_tinh]
        input_data = np.array([[
            chuyen_can_auto,
            data.giua_ky,
            data.cuoi_ky,
            data.buoi_vang,
            data.gioi_tinh
        ]])

        # Goi mo hinh du doan
        prediction  = model.predict(input_data)
        probability = model.predict_proba(input_data)[0].tolist()

        result    = int(prediction[0])
        prob_fail = round(probability[0] * 100, 2)
        prob_pass = round(probability[1] * 100, 2)

        # Danh gia muc do rui ro
        if prob_pass >= 80:
            risk_level = "Thap"
            advice = "Sinh vien dang hoc tap tot, hay duy tri phong do!"
        elif prob_pass >= 60:
            risk_level = "Trung binh"
            advice = "Sinh vien can co gang hon, dac biet chu y diem giua ky va chuyen can."
        elif prob_pass >= 40:
            risk_level = "Cao"
            advice = "Canh bao: Sinh vien co nguy co truot mon. Can tang cuong hoc tap ngay!"
        else:
            risk_level = "Rat cao"
            advice = "Nguy hiem: Sinh vien can can thiep khan cap tu giang vien va co van hoc tap."

        return {
            "prediction":      result,
            "probability":     probability,
            "prob_pass":       prob_pass,
            "prob_fail":       prob_fail,
            "risk_level":      risk_level,
            "advice":          advice,
            "chuyen_can_auto": chuyen_can_auto,
            "input": {
                "buoi_vang":  data.buoi_vang,
                "chuyen_can": chuyen_can_auto,
                "giua_ky":    data.giua_ky,
                "cuoi_ky":    data.cuoi_ky,
                "gioi_tinh":  "Nam" if data.gioi_tinh == 1 else "Nu"
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi du doan: {str(e)}")


@app.post("/predict/batch")
def predict_batch(students: list[StudentData]):
    """Dự đoán kết quả cho nhiều sinh viên cùng lúc"""
    results = []
    for i, student in enumerate(students):
        try:
            result = predict_student(student)
            result["id"] = i + 1
            results.append(result)
        except Exception as e:
            results.append({"id": i + 1, "error": str(e)})
    return {"total": len(results), "results": results}
