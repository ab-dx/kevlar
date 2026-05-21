# Kevlar 
![Kevlar](./assets/logo.png)

Enterprise Digital Asset Management system with multi-tenant architecture, approval workflows, digital fingerprints, semantic tagging and analytics.

## Technical Overview

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TailwindCSS, shadcn/ui |
| Backend | NestJS, TypeScript |
| Database | MongoDB 6.0 (Mongoose ODM) |
| Object Storage | MinIO (S3-compatible) |
| Queue | Redis + BullMQ |
| Auth | Clerk (JWT-based) |
| Reverse Proxy | Nginx |

### Core Features
#### Asset Storage

**(Upload, Version, and Manage)**

* Upload assets to MinIO/S3 compatible object storage
* Built-in asset lifecycle management
* Scalable and high-performance

#### Version Control

**(Version History Tracking)**

* Automatically tracks all asset versions
* Prevents accidental data loss
* Access detailed version history and timeline

#### Approval Workflow

**(FSM-based Approval)**

* Controlled multi-state lifecycle
* In Review, Approved, Published stages
* Configurable review and approval rules

#### Secure Sharing

**(Time-limited, JWT-signed Links)**

* Generate secure JWT-signed links
* Set specific link expiration times
* Control access duration and secure external collaboration

#### Analytics

**(Asset & User Insights)**

* Track asset creation, downloads, and approvals
* Visualize content performance and user engagement
* Gain insights to optimize workflow bottlenecks

#### Audit Logging

**(Complete Immutable Audit Trail)**

* Log every user action and asset state change
* Create a complete, tamper-proof record
* Maintain full compliance documentation and security logs

#### Real-time Updates

**(WebSocket Notifications)**

* Instant notifications for approval state changes
* Real-time updates across user teams
* Keep all stakeholders synchronized and projects moving

#### Asset Fingerprinting

**(Origin Verification & Provenance)**

* Embed digital fingerprints directly into the asset's binary data
* Verify whether scattered or disconnected assets originally belong to the DAM
* Provide a reliable mechanism for the platform to authenticate asset origin post-distribution

### Workflows
![Workflow](./assets/workflow1.png)
![Workflow](./assets/workflow2.png)
![Workflow](./assets/workflow3.png)

### Architecture
![Architecture](./assets/arch.png)

### Showcase
![Showcase](./assets/showcase1.png)
![Showcase](./assets/showcase2.png)
![Showcase](./assets/showcase3.png)
![Showcase](./assets/showcase4.png)

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- kubectl (for Kubernetes)
- Docker Desktop or Minikube (for local K8s)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```
You will need to add the following environment variables to your `.env` (or `.env.local`) file.

```env
# -----------------------------------------------------------------------------
# Authentication (Clerk)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# -----------------------------------------------------------------------------
# App & API Configuration
# -----------------------------------------------------------------------------
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
BACKEND_HOST=127.0.0.1:3000

# -----------------------------------------------------------------------------
# Databases (MongoDB & Redis)
# -----------------------------------------------------------------------------
MONGO_URI=mongodb://root:rootpassword@kevlar-mongo:27017/kevlar?authSource=admin
REDIS_HOST=kevlar-redis
REDIS_PORT=6379

# -----------------------------------------------------------------------------
# Object Storage (MinIO)
# -----------------------------------------------------------------------------
MINIO_ENDPOINT=kevlar-minio
MINIO_PORT=9000
MINIO_EXTERNAL_ENDPOINT=localhost
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=adminpassword
MINIO_DEFAULT_BUCKET=kevlar-storage
MINIO_USE_SSL=false

# -----------------------------------------------------------------------------
# Security & DRM
# -----------------------------------------------------------------------------
DRM_SECRET_KEY=super_secure_unpredictable_drm_key_2026

```

#### Configuration Details

| Service | Description |
| --- | --- |
| **Clerk** | Obtain your Publishable and Secret keys from your [Clerk Dashboard](https://dashboard.clerk.com/). |
| **MinIO & Mongo** | Default credentials (`admin`/`adminpassword` & `root`/`rootpassword`) are pre-configured for local Docker setups. Change these before deploying to production. |
| **DRM** | Ensure `DRM_SECRET_KEY` is replaced with a strong, securely generated string in production environments. |


---

## Docker Compose (Recommended)

### Start All Services

```bash
# Build and start all containers
docker-compose up -d --build

# View running containers
docker-compose ps
```

### Access Points

| Service | URL | Credentials |
|---------|-----|------------|
| Frontend (dev) | http://localhost:3001 | — |
| Backend API | http://localhost:3000 | — |
| MinIO Console | http://localhost:9001 | admin / adminpassword |
| MinIO S3 | localhost:9000 | admin / adminpassword |

### Stop Services

```bash
docker-compose down

# Remove volumes (data)
docker-compose down -v
```

### Rebuild Specific Service

```bash
docker-compose up -d --build backend
```

---

## Kubernetes

The `/k8s` directory contains Kubernetes manifests for deployment.

### Prerequisites

- Kubernetes cluster (local via Minikube/kind or cloud)
- kubectl configured

### Deploy

```bash
# Apply manifests in order
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/mongodb-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/minio-deployment.yaml
kubectl apply -f k8s/minio-setup-deployment.yaml
kubectl apply -f k8s/nginx-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml

# Or apply all
kubectl apply -f k8s/
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/assets/upload/init` | Get presigned upload URL |
| POST | `/assets/upload/complete` | Create asset record |
| GET | `/assets` | List assets |
| GET | `/assets/:id` | Get asset detail |
| POST | `/assets/:id/submit` | Submit for review |
| POST | `/assets/:id/approve` | Approve asset |
| POST | `/delivery/share` | Generate share link |
| GET | `/delivery/resolve/:token` | Resolve share link |
| GET | `/analytics/overview` | Dashboard stats |
| GET | `/audit` | Audit logs |

---

