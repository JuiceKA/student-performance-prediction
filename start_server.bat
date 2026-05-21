@echo off
cd /d "%~dp0"
echo Dang khoi dong Backend Server cho EduPredict...
call venv\Scripts\Activate.bat
uvicorn main:app --host 127.0.0.1 --port 8000
pause
