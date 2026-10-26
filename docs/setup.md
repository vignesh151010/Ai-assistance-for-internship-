# Installation & Deployment Setup Guide

## System Requirements
- OS: Windows 10/11, macOS, or Linux
- Python: Version 3.10 or higher
- Node.js: Version 18.0.0 or higher
- npm: Version 9.0.0 or higher
- MySQL: Version 8.0 (Optional; zero-config SQLite available out-of-the-box)

---

## 1. Backend Setup

1. Open PowerShell / Terminal in the project root:
   ```powershell
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Configure Environment Variables:
   Copy `.env.example` to `backend/.env` and update credentials:
   ```powershell
   copy ..\.env.example .env
   ```
5. Start the FastAPI development server:
   ```powershell
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 2. Frontend Setup

1. Open a second terminal window:
   ```powershell
   cd frontend
   ```
2. Install npm packages:
   ```powershell
   npm install
   ```
3. Start the Vite React development server:
   ```powershell
   npm run dev
   ```
4. Access the web interface at `http://localhost:5173`.

---

## 3. Configuring MySQL 8.0 (Optional)

To connect directly to your local MySQL 8.0 database:
1. Ensure your MySQL service is running (`MySQL80`).
2. Run the database provisioning script:
   ```powershell
   python scripts\database_setup.py <your_mysql_password>
   ```
3. Update `DATABASE_URL` in `backend/.env`:
   ```
   DATABASE_URL=mysql+pymysql://root:<your_password>@localhost:3306/internship_system
   ```
4. Restart the backend server. Tables and initial seeds will synchronize automatically.
