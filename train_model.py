"""
Script huấn luyện mô hình Random Forest để dự đoán kết quả sinh viên
Chạy file này TRƯỚC để tạo ra file student_model.pkl
"""

import numpy as np
import joblib
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import random

random.seed(42)
np.random.seed(42)

# ============================================================
# TẠO/TẢI DỮ LIỆU HUẤN LUYỆN TỪ FILE CSV
# ============================================================
import pandas as pd
import os

CSV_FILE = "data_sinh_vien.csv"

def load_or_generate_data():
    if not os.path.exists(CSV_FILE):
        print(f"[*] Khong tim thay {CSV_FILE}. Dang tao file excel (csv) mau voi 1000 sinh vien...")
        data = []
        for _ in range(1000):
            buoi_vang = int(np.random.randint(0, 16))
            giua_ky = round(np.random.uniform(0, 10), 1)
            cuoi_ky = round(np.random.uniform(0, 10), 1)
            gioi_tinh = int(np.random.randint(0, 2))
            
            chuyen_can_auto = max(0.0, 10.0 - buoi_vang)
            score = (chuyen_can_auto * 0.20 + giua_ky * 0.30 + cuoi_ky * 0.50)
            noise = np.random.normal(0, 0.4)
            ket_qua = 1 if (score + noise) >= 5 else 0
            
            data.append([buoi_vang, giua_ky, cuoi_ky, gioi_tinh, ket_qua])
            
        df = pd.DataFrame(data, columns=["buoi_vang", "giua_ky", "cuoi_ky", "gioi_tinh", "ket_qua"])
        df.to_csv(CSV_FILE, index=False)
        print(f"[OK] Da tao thanh cong file: {CSV_FILE}")
        print(f"[*] Ban co the mo file nay bang Excel, sua doi du lieu va chay lai de Train AI!")
        
    print(f"\n[*] Dang doc du lieu tu file: {CSV_FILE}")
    df = pd.read_csv(CSV_FILE)
    
    # Kiem tra cac cot bat buoc
    required_cols = ["buoi_vang", "giua_ky", "cuoi_ky", "gioi_tinh", "ket_qua"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"[Loi] Thieu cot '{col}' trong file CSV!")
            
    # Tu dong tinh diem chuyen can tu so buoi vang (de khop voi logic tren web)
    df["chuyen_can_auto"] = df["buoi_vang"].apply(lambda x: max(0.0, 10.0 - x))
    
    # Sap xep dung thu tu dac trung ma web dang dung:
    # [chuyen_can_auto, giua_ky, cuoi_ky, buoi_vang, gioi_tinh]
    X = df[["chuyen_can_auto", "giua_ky", "cuoi_ky", "buoi_vang", "gioi_tinh"]].values
    y = df["ket_qua"].values
    
    return X, y

X, y = load_or_generate_data()

# Chia tập dữ liệu
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"   Tong mau: {len(X)}")
print(f"   Train: {len(X_train)} | Test: {len(X_test)}")
print(f"   Ti le Dat/Truot: {y.sum()}/{len(y)-y.sum()}")

# ============================================================
# HUẤN LUYỆN MÔ HÌNH
# ============================================================
print("\n[AI] Dang huan luyen mo hinh Decision Tree...")

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', DecisionTreeClassifier(
        max_depth=8,            # Gioi han chieu sau cay de tranh hoc vet (overfitting)
        min_samples_split=10,   # Toi thieu 10 mau moi nut moi duoc phan chia
        min_samples_leaf=5,     # Toi thieu 5 mau moi la cay
        criterion='gini',       # Tieu chi phan chia: Gini Impurity
        class_weight='balanced',# Can bang du lieu Dat/Truot
        random_state=42
    ))
])

pipeline.fit(X_train, y_train)

# Đánh giá mô hình
y_pred = pipeline.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\n[OK] Do chinh xac tren tap Test: {acc*100:.2f}%")
print("\n[INFO] Bao cao chi tiet:")
print(classification_report(y_test, y_pred, target_names=["Truot", "Dat"]))

# ============================================================
# LƯU MÔ HÌNH
# ============================================================
model_path = "student_model.pkl"
joblib.dump(pipeline, model_path)
print(f"\n[DONE] Da luu mo hinh vao: {model_path}")
print("[NEXT] Khoi dong Backend bang lenh: uvicorn main:app --reload")
