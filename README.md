<div align="center">
  <img src="https://img.icons8.com/clouds/100/000000/graduation-cap.png" alt="EduPredict Logo"/>
  <h1>EduPredict - Student Performance Prediction System</h1>
  <p><strong>A Full-stack Machine Learning Application for Educational Analytics</strong></p>

  [![Python](https://img.shields.io/badge/Python-3.14+-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E.svg?style=flat&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
  [![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-F7DF1E.svg?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
</div>

---

## 📖 Tổng Quan Dự Án (Project Overview)

**EduPredict** là một hệ thống phân tích và dự đoán kết quả học tập của sinh viên dựa trên kỹ thuật **Khai phá dữ liệu (Data Mining)** và **Học máy (Machine Learning)**. 

Dự án được thiết kế theo kiến trúc **Client-Server (Decoupled Architecture)** nhằm đảm bảo tính mở rộng, phân tách rõ ràng giữa thuật toán xử lý dữ liệu (Backend) và giao diện tương tác (Frontend). Hệ thống giải quyết bài toán phân lớp nhị phân (Binary Classification), giúp các tổ chức giáo dục nhận diện sớm sinh viên có nguy cơ trượt môn để kịp thời đưa ra giải pháp can thiệp.

---

## 🎯 Điểm Nhấn Kỹ Thuật (Key Technical Achievements)

### 1. Machine Learning Pipeline
- **Thuật toán:** Sử dụng **Decision Tree Classifier**.
- **Chống Overfitting:** Áp dụng các kỹ thuật cắt tỉa (Pruning) thông qua việc tinh chỉnh Hyperparameters: giới hạn độ sâu cây (`max_depth=8`), số lượng mẫu tối thiểu để tách node (`min_samples_split=10`) và số lượng mẫu tối thiểu ở node lá (`min_samples_leaf=5`).
- **Tiền xử lý dữ liệu (Data Preprocessing):** Sử dụng `StandardScaler` để chuẩn hóa các luồng dữ liệu đầu vào có thang đo khác nhau, kết hợp `Pipeline` của scikit-learn để đảm bảo luồng xử lý đồng nhất giữa lúc train và deploy.
- **Xử lý mất cân bằng lớp (Class Imbalance):** Cấu hình `class_weight='balanced'` để tự động điều chỉnh trọng số cho các tập dữ liệu không cân bằng.

### 2. Backend Engineering (FastAPI)
- **High Performance API:** Xây dựng RESTful API bằng FastAPI, tận dụng khả năng bất đồng bộ (Asynchronous) và tự động validate dữ liệu đầu vào bằng `pydantic`.
- **CORS Management:** Cấu hình Middleware quản lý CORS chặt chẽ cho phép Frontend ở các Domain khác nhau có thể giao tiếp an toàn.
- **Model Serialization:** Quản lý vòng đời mô hình AI bằng `joblib`, giúp tải model vật lý (`.pkl`) vào RAM chỉ 1 lần khi khởi động Server (Singleton Pattern).

### 3. Frontend & UI/UX
- **Vanilla JavaScript:** Xử lý toàn bộ logic giao diện, call API (Fetch API) và cập nhật DOM mà không phụ thuộc vào Framework bên thứ ba, tối ưu hóa tốc độ tải trang.
- **Responsive Design:** Thiết kế giao diện Glassmorphism hiện đại, tương thích hoàn hảo trên thiết bị di động và máy tính bảng nhờ Vanilla CSS và Flexbox/Grid.
- **Real-time UX:** Hệ thống tự động tính toán điểm chuyên cần và đồng bộ hóa thanh trượt (Range Slider) với ô nhập liệu theo thời gian thực (Event-driven).

---

## ⚙️ Cấu Trúc Hệ Thống (System Architecture)

```text
student-prediction/
├── Model Training 
│   ├── train_model.py       # Script sinh dữ liệu, huấn luyện và đánh giá mô hình
│   └── student_model.pkl    # Serialized Model Artifact
├── Backend (API Layer)
│   ├── main.py              # FastAPI Application & Endpoints
│   └── requirements.txt     # Dependencies
├── Frontend (Client Layer)
│   ├── index.html           # UI Markup
│   ├── style.css            # Custom Styling (Glassmorphism)
│   └── app.js               # Client-side Logic & API Integration
└── Deployment Scripts
    ├── start_server.bat     # Executable để khởi động hệ thống nhanh
    └── run_hidden.vbs       # VBScript để chạy Background Service
```

---

## 🚀 Hướng Dẫn Triển Khai (Getting Started)

### Yêu Cầu Môi Trường
- Python >= 3.8

### Bước 1: Cài đặt Dependencies
```bash
pip install -r requirements.txt
```

### Bước 2: Huấn Luyện Mô Hình (Model Training)
Chạy script để tạo tập dữ liệu mẫu và huấn luyện mô hình Decision Tree:
```bash
python train_model.py
```
*Đầu ra sẽ hiển thị báo cáo phân loại (Classification Report) bao gồm Precision, Recall và F1-Score.*

### Bước 3: Khởi Động Backend Server
Hệ thống đi kèm các script tự động hóa triển khai trên Windows:
- **Chạy trực tiếp (Có log):** Click đúp vào `start_server.bat`.
- **Chạy ngầm (Background Task):** Click đúp vào `run_hidden.vbs`. Thích hợp để đưa vào thư mục `Startup` của Windows để hệ thống luôn sẵn sàng.

*Server sẽ lắng nghe tại `http://127.0.0.1:8000`*

### Bước 4: Khởi Động Frontend
Mở trực tiếp file `index.html` trên bất kỳ trình duyệt web hiện đại nào.

---

## 📡 API Documentation

Khi Backend hoạt động, tài liệu API chuẩn OpenAPI sẽ tự động được sinh ra:
- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Endpoint Chính: `POST /predict`
Nhận dữ liệu sinh viên và trả về kết quả phân tích.

**Payload Request:**
```json
{
  "buoi_vang": 2,
  "giua_ky": 7.0,
  "cuoi_ky": 7.5,
  "gioi_tinh": 1
}
```

**JSON Response:**
```json
{
  "prediction": 1,
  "prob_pass": 85.5,
  "prob_fail": 14.5,
  "risk_level": "Thấp",
  "advice": "Sinh viên đang học tập tốt, hãy duy trì phong độ!"
}
```

---
*Dự án được xây dựng như một minh chứng năng lực (Proof of Concept) cho vị trí Kỹ sư Phần mềm / Machine Learning Engineer.*
