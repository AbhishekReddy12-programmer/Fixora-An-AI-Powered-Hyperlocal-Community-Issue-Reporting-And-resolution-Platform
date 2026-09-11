<div align="center">

# 🏙️ FIXORA
### *AI-Powered Civic Defect Intelligence & Municipal Resolution Platform*

**Report. Verify. Resolve.**  
Bridging the gap between active citizens and municipal corporations through automated AI defect triage, spatial intelligence, and community-driven verification.

---

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black.svg?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2BPostGIS-336791.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Groq AI](https://img.shields.io/badge/AI%20Triage-Groq%20%7C%20gpt--oss--120b-f55036.svg?style=flat)](https://groq.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](LICENSE)

[Features](#-key-features) • [How It Works](#-how-it-works) • [System Architecture](#-system-architecture) • [Tech Stack](#-technology-stack) • [Quickstart](#-local-development-setup) • [Deployment](#-deployment-guide) • [Documentation](#-project-documentation)

---

</div>

## 📌 Executive Summary & Problem Statement

In fast-growing cities, public infrastructure defects—such as dangerous potholes, malfunctioning streetlights, hazardous open manholes, and illegal trash dumping—frequently go unnoticed or take months to resolve.

### The Core Roadblocks
1. **Friction in Reporting**: Citizens face clunky municipal portals, confusing department hierarchies, and zero feedback loops.
2. **Spam & Triage Bottlenecks**: City officials are overwhelmed with duplicate or incorrectly classified complaints with vague locations.
3. **Ghost Resolutions**: Complaints are marked "resolved" on paper without proof or citizen confirmation.
4. **Lack of Civic Motivation**: Citizens feel unheard and disengaged from local urban governance.

### The Fixora Solution
**Fixora** transforms civic issue resolution into a collaborative, transparent, and intelligent ecosystem:
* **AI-First Triage**: Citizens upload an image; our Groq AI vision engine automatically classifies defect category, calculates severity (1–5), suggests the responsible municipal department, and titles the issue in seconds.
* **Spatial Verification via PostGIS**: Uses meter-accurate GIS coordinates and interactive maps to cluster defects, prevent duplicate entries, and power national or ward-level discovery.
* **Democratized Truth**: Neighbors verify reported defects directly from their phones. Once confirmed, complaints automatically upgrade to verified status.
* **Accountable Resolution Workflow**: Authorities advance tickets with audit trails and photo evidence, requiring **community confirmation** before an issue is officially closed.
* **Civic Gamification**: Citizens earn Karma points and unlock achievement badges, ranking on a public civic leaderboard.

---

## ✨ Key Features

### 🤖 1. AI-Powered Defect Classification & Triage
* **Groq Vision & Reasoning (`openai/gpt-oss-120b`)**: Sub-second analysis of defect images.
* **Automated Categorization**: Instant mapping into standardized civic categories (`POTHOLE`, `WATER_LEAK`, `BROKEN_STREETLIGHT`, `OPEN_MANHOLE`, `ILLEGAL_DUMP`, `ROAD_DAMAGE`, `DRAINAGE`, etc.).
* **Severity Scoring (1–5)**: Evaluates structural danger and urgency to help municipal staff prioritize emergency fixes.
* **Intelligent Department Routing**: Suggests the exact agency responsible (e.g. *Public Works & Roads*, *Water Supply & Sewerage*, *Electricity & Streetlighting*).

### 🗺️ 2. Geospatial Intelligence & Interactive Mapping
* **OpenStreetMap & Leaflet Integration**: 100% free, open-source mapping with zero paid vendor lock-in or API tokens.
* **Interactive Location Picker**: Drag-and-drop location selector with reverse geocoding via OpenStreetMap Nominatim for street-level address lookup.
* **National & Neighborhood Spatial Radius Query**: Powered by PostgreSQL `PostGIS` with `ST_DWithin` geography queries (sub-15ms latency).
* **Color-Coded Status Markers & Clustering**: Visualizes resolved defects (green), verified defects (blue), and pending reports (orange).

### 🔄 3. Transparent Multi-Stage Complaint Lifecycle
```
[REPORTED] ➔ [UNDER_VERIFICATION] ➔ [VERIFIED] ➔ [ASSIGNED] ➔ [IN_PROGRESS] ➔ [RESOLVED] ➔ [COMMUNITY_CONFIRMED]
```
* **Crowdsourced Validation**: Neighbors living nearby vote on issue legitimacy (`+15 Karma` awarded for community verification).
* **Automatic Status Advancement**: Reaching 3 community verifications auto-promotes the ticket to `VERIFIED`.
* **Resolution Proof**: Municipal teams upload resolution notes and completion timestamps before requesting community sign-off.
* **Audit Trail**: Every status change is immutably timestamped in `IssueTimeline`.

### 🛡️ 4. Direct Server Storage Architecture
* **Zero External Cloud Storage Dependencies**: Eliminates complex AWS S3, Cloudflare R2, or Supabase configurations.
* **Disk-Persisted Static Serving**: Photos are stored directly on the server file system and served via high-performance FastAPI `StaticFiles`.
* **Secure Upload Pipeline**: Validates MIME types, auto-generates tracking keys, and passes image buffers directly to Groq AI in a single request.

### 🏆 5. Civic Gamification & Social Proof
* **Karma Point Economy**: Citizens earn Karma for positive civic actions (+50 for verified reports, +15 for validation votes).
* **Achievement Badges**: Unlock milestones such as *First Responder*, *Civic Guardian*, *Sharp Eye*, and *Urban Hero*.
* **Public Civic Leaderboard**: Celebrates top community contributors and ward-level champions.

### 🏛️ 6. Role-Based Governance (RBAC)
* **Citizen**: Report issues, track tickets, verify neighbor reports, earn badges.
* **Field Worker**: View assigned ward tickets, update status, submit work notes.
* **Municipal Admin**: Real-time KPI dashboard, department assignment, defect management.
* **Super Admin**: System governance, role management, category configuration.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Next.js 16 + React 19)"]
        UI["App Router Pages\n(/report, /explore, /track, /dashboard, /admin)"]
        MapComp["Leaflet & OpenStreetMap\n(Location Picker & Defect Clustering)"]
        AuthContext["Auth Context & API Client\n(JWT Bearer, LocalStorage, Axios/Fetch)"]
    end

    subgraph Server["Backend API (FastAPI + Python 3.12)"]
        Router["FastAPI Router (/api/v1)"]
        AuthDep["OAuth2 & RBAC Guards\n(Argon2id + JWT Tokens)"]
        StorageSvc["Direct Server Storage\n(/uploads Directory on Server Disk)"]
        AISvc["Groq AI Engine\n(openai/gpt-oss-120b Vision & Reasoning)"]
    end

    subgraph Data["Database & Caching Layer"]
        Postgres[("PostgreSQL 16\n+ PostGIS Spatial Extension\n+ pgvector Extension")]
        Redis[("Redis 7 Cache\n& Task Coordination")]
    end

    UI -->|Upload Defect Photo| Router
    Router -->|Save File| StorageSvc
    StorageSvc -->|Buffer to AI| AISvc
    AISvc -->|Category, Severity, Dept| Router
    Router -->|CRUD & ST_DWithin Queries| Postgres
    Router -->|Token & Session Check| AuthDep
    Router -->|Fast Cache| Redis
    MapComp <-->|GeoJSON Lat/Lng| Router
```

---

## ⚙️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16.3 (Turbopack)** | React 19, App Router, SSR & fast client navigation |
| **Styling & Icons** | **Tailwind CSS v4 + Lucide React** | Modern civic theme (`#fbf9f5`), responsive mobile-first UI |
| **Maps & Spatial UI** | **Leaflet.js 1.9 + OpenStreetMap** | Interactive defect maps, custom markers, zero vendor fees |
| **Backend Framework** | **FastAPI (Python 3.12)** | Async endpoints, auto OpenAPI docs, Pydantic v2 validation |
| **Database & GIS** | **PostgreSQL 16 + PostGIS** | Spatial geometries, meter-based radius search, GIST indexes |
| **Vector Intelligence** | **pgvector** | Relational vector database capability for defect embeddings |
| **AI / Vision LLM** | **Groq (`openai/gpt-oss-120b`)** | Sub-second defect triage, severity rating, and routing |
| **Authentication** | **OAuth2 Password Bearer + JWT** | Argon2 password hashing, 30m access & 7d refresh tokens |
| **Evidence Storage** | **Direct Server Storage** | Local server filesystem with FastAPI static file mount |
| **Cache & Queues** | **Redis 7** | High-performance cache & background operations |
| **Deployment** | **Render (Backend + DB) & Vercel (Web)**| Production cloud infrastructure |

---

## 📂 Project Structure

```
fixora/
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── api/v1/endpoints/       # API Route Controllers
│   │   │   ├── auth.py             # Register, Login, Refresh, /me
│   │   │   ├── issues.py           # Report, Upload, Nearby, Verify, Confirm
│   │   │   ├── admin.py            # KPI Stats, Assignment, User management
│   │   │   └── gamification.py     # Leaderboard, Badges
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic BaseSettings (.env loading)
│   │   │   ├── database.py         # SQLAlchemy 2.0 Async Session & Engine
│   │   │   └── security.py         # Argon2 hashing & JWT encoding/decoding
│   │   ├── models/                 # SQLAlchemy Relational & Spatial ORM
│   │   │   ├── user.py             # User schema with RBAC roles & karma
│   │   │   ├── issue.py            # Core defect table with PostGIS geometry
│   │   │   ├── verification.py     # Crowdsourced verification records
│   │   │   ├── timeline.py         # Immutable status transition audit log
│   │   │   └── badge.py            # Gamification achievement badges
│   │   ├── schemas/                # Pydantic v2 Request/Response contracts
│   │   └── services/               # Business logic & integrations
│   │       ├── groq_ai.py          # AI image analysis via Groq
│   │       └── server_storage.py   # Direct server disk storage service
│   ├── uploads/                    # Local server disk storage for defect photos
│   ├── main.py                     # FastAPI entrypoint, CORS, static files
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Template backend configuration
│   └── .env.production             # Ready-to-use Render production config
│
├── frontend/                       # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/                    # Next.js App Router (12 Static Routes)
│   │   │   ├── page.tsx            # Home / Landing page
│   │   │   ├── report/page.tsx     # 3-step reporting wizard with AI preview
│   │   │   ├── explore/page.tsx    # Fullscreen interactive defect map
│   │   │   ├── track/page.tsx      # Ticket tracking & visual timeline
│   │   │   ├── dashboard/page.tsx  # Citizen personal hub & reports
│   │   │   ├── leaderboard/page.tsx# Public civic heroes & badges
│   │   │   ├── admin/page.tsx      # Municipal administration portal
│   │   │   ├── login/page.tsx      # Authentication portal
│   │   │   └── register/page.tsx   # Account registration
│   │   ├── components/map/         # Dynamic Leaflet map components (SSR-safe)
│   │   └── lib/                    # API client, Auth Context, Constants
│   ├── package.json                # Frontend dependencies
│   └── .env.local                  # Local frontend environment variables
│
├── md/                             # Project Architecture & Documentation
│   ├── prd.md                      # Product Requirements Document
│   ├── tech_stack.md               # Detailed technical decisions
│   ├── database_architecture.md    # Database schemas & ERD
│   ├── test.md                     # Complete testing specifications (Suites 1–8)
│   ├── error.md                    # Root-cause analysis & resolution log
│   └── credential.md               # Credential audit for Render & Vercel
│
├── docker-compose.yml              # Local PostgreSQL 16 (PostGIS) + Redis 7
├── render.yaml                     # 1-Click Render Cloud Deployment Blueprint
├── .gitignore                      # Security-hardened git ignore
└── README.md                       # Master project presentation
```

---

## 🔄 Complaint Lifecycle Walkthrough

```
1. 📸 Citizen Reports Defect
   └─ Upload photo ➔ Groq AI auto-classifies category, severity, & department.
   └─ GPS coordinates captured via Leaflet Location Picker.
   └─ Defect ticket created (Status: REPORTED, +50 Karma to citizen).

2. 👥 Community Verification
   └─ Neighbors in the ward view the issue on /explore or /track.
   └─ Click "Verify Issue" on-site (+15 Karma).
   └─ At 3 verifications, status auto-promotes to VERIFIED.

3. 🏛️ Municipal Action & Assignment
   └─ Ward official inspects defect on /admin portal.
   └─ Assigns ticket to field crew (Status: ASSIGNED ➔ IN_PROGRESS).

4. 🛠️ Resolution & Proof
   └─ Field crew completes repair.
   └─ Admin uploads completion notes & timestamp (Status: RESOLVED).

5. ✅ Citizen & Community Confirmation
   └─ Reporting citizen or neighbor confirms the fix on /track.
   └─ Status transitions to COMMUNITY_CONFIRMED (Audit trail closed).
```

---

## 💻 Local Development Setup

### Prerequisites
* **Python**: `3.11+`
* **Node.js**: `18+` & `npm`
* **Docker & Docker Compose**: (for local PostgreSQL + PostGIS & Redis)
* **Groq API Key**: Free tier available from [Groq Console](https://console.groq.com)

---

### Step 1: Start Database & Redis
From the project root:
```bash
docker-compose up -d
```
*This starts PostgreSQL 16 on port `5432` with PostGIS & pgvector pre-installed, and Redis 7 on port `6379`.*

---

### Step 2: Configure & Run Backend (FastAPI)
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate          # Windows PowerShell / CMD
# source venv/bin/activate       # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
* Backend API runs at: **`http://localhost:8000`**
* Interactive Swagger Docs: **`http://localhost:8000/docs`**

---

### Step 3: Configure & Run Frontend (Next.js)
In a new terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
* Web Application runs at: **`http://localhost:3000`**

---

## 🔑 Environment Variables Reference

### Backend (`backend/.env`)
```env
PROJECT_NAME="Fixora API"
ENVIRONMENT=development
API_V1_STR=/api/v1
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/fixora
REDIS_URL=redis://localhost:6379/0
GROQ_API_KEY=gsk_your_groq_api_key_here
JWT_SECRET_KEY=your_64_char_hex_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
UPLOAD_DIR=uploads
MEDIA_BASE_URL=/uploads
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 👥 Default Demo & Testing Accounts

The database comes pre-configured with accounts across different access tiers:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Municipal Admin** | `official@delhi.gov.in` | `officialpassword123` | Full defect management, assign teams, resolve tickets |
| **Citizen (Reporter)** | `citizen@fixora.test` | `citizenpassword123` | Report defects, verify neighbor issues, view badges |
| **Super Admin** | `admin@fixora.org` | `adminpassword123` | System oversight, role adjustments, full platform audit |

---

## 🧪 Testing & Verification

Fixora has undergone end-to-end automated testing across all layers:

```bash
# Execute master test suite (Database, API, AI, Security, Multi-User E2E)
cd backend
python ..\master_test_runner.py
```

### Verification Results
* ✅ **Suite 1: Database & PostGIS Spatial**: 14/14 tests passed (100%).
* ✅ **Suite 2 & 6: API Endpoints & RBAC Security**: 17/17 tests passed (100%).
* ✅ **Suite 3: Groq AI Vision Triage**: Verified with live defect photos.
* ✅ **Suite 7: Full Multi-User Civic Journey**: 13/13 workflow steps verified.
* ✅ **Suite 8: Production Build (`next build`)**: 12/12 static routes compiled with **0 errors**.

---

## ☁️ Deployment Guide

### Deploying Backend to Render
1. Connect your repository to [Render](https://render.com).
2. Choose **Web Service** with root directory `backend`.
3. Use the provided [`render.yaml`](./render.yaml) for automatic provisioning or input the production environment variables documented in [`md/credential.md`](./md/credential.md).

### Deploying Frontend to Vercel
1. Import the repository into [Vercel](https://vercel.com).
2. Set root directory to `frontend`.
3. Set environment variable:
   * `NEXT_PUBLIC_API_BASE_URL`: `https://<your-render-backend>.onrender.com/api/v1`
4. Deploy!

---

## 🚀 Future Roadmap & Scalability

- [ ] **WhatsApp & Telegram Reporting Bots**: Report potholes and streetlights via conversational AI without opening an app.
- [ ] **Drone & Dashcam Stream Ingestion**: Batch defect detection along municipal road corridors using computer vision.
- [ ] **Decentralized SLA Escalation**: Automated alerts sent to district magistrates if emergency defects (Severity 5) remain unassigned for over 48 hours.
- [ ] **Predictive Infrastructure Decay Modeling**: Identifying clusters of micro-cracks before they turn into major road craters.

---

## 📄 Project Documentation

For deep technical specifications, design diagrams, and audit logs, refer to the [`md/`](./md/) directory:
* [Product Requirements Document (PRD)](./md/prd.md)
* [Database Architecture & PostGIS Guide](./md/database_architecture.md)
* [Testing Plan & Specifications](./md/test.md)
* [Error Resolution & Root Cause Log](./md/error.md)
* [Production Credential Inventory](./md/credential.md)

---

<div align="center">

**Built with ❤️ for Smarter, Cleaner, and Safer Cities.**  
*Fixora — Empowering Citizens, Accelerating Governance.*

</div>
