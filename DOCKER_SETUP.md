# Docker Setup Guide

This project has been fully dockerized for easy deployment and development. Here's everything you need to know to get started.

## 🚀 Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (1.29+)

### Run the Application
```bash
# Clone and navigate to the project
git clone <repository-url>
cd finance-ai-mockup

# Start all services (this will build the images automatically)
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Stop the Application
```bash
docker-compose down
```

## 📁 Docker Files Overview

### Root Directory
- `docker-compose.yml` - Production setup with nginx
- `docker-compose.dev.yml` - Development setup with hot reload
- `docker-compose.test.yml` - Testing setup with different ports

### Backend (`src/be/`)
- `Dockerfile` - Multi-stage Python build with security best practices
- `.dockerignore` - Excludes unnecessary files for faster builds

### Frontend (`src/fe/`)
- `Dockerfile` - Multi-stage Node.js build + nginx serving
- `Dockerfile.dev` - Development version with hot reload
- `nginx.conf` - Nginx configuration with API proxy
- `.env.docker` - Environment variables for Docker
- `.dockerignore` - Excludes unnecessary files for faster builds

## 🔧 Available Docker Compose Configurations

### 1. Production Setup (`docker-compose.yml`)
- **Frontend**: Built React app served by nginx on port 3000
- **Backend**: Python FastAPI on port 8000
- **Features**: Health checks, restart policies, optimized builds

```bash
docker-compose up --build
```

### 2. Development Setup (`docker-compose.dev.yml`)
- **Frontend**: Hot reload development server on port 3000
- **Backend**: Auto-reload FastAPI server on port 8000
- **Features**: Volume mounts for live code changes

```bash
docker-compose -f docker-compose.dev.yml up --build
```

### 3. Test Setup (`docker-compose.test.yml`)
- **Frontend**: Production build on port 3001
- **Backend**: FastAPI server on port 8001
- **Features**: Isolated ports for testing alongside main app

```bash
docker-compose -f docker-compose.test.yml up --build
```

## 🛠 Docker Commands Cheat Sheet

### Building and Running
```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend

# Run services
docker-compose up                    # Foreground
docker-compose up -d                 # Background (detached)
docker-compose up --build            # Build and run

# Run specific service
docker-compose up backend
```

### Managing Services
```bash
# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop, remove containers, and clean volumes
docker-compose down --volumes --remove-orphans

# Restart services
docker-compose restart
docker-compose restart backend
```

### Debugging and Logs
```bash
# View logs
docker-compose logs                  # All services
docker-compose logs backend          # Specific service
docker-compose logs -f frontend      # Follow logs in real-time

# Execute commands in running containers
docker-compose exec backend bash     # Backend shell
docker-compose exec frontend sh      # Frontend shell (alpine)

# Check container status
docker-compose ps
```

### Cleaning Up
```bash
# Remove unused Docker resources
docker system prune

# Remove all unused images, containers, networks
docker system prune -a

# Remove specific images
docker rmi finance-ai-mockup_frontend
docker rmi finance-ai-mockup_backend
```

## 🔍 Health Checks

Both services include health checks that ensure they're running properly:

- **Backend**: `/health` endpoint check
- **Frontend**: HTTP request to nginx

Check health status:
```bash
docker-compose ps
```

## 🌐 Network Configuration

Services communicate via the `finance-ai-network` bridge network:
- Backend accessible at `http://backend:8000` from frontend
- Frontend proxies API requests to backend via nginx

## 📦 Image Optimization

The Docker setup includes several optimizations:

### Backend
- Multi-stage build to reduce image size
- Non-root user for security
- Efficient layer caching with requirements.txt first
- Health checks for container orchestration

### Frontend
- Multi-stage build (Node.js build → nginx serve)
- Static asset optimization
- Gzip compression enabled
- Security headers configured
- Efficient nginx configuration for SPA routing

## 🔒 Security Features

- **Non-root users** in both containers
- **Security headers** in nginx configuration
- **Limited attack surface** with multi-stage builds
- **Network isolation** between services
- **Resource limits** can be configured

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using the ports
   netstat -an | findstr :3000
   netstat -an | findstr :8000
   ```

2. **Build failures**:
   ```bash
   # Clear Docker cache and rebuild
   docker-compose build --no-cache
   docker system prune -a
   ```

3. **Permission issues**:
   ```bash
   # Ensure Docker has proper permissions
   # On Windows, make sure Docker Desktop is running
   ```

4. **Container not starting**:
   ```bash
   # Check logs for specific error
   docker-compose logs backend
   docker-compose logs frontend
   ```

### Performance Tips

1. **Use `.dockerignore`** files to exclude unnecessary files
2. **Layer caching**: Don't change requirements.txt/package.json unnecessarily
3. **Multi-stage builds**: Keep production images lean
4. **Resource limits**: Configure memory/CPU limits in production

## 🔄 Updating the Application

When you make code changes:

### For Development
```bash
# Changes are reflected automatically due to volume mounts
docker-compose -f docker-compose.dev.yml up
```

### For Production
```bash
# Rebuild and restart
docker-compose up --build
```

## 📝 Environment Variables

### Backend Environment Variables
```bash
SECRET_KEY=your-super-secret-key-change-in-production
DATABASE_URL=sqlite:///:memory:
```

### Frontend Environment Variables
```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

## 🎯 Next Steps

1. **Production Deployment**: Configure for cloud deployment
2. **Database**: Replace SQLite with PostgreSQL/MySQL for production
3. **SSL/HTTPS**: Add SSL certificates for production
4. **Monitoring**: Add logging and monitoring solutions
5. **CI/CD**: Integrate with GitHub Actions or similar

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose logs`
2. Verify Docker installation: `docker --version`
3. Ensure ports are available: `netstat -an | findstr :3000`
4. Try rebuilding: `docker-compose build --no-cache` 