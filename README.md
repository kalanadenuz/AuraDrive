# AuraDrive

> **A high-performance, cloud-native distributed media platform designed for high-throughput asynchronous ingestion, event-driven background processing, and zero-trust multi-tenant storage.**

[![CI / Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)](#)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](#)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](#)
[![Azure](https://img.shields.io/badge/Azure-Cloud_PaaS-0078D4?style=flat-square&logo=microsoftazure)](#)
[![Docker](https://img.shields.io/badge/Docker-Compose_v2-2496ED?style=flat-square&logo=docker)](#)

---

## 🌐 Live Production Endpoints

- **Web Application**: [https://auradrive-web-kakd-hzdyesfzfufvapam.indiasouthcentral-01.azurewebsites.net/](https://auradrive-web-kakd-hzdyesfzfufvapam.indiasouthcentral-01.azurewebsites.net/)
- **REST API & Swagger UI Docs**: [https://auradrive-api-kakd-afhbhkgadmeffdb9.indiasouthcentral-01.azurewebsites.net/docs](https://auradrive-api-kakd-afhbhkgadmeffdb9.indiasouthcentral-01.azurewebsites.net/docs)

---

## 🚀 Key Features

- **Asynchronous Ingestion Decoupling**: API endpoints stream raw master binaries to object storage and enqueue lightweight job tickets, releasing client upload connections in `< 300 ms` with an `HTTP 202 Accepted` acknowledgment.
- **Event-Driven Compute Engine**: Autonomous background workers consume queue messages, execute proportional Lanczos downsampling, normalize mobile orientation via `ImageOps.exif_transpose`, extract deep EXIF/GPS telemetry, and compress derivatives into web-optimized Google WebP (`300×300`, Quality 80, Method 6) achieving `> 99%` payload reductions.
- **Strict Multi-Tenant Isolation**: Enforces tenant segregation across three layers:
  - **Identity**: Stateless JSON Web Tokens (HMAC-SHA256) and salted PBKDF2 password hashing.
  - **Storage**: Directory partitioning under `users/{user_id}/raw/` and `users/{user_id}/thumbnails/`.
  - **Database**: Single-table NoSQL schema routing queries strictly by `PartitionKey = USER#{user_id}`.
- **Direct-to-Client Edge Streaming**: Eliminates application server memory bottlenecks by streaming image binaries directly between the browser and cloud storage via time-bounded Shared Access Signatures (SAS) / pre-signed URLs.
- **Enterprise Account & Asset Lifecycle**:
  - **Out-of-Band Password Reset**: Self-service recovery dispatching 6-digit cryptographic verification codes via Google TLS SMTP with a 15-minute TTL and single-use guards.
  - **Password Security Guardrails**: Enforces 8–10 character passwords with real-time length badges and interactive `Eye` / `EyeOff` visibility toggles.
  - **7-Day Soft-Deletion Recycle Bin**: Allows safe asset trashing with dynamic countdown calculation and atomic restoration using defensive replacement update modes.
  - **Public Zero-Trust Sharing**: Generates scoped public share tokens allowing unauthenticated guest viewing without leaking account credentials.
- **Dual-Target Cloud Portability**: Runs seamlessly both in local virtualized environments via **LocalStack** (AWS S3, SQS, DynamoDB) orchestrated with Docker Compose, and on **Microsoft Azure** (App Service, Functions, Blob, Queue, Table Storage).

---

## 🏗️ Architecture Overview

```mermaid
flowchart LR
    subgraph Client ["Client Presentation"]
        Browser["React 19 SPA<br/>(Tailwind CSS + Framer Motion)"]
    end

    subgraph Gateway ["API Ingress (FastAPI)"]
        API["FastAPI / Uvicorn ASGI<br/>(JWT Auth + Validation)"]
    end

    subgraph Broker ["Message Broker"]
        Queue["Storage Queue / SQS<br/>('auradrive-queue')"]
        DLQ["Dead-Letter Queue<br/>('auradrive-dlq')"]
    end

    subgraph Workers ["Worker Compute"]
        Worker["Worker Daemon / Azure Function<br/>(Pillow + EXIF + Lanczos)"]
    end

    subgraph Storage ["Cloud Persistence"]
        RawBlob[("Blob / S3: auradrive-raw")]
        ThumbBlob[("Blob / S3: auradrive-thumbnails")]
        DB[("Table / DynamoDB: AuraDriveStorage")]
    end

    Browser -->|"1. Upload File"| API
    API -->|"2. Save Master"| RawBlob
    API -->|"3. Put State = pending"| DB
    API -->|"4. Enqueue Ticket"| Queue
    API -->>|"5. HTTP 202 Accepted"| Browser

    Queue -->|"6. Dequeue (60s Lease)"| Worker
    Worker -->|"7. Fetch Master"| RawBlob
    Worker -->|"8. Save WebP Thumbnail"| ThumbBlob
    Worker -->|"9. Upsert State = done + EXIF"| DB
    Worker -.->|"Poison Pill (3 Failures)"| DLQ

    Browser -.->|"10. Direct Stream (Signed SAS URL)"| ThumbBlob
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 6, Tailwind CSS, Framer Motion, Lucide Icons |
| **API Gateway** | FastAPI, Uvicorn, Python 3.11, Pydantic v2, PyJWT, Passlib |
| **Worker Engine** | Python 3.11, Pillow (PIL Fork), ImageOps, ExifTags |
| **Cloud Services (Azure)** | App Service, Azure Functions, Blob Storage, Storage Queue, Table Storage |
| **Cloud Emulation (Local)** | LocalStack 3.8 (AWS S3, SQS, DynamoDB) |
| **Orchestration** | Docker CE, Docker Compose v2 |

---

## ⚙️ Local Development Setup

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose v2](https://docs.docker.com/compose/)
- [Node.js 20+](https://nodejs.org/) (optional, for standalone frontend development)
- [Python 3.11+](https://www.python.org/) (optional, for standalone backend development)

### 1. Clone Repository & Setup Environment

```bash
git clone https://github.com/kalanadenuz/AuraDrive.git
cd AuraDrive

# Copy environment variable template
cp .env.example .env
```

Edit `.env` to configure your preferred SMTP credentials for password reset emails (or leave default for local mock).

### 2. Launch Local Multi-Container Stack

Run the complete platform (LocalStack, FastAPI, Worker Daemon, and React SPA) in isolated containers:

```bash
docker compose up -d --build
```

Docker Compose will provision all local cloud primitives via `init-aws/init-aws.sh` and perform health checks before booting dependent services.

### 3. Verify Local Services

| Service | Local URL / Port | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | [http://localhost:5173](http://localhost:5173) (or `:80`) | React 19 User Dashboard |
| **API Gateway** | [http://localhost:8000](http://localhost:8000) | FastAPI REST Ingress |
| **Interactive API Docs**| [http://localhost:8000/docs](http://localhost:8000/docs) | OpenAPI Swagger UI |
| **LocalStack Gateway** | [http://localhost:4566](http://localhost:4566) | S3, SQS & DynamoDB Emulation |

---

## 🧪 Running Automated Tests

Run the integration and security test suite:

```bash
# Activate virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install test dependencies
pip install -r api/requirements.txt pytest

# Execute all test suites
pytest tests/ -v
```

The test suite validates:
- Multi-tenant tenant boundary isolation (zero data leakage across user JWTs).
- Unauthenticated endpoint protection (HTTP 401/403 guards).
- Password recovery lifecycle (OTP generation, rate-limiting, and single-use expiration).
- Soft deletion and Recycle Bin restoration mechanics.

---

## 📁 Repository Structure

```text
AuraDrive/
├── api/                    # FastAPI REST Gateway
│   ├── routes/             # Authentication, upload, gallery, and share routes
│   ├── services/           # Cloud abstraction layers (AWS boto3 & Azure SDK)
│   ├── main.py             # ASGI application entrypoint & Pydantic models
│   └── requirements.txt    # Backend Python dependencies
├── worker/                 # Event-Driven Image Processing Worker
│   ├── image_processor.py  # Pillow Lanczos downsampling & EXIF orientation
│   ├── metadata.py         # Deep EXIF tag & GPS telemetry extraction
│   ├── worker.py           # Long-polling SQS worker daemon
│   └── function_app.py     # Native Azure Function (v2 Python programming model)
├── frontend/               # React 19 Client SPA
│   ├── src/                # Components (Gallery, Upload, Modal, Auth)
│   ├── public/             # Static web assets & configuration
│   └── vite.config.js      # Bundler & dev server config
├── init-aws/               # LocalStack IaC Provisioning Script (init-aws.sh)
├── tests/                  # Security, isolation, and lifecycle test suites
├── docker-compose.yml      # Multi-container orchestration definition
└── .env.example            # Environment configuration template
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
