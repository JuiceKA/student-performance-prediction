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
# TẠO DỮ LIỆU MẪU (Giả lập dữ liệu lịch sử sinh viên)
# ============================================================
# Trong thực tế, bạn hãy thay phần này bằng dữ liệu thực của mình
# Cac dac trung: [chuyen_can_auto, giua_ky, cuoi_ky, buoi_vang, gioi_tinh]
# Nhan: 1 = Dat (Pass), 0 = Truot (Fail)
# Quy tac: chuyen_can_auto = max(0, 10 - buoi_vang)
# Trong so: cuoi_ky(50%) + giua_ky(30%) + chuyen_can(20%)

def generate_student_data(n_samples=1000):
    data = []
    labels = []

    for _ in range(n_samples):
        buoi_vang       = int(np.random.randint(0, 16))       # So buoi vang: 0-15
        chuyen_can_auto = max(0.0, 10.0 - buoi_vang)          # Tu tinh: 10 - buoi vang
        giua_ky         = round(np.random.uniform(0, 10), 1)  # Diem giua ky: 0-10
        cuoi_ky         = round(np.random.uniform(0, 10), 1)  # Diem cuoi ky: 0-10
        gioi_tinh       = int(np.random.randint(0, 2))        # Gioi tinh: 0 hoac 1

        # Trong so: cuoi_ky(50%) > giua_ky(30%) > chuyen_can(20%)
        score = (chuyen_can_auto * 0.20
               + giua_ky         * 0.30
               + cuoi_ky         * 0.50)

        # Them nhieu ngau nhien
        noise = np.random.normal(0, 0.4)
        passed = 1 if (score + noise) >= 5 else 0

        data.append([chuyen_can_auto, giua_ky, cuoi_ky, buoi_vang, gioi_tinh])
        labels.append(passed)

    return np.array(data), np.array(labels)

print("[*] Dang tao du lieu mau...")
X, y = generate_student_data(1000)

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
