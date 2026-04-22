# Kevlar DAM

Enterprise Digital Asset Management system with multi-tenant architecture, approval workflows, and analytics.

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

- **Asset Management** — Upload, version, and manage digital assets
- **Approval Workflow** — FSM-based asset approval (Draft → In Review → Approved → Published)
- **Secure Sharing** — JWT-signed expiring share links
- **Analytics** — Dashboard with trends, top creators, and employee metrics
- **Audit Logging** — Immutable audit trail for compliance

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Browser   │────▶│  Nginx    │────▶│  Backend  │
│  (Next.js) │     │ :3000/9000│     │  (NestJS) │
└─────────────┘     └─────────────┘     └─────┬─────┘
                                           │
                        ┌─────────────────┼─────────────────┐
                        │                 │                 │
                   ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
                   │ MongoDB │      │  MinIO  │      │  Redis  │
                   │ :27017  │      │ :9000  │      │ :6379  │
                   └─────────┘      └────────┘      └────────┘
```

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

Required variables:

| Variable | Description |
|----------|-------------|
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `DRM_SECRET_KEY` | Secret for JWT signing |

Get Clerk keys from [clerk.com](https://clerk.com).

---

## Docker Compose (Recommended)

### Start All Services

```bash
# Build and start all containers
docker-compose up -d --build

# View running containers
docker-compose ps
```

### Verify Services

```bash
# Check backend logs
docker-compose logs -f backend

# CheckMinIO is ready
docker-compose logs minio-setup
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

### Check Status

```bash
kubectl get pods
kubectl get services
kubectl logs -f deployment/kevlar-backend
```

### Delete

```bash
kubectl delete -f k8s/
```

---

## Frontend (Development)

Run the frontend separately for development:

### Install Dependencies

```bash
cd kevlar-web
npm install
```

### Start Development Server

```bash
npm run dev
```

Frontend runs on http://localhost:3001

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

The frontend requires:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:3000) |

Set these in `.env.local` or your deployment platform.

---

## Backend API

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

All endpoints (except public share link resolution) require Clerk JWT:

```bash
curl -H "Authorization: Bearer <clerk_token>" \
  http://localhost:3000/api/v1/assets
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

## Troubleshooting

### Backend not starting

```bash
# Check MongoDB is running
docker-compose logs mongodb

# Check environment variables
docker-compose exec backend env | grep MONGO_URI
```

### MinIO bucket not created

```bash
# Check setup container logs
docker-compose logs minio-setup

# Manually run setup
docker-compose exec minio-setup mc mb myminio/kevlar-storage
```

### Frontend can't connect to API

Ensure `NEXT_PUBLIC_API_URL` points to the backend:

```bash
# In kevlar-web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

