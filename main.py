"""
Backend FastAPI - Du doan ket qua hoc tap sinh vien
Chay song song ca 2 thuat toan: Decision Tree + Naive Bayes
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import os
from collections import Counter

app = FastAPI(
    title="Student Performance Prediction API",
    description="API du doan ket qua H/M/L bang Decision Tree + Naive Bayes",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# TAI 2 MO HINH
# ============================================================
MODEL_PATH = "student_model.pkl"

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Khong tim thay '{MODEL_PATH}'! Hay chay: python train_model.py truoc!")

model_data   = joblib.load(MODEL_PATH)
dt_pipeline  = model_data["dt_pipeline"]
nb_pipeline  = model_data["nb_pipeline"]
le           = model_data["label_encoder"]
dt_accuracy  = model_data.get("dt_accuracy", 0)
nb_accuracy  = model_data.get("nb_accuracy", 0)

print(f"[OK] Da tai 2 mo hinh tu: {MODEL_PATH}")
print(f"     Decision Tree: {dt_accuracy}% | Naive Bayes: {nb_accuracy}%")

# ============================================================
# DINH NGHIA INPUT
# ============================================================
class StudentData(BaseModel):
    phat_bieu: int = Field(..., ge=0, le=100, description="So lan phat bieu (0-100)")
    tai_lieu:  int = Field(..., ge=0, le=100, description="So lan truy cap tai lieu (0-100)")
    thong_bao: int = Field(..., ge=0, le=100, description="So lan xem thong bao (0-100)")
    nghi_hoc:  int = Field(..., ge=0, le=1,  description="0=Under-7 (nghi duoi 7 ngay), 1=Above-7 (nghi tren 7 ngay)")

    model_config = {
        "json_schema_extra": {
            "example": {"phat_bieu": 50, "tai_lieu": 60, "thong_bao": 40, "nghi_hoc": 0}
        }
    }

# ============================================================
# BANG THONG TIN 3 MUC
# ============================================================
LEVEL_INFO = {
    "H": {
        "ten": "Tot - Xuat sac",
        "mau": "green",
        "canh_bao": "Thap",
        "loi_khuyen": "Sinh vien dang hoc tap rat tot! Hay duy tri phong do va tiep tuc phat huy."
    },
    "M": {
        "ten": "Kha - Trung binh",
        "mau": "yellow",
        "canh_bao": "Trung binh",
        "loi_khuyen": "Sinh vien can co gang hon. Tang cuong xem tai lieu va tich cuc phat bieu tren lop."
    },
    "L": {
        "ten": "Yeu - Canh bao hoc vu",
        "mau": "red",
        "canh_bao": "Cao - Can can thiep",
        "loi_khuyen": "Canh bao hoc vu: Sinh vien co nguy co cao! Can lien he khan cap voi giang vien va co van hoc tap."
    }
}

def predict_with_model(pipeline, input_data):
    """Chay du doan voi 1 pipeline, tra ve dict ket qua."""
    pred_encoded = pipeline.predict(input_data)[0]
    proba        = pipeline.predict_proba(input_data)[0].tolist()
    label        = le.classes_[int(pred_encoded)]
    info         = LEVEL_INFO[label]
    xac_suat     = {le.classes_[i]: round(proba[i] * 100, 2) for i in range(len(le.classes_))}

    return {
        "prediction": label,
        "ten_muc":    info["ten"],
        "mau":        info["mau"],
        "canh_bao":   info["canh_bao"],
        "loi_khuyen": info["loi_khuyen"],
        "xac_suat":   xac_suat,
    }

def majority_vote(dt_label, nb_label):
    """Bien phap: neu 2 thuat toan dong y thi tra ket qua do, neu khac biet thi lay Decision Tree (chinh xac hon)."""
    if dt_label == nb_label:
        return dt_label, True   # dong y
    else:
        return dt_label, False  # khac biet -> lay DT

# ============================================================
# API ENDPOINTS
# ============================================================
@app.get("/")
def root():
    return {"status": "Server online", "version": "3.0.0", "algorithms": ["Decision Tree", "Naive Bayes"]}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "models": {
            "decision_tree": f"{dt_accuracy}%",
            "naive_bayes":   f"{nb_accuracy}%"
        }
    }

@app.post("/predict")
def predict_student(data: StudentData):
    """
    Du doan bang 2 thuat toan song song va tra ve ket qua so sanh.
    """
    try:
        input_data = np.array([[data.phat_bieu, data.tai_lieu, data.thong_bao, data.nghi_hoc]])

        # Chay ca 2 thuat toan
        dt_result = predict_with_model(dt_pipeline, input_data)
        nb_result = predict_with_model(nb_pipeline, input_data)

        # Bien phap ensemble
        consensus_label, is_agree = majority_vote(dt_result["prediction"], nb_result["prediction"])
        consensus_info = LEVEL_INFO[consensus_label]

        return {
            # Ket qua tong hop (hien len UI chinh)
            "prediction":  consensus_label,
            "ten_muc":     consensus_info["ten"],
            "mau":         consensus_info["mau"],
            "canh_bao":    consensus_info["canh_bao"],
            "loi_khuyen":  consensus_info["loi_khuyen"],
            "dong_thuan":  is_agree,

            # Ket qua chi tiet tung thuat toan
            "decision_tree": {**dt_result, "do_chinh_xac": f"{dt_accuracy}%"},
            "naive_bayes":   {**nb_result, "do_chinh_xac": f"{nb_accuracy}%"},

            "input": {
                "phat_bieu": data.phat_bieu,
                "tai_lieu":  data.tai_lieu,
                "thong_bao": data.thong_bao,
                "nghi_hoc":  "Above-7 (Tren 7 ngay)" if data.nghi_hoc == 1 else "Under-7 (Tu 7 ngay tro xuong)"
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi du doan: {str(e)}")
