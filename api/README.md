# 🚀 Local Development: MinIO + Wolfram Engine

This Backend Utilizies 


This README explains how to:

- [x] Install and run **MinIO** locally (binary or Docker)
- [x] Set up **Docker Compose** for both MinIO and Wolfram Engine
- [x] Access both services for development

---

## 📦 1. Install MinIO Locally (Binary Option)
 
If you prefer to run MinIO without Docker, you can download and run it directly:

### ✅ Download MinIO Binary

Go to the [official MinIO download page](https://min.io/download#/linux) or use a direct command:

**Linux/macOS:**

```bash
wget https://dl.min.io/server/minio/release/darwin-amd64/minio
chmod +x minio
./minio server /data
```