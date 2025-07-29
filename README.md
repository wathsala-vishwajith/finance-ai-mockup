# Finance AI Mockup

A full-stack finance application mockup with React frontend and FastAPI backend.
Quick MVP with Cursor.

## Features

- **Backend**: FastAPI with JWT authentication, SQLite database, and RESTful APIs
- **Frontend**: React with TypeScript, TailwindCSS, TanStack Router & Query
- **Real-time**: WebSocket support for live updates
- **Containerized**: Full Docker support for easy deployment

## Quick Start with Docker (Recommended)

The easiest way to run the application is using Docker Compose:

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (1.29+)

### Running the Application

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd finance-ai-mockup
   ```

2. **Start all services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Docker Services

- **Backend**: Python FastAPI server on port 8000
- **Frontend**: React app served by Nginx on port 3000
- **Network**: Both services communicate via `finance-ai-network`

### Development with Docker

For development with hot reload:

```bash
# Start services in development mode
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose logs -f

# Rebuild specific service
docker-compose build backend
docker-compose build frontend
```

## Manual Development Setup

If you prefer to run services individually:

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd src/be
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server:**
   ```bash
   uvicorn be.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd src/fe
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start development server:**
   ```bash
   pnpm run dev
   ```

## API Documentation

- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Authentication Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Get current user profile

### Main Endpoints

- `GET /health` - Health check
- `GET /profits/` - Get profit data
- `GET /charts/` - Get chart data
- `WebSocket /chat/` - Chat functionality

## Project Structure

```
finance-ai-mockup/
├── docker-compose.yml          # Docker orchestration
├── README.md                   # This file
├── src/
│   ├── be/                     # Backend (FastAPI)
│   │   ├── Dockerfile         # Backend Docker config
│   │   ├── requirements.txt   # Python dependencies
│   │   ├── main.py           # FastAPI application
│   │   ├── core/             # Core utilities
│   │   ├── models/           # Database models
│   │   ├── routers/          # API routes
│   │   └── schemas/          # Pydantic schemas
│   └── fe/                     # Frontend (React)
│       ├── Dockerfile         # Frontend Docker config
│       ├── nginx.conf         # Nginx configuration
│       ├── package.json       # Node.js dependencies
│       ├── src/
│       │   ├── components/    # React components
│       │   ├── pages/         # Page components
│       │   ├── hooks/         # Custom hooks
│       │   └── lib/           # Utilities
│       └── public/            # Static assets
└── test_auth_endpoints.py     # API tests
```

## Environment Variables

### Backend (.env)
```bash
SECRET_KEY=your-super-secret-key-change-in-production
DATABASE_URL=sqlite:///:memory:
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:8000
```

## Production Deployment

For production deployment:

1. **Update environment variables:**
   - Set secure `SECRET_KEY` in backend
   - Configure proper database URL
   - Update CORS origins

2. **Use production Docker Compose:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Health Checks:**
   - Backend: http://localhost:8000/health
   - Frontend: http://localhost:3000/health

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check if ports are in use
   lsof -i :3000
   lsof -i :8000
   ```

2. **Docker issues:**
   ```bash
   # Clean up Docker resources
   docker-compose down --volumes --remove-orphans
   docker system prune -a
   ```

3. **Build failures:**
   ```bash
   # Rebuild without cache
   docker-compose build --no-cache
   ```

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f
```

## CI/CD Pipeline

This project includes a two-stage automated pipeline using GitHub Actions:

1. **🧪 Testing Stage**: Docker Compose build validation and health checks
2. **🚀 Deploy Stage**: Multi-platform image building and registry push

See [DOCKER_CI_SETUP.md](DOCKER_CI_SETUP.md) for complete setup instructions.

**Features:**
- ✅ Comprehensive docker-compose testing before any deployments
- ✅ Health checks for all services and endpoints  
- ✅ Service resilience and restart testing
- ✅ Multi-platform Docker images (AMD64 + ARM64)
- ✅ Automated staging and production deployments
- ✅ Pull request validation without registry pushes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker: `docker-compose up --build`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.