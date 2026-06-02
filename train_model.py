"""
Script huan luyen 2 mo hinh song song:
  - Decision Tree Classifier
  - Naive Bayes (GaussianNB)
Ket qua duoc luu vao student_model.pkl
"""

import numpy as np
import pandas as pd
import joblib
import os
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

np.random.seed(42)

# ============================================================
# TAO / TAI DU LIEU TU FILE CSV
# ============================================================
CSV_FILE = "du_lieu_sv.csv"

def load_or_generate_data():
    if not os.path.exists(CSV_FILE):
        raise FileNotFoundError(
            f"[Loi] Khong tim thay '{CSV_FILE}'!\n"
            f"      Hay chuan bi file {CSV_FILE} truoc khi train."
        )

    print(f"\n[*] Dang doc du lieu tu: {CSV_FILE}")
    df = pd.read_csv(CSV_FILE)

    required_cols = ["So_Lan_Phat_Bieu", "So_Lan_Truy_Cap_Tai_Lieu", "So_Lan_Xem_Thong_Bao", "So_Ngay_Nghi_Hoc", "Ket_Qua"]
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"[Loi] Thieu cot '{col}' trong file CSV!")

    # Xu ly cot So_Ngay_Nghi_Hoc:
    # - Neu la text 'Under-7' / 'Above-7' -> chuyen sang 0 / 1
    # - Neu da la so (0/1) -> giu nguyen
    # Dung pd.api.types.is_string_dtype de kiem tra ca object va StringDtype
    import pandas.api.types as pat
    col = df["So_Ngay_Nghi_Hoc"]
    if pat.is_string_dtype(col) or pat.is_object_dtype(col):
        mapping = {"Under-7": 0, "Above-7": 1}
        df["So_Ngay_Nghi_Hoc"] = col.map(mapping)
        unmapped = df["So_Ngay_Nghi_Hoc"].isna().sum()
        if unmapped > 0:
            print(f"   [Canh bao] Co {unmapped} dong khong xac dinh trong cot So_Ngay_Nghi_Hoc, se bo qua.")
            df = df.dropna(subset=["So_Ngay_Nghi_Hoc"])
        df["So_Ngay_Nghi_Hoc"] = df["So_Ngay_Nghi_Hoc"].astype(int)
        print("   [OK] Da chuyen cot So_Ngay_Nghi_Hoc: Under-7->0, Above-7->1")
    else:
        df["So_Ngay_Nghi_Hoc"] = df["So_Ngay_Nghi_Hoc"].astype(int)

    print(f"   [OK] Doc thanh cong {len(df)} ban ghi.")

    X = df[["So_Lan_Phat_Bieu", "So_Lan_Truy_Cap_Tai_Lieu", "So_Lan_Xem_Thong_Bao", "So_Ngay_Nghi_Hoc"]].values
    y = df["Ket_Qua"].values
    return X, y


# ============================================================
# CHUAN BI DU LIEU
# ============================================================
print("[*] Chuan bi du lieu huan luyen...")
X, y = load_or_generate_data()

le = LabelEncoder()
y_encoded = le.fit_transform(y)
print(f"   Cac nhan: {list(le.classes_)}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)
print(f"   Tong mau: {len(X)} | Train: {len(X_train)} | Test: {len(X_test)}")
counts = {le.classes_[i]: int((y_encoded == i).sum()) for i in range(len(le.classes_))}
print(f"   Phan phoi nhan: {counts}")


# ============================================================
# THUAT TOAN 1: DECISION TREE
# ============================================================
print("\n" + "="*55)
print("[1/2] DECISION TREE CLASSIFIER")
print("="*55)

dt_pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', DecisionTreeClassifier(
        max_depth=8,
        min_samples_split=10,
        min_samples_leaf=5,
        criterion='gini',
        class_weight='balanced',
        random_state=42
    ))
])
dt_pipeline.fit(X_train, y_train)

dt_pred = dt_pipeline.predict(X_test)
dt_acc  = accuracy_score(y_test, dt_pred)
print(f"[OK] Decision Tree - Do chinh xac: {dt_acc*100:.2f}%")
print(classification_report(y_test, dt_pred, target_names=le.classes_, zero_division=0))


# ============================================================
# THUAT TOAN 2: NAIVE BAYES (GaussianNB)
# ============================================================
print("="*55)
print("[2/2] NAIVE BAYES (GaussianNB)")
print("="*55)

nb_pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', GaussianNB())
])
nb_pipeline.fit(X_train, y_train)

nb_pred = nb_pipeline.predict(X_test)
nb_acc  = accuracy_score(y_test, nb_pred)
print(f"[OK] Naive Bayes    - Do chinh xac: {nb_acc*100:.2f}%")
print(classification_report(y_test, nb_pred, target_names=le.classes_, zero_division=0))


# ============================================================
# TONG KET SO SANH
# ============================================================
print("="*55)
print("TONG KET SO SANH HAI THUAT TOAN")
print("="*55)
print(f"  Decision Tree : {dt_acc*100:.2f}%")
print(f"  Naive Bayes   : {nb_acc*100:.2f}%")
winner = "Decision Tree" if dt_acc >= nb_acc else "Naive Bayes"
print(f"  => Thuat toan tot hon tren tap test: [{winner}]")


# ============================================================
# LUU CA 2 MO HINH
# ============================================================
model_path = "student_model.pkl"
joblib.dump({
    "dt_pipeline":   dt_pipeline,
    "nb_pipeline":   nb_pipeline,
    "label_encoder": le,
    "dt_accuracy":   round(dt_acc * 100, 2),
    "nb_accuracy":   round(nb_acc * 100, 2),
}, model_path)

print(f"\n[DONE] Da luu ca 2 mo hinh vao: {model_path}")
print("[NEXT] Khoi dong Backend: uvicorn main:app --reload")
