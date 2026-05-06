# BrandOS AI Infrastructure Protocol - Node.js Backend

🚀 **Production-ready Node.js backend for the BrandOS AI Infrastructure Protocol**

## 📋 Overview

This Node.js backend provides a comprehensive RESTful API for the BrandOS AI Infrastructure Protocol, implementing brand scoring, ESG tracking, carbon footprint calculation, and TNFD assessment with GPU acceleration capabilities.

## ✨ Key Features

### 🏗️ Core Architecture
- **Express.js Framework**: High-performance web server
- **Microservices Architecture**: Modular, scalable design
- **GPU Acceleration**: CUDA-enabled AI model processing
- **Decentralized Identity**: DID and Ceramic Network integration
- **Blockchain Integration**: Web3 and smart contract support

### 📊 Scoring Engine
- **Multi-dimensional Scoring**: Brand Identity (25%), ESG (30%), Carbon (25%), TNFD (20%)
- **Industry Benchmarks**: Sector-specific comparison data
- **Real-time Calculations**: Sub-100ms response times
- **Batch Processing**: Parallel scoring for multiple brands

### 🔒 Security & Authentication
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Configurable request throttling
- **API Key Management**: Secure API access control
- **Brand DID Verification**: Decentralized identity validation

### 🌐 API Features
- **RESTful Design**: Standard HTTP methods and status codes
- **OpenAPI Documentation**: Auto-generated API docs
- **Request Validation**: Comprehensive input validation
- **Error Handling**: Structured error responses

## 🛠️ Technology Stack

### Backend Framework
- **Node.js 18+**: JavaScript runtime
- **Express.js 4.18**: Web application framework
- **TypeScript Support**: Optional TypeScript integration

### Database & Cache
- **MongoDB**: Primary data store
- **Redis**: Caching and session storage
- **Mongoose**: MongoDB ODM

### Security & Auth
- **JWT**: JSON Web Tokens
- **bcryptjs**: Password hashing
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing

### Decentralized Tech
- **Ceramic Network**: Decentralized data
- **IPFS**: Distributed file storage
- **Web3.js**: Ethereum integration
- **DID-JWT**: Decentralized identities

### GPU & AI
- **CUDA**: GPU computing support
- **ZoKrates**: Zero-knowledge proofs
- **snarkjs**: Cryptographic proofs

### Monitoring & Logging
- **Winston**: Structured logging
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- Docker and Docker Compose
- MongoDB 6.0+
- Redis 7.0+
- NVIDIA GPU (optional, for GPU acceleration)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd brandos-protocol-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start with Docker Compose**
```bash
docker-compose up -d
```

5. **Or start locally**
```bash
npm run dev
```

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Database
MONGODB_URI=mongodb://localhost:27017/brandos
REDIS_URL=redis://localhost:6379

# GPU Configuration
GPU_ENABLED=true
NVIDIA_VISIBLE_DEVICES=all

# External Services
IPFS_API_URL=http://localhost:4001
CERAMIC_API_URL=http://localhost:7007
```

## 📚 API Documentation

### Base URL
```
Production: https://api.brandos.ai/v1
Development: http://localhost:3000/api/v1
```

### Authentication

#### JWT Token Authentication
```bash
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:3000/api/v1/scoring/calculate
```

#### API Key Authentication
```bash
curl -H "X-API-Key: <api-key>" \
     -H "Content-Type: application/json" \
     -X GET http://localhost:3000/api/v1/scoring/benchmark/technology
```

### Core Endpoints

#### Calculate Brand Score
```bash
POST /api/v1/scoring/calculate
Content-Type: application/json

{
  "brand": {
    "brand_id": "techcorp-001",
    "did": "did:brand:tw:techcorp-001",
    "metadata": {
      "name": "TechCorp",
      "industry": "technology",
      "country": "TW"
    }
  },
  "esg": { ... },
  "carbon": { ... },
  "tnfd": { ... }
}
```

#### Batch Scoring
```bash
POST /api/v1/scoring/calculate-batch
Content-Type: application/json

{
  "requests": [...],
  "parallel_processing": true
}
```

#### Industry Benchmarks
```bash
GET /api/v1/scoring/benchmark/technology
```

#### Brand Comparison
```bash
POST /api/v1/scoring/compare
Content-Type: application/json

{
  "brand_ids": ["techcorp-001", "greenretail-002"]
}
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── app.js                 # Main application entry point
│   ├── config/               # Configuration files
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── index.js
│   ├── controllers/          # Route controllers
│   ├── middleware/           # Express middleware
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── errorHandler.js
│   ├── models/              # Data models
│   ├── routes/              # API routes
│   │   ├── scoring.js
│   │   ├── brand.js
│   │   ├── esg.js
│   │   ├── carbon.js
│   │   ├── tnfd.js
│   │   ├── gpu.js
│   │   ├── verification.js
│   │   ├── governance.js
│   │   └── protocol.js
│   ├── scoring/             # Scoring engine
│   │   ├── brandScoreEngine.js
│   │   ├── esgCalculator.js
│   │   ├── carbonCalculator.js
│   │   └── tnfdCalculator.js
│   ├── services/            # Business logic services
│   │   ├── brandService.js
│   │   ├── esgService.js
│   │   ├── carbonService.js
│   │   ├── tnfdService.js
│   │   ├── gpuService.js
│   │   ├── didService.js
│   │   └── blockchainService.js
│   ├── utils/               # Utility functions
│   │   ├── logger.js
│   │   ├── helpers.js
│   │   └── constants.js
│   └── validators/          # Input validation
├── tests/                   # Test files
├── examples/                # Usage examples
├── docs/                   # Documentation
├── config/                  # Configuration files
├── scripts/                 # Utility scripts
├── logs/                   # Log files
├── uploads/                 # File uploads
├── certs/                  # SSL certificates
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile              # Docker image definition
├── package.json            # Node.js dependencies
└── README.md               # This file
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/scoring/brandScoreEngine.test.js
```

### Test Structure
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability scanning

## 📊 Monitoring & Observability

### Health Checks
```bash
# API Health
curl http://localhost:3000/health

# Scoring Service Health
curl http://localhost:3000/api/v1/scoring/health
```

### Metrics
- **Prometheus**: http://localhost:9090
- **Grafana Dashboard**: http://localhost:3001
  - Username: admin
  - Password: Set in environment variables

### Logging
- **Structured Logs**: JSON format with Winston
- **Log Levels**: error, warn, info, debug
- **Log Rotation: Automatic file rotation

## 🔧 Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run with nodemon for auto-restart
npm run dev:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Code Quality
- **ESLint**: Code linting with Airbnb config
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **Jest**: Testing framework with coverage

### Environment Management
```bash
# Development
npm run dev

# Production
npm start

# Build for production
npm run build
```

## 🐳 Docker Deployment

### Build Image
```bash
docker build -t brandos-backend .
```

### Run with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f brandos-api

# Stop services
docker-compose down
```

### Production Deployment
```bash
# Production build
docker build -f Dockerfile.prod -t brandos-backend:prod .

# Run with production settings
docker run -d \
  --name brandos-api \
  -p 3000:3000 \
  --env-file .env.production \
  brandos-backend:prod
```

## 🚀 Performance

### Benchmarks
- **Response Time**: <100ms for scoring calculations
- **Throughput**: 1000+ requests/second
- **Memory Usage**: <512MB for typical workloads
- **GPU Utilization**: >80% for AI workloads

### Optimization
- **Connection Pooling**: MongoDB and Redis connection pools
- **Caching**: Redis-based response caching
- **Compression**: Gzip response compression
- **Rate Limiting**: Intelligent request throttling

## 🔒 Security

### Authentication Methods
- **JWT Tokens**: For user authentication
- **API Keys**: For service-to-service communication
- **Brand DIDs**: Decentralized identity verification

### Security Features
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **CSRF Protection**: Token-based CSRF protection
- **Rate Limiting**: Request throttling per user/IP

## 🌐 API Usage Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const response = await axios.post('http://localhost:3000/api/v1/scoring/calculate', {
  brand: { /* brand data */ },
  esg: { /* ESG data */ },
  carbon: { /* carbon data */ },
  tnfd: { /* TNFD data */ }
}, {
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  }
});

console.log(response.data);
```

### Python
```python
import requests

response = requests.post('http://localhost:3000/api/v1/scoring/calculate', json={
    'brand': { /* brand data */ },
    'esg': { /* ESG data */ },
    'carbon': { /* carbon data */ },
    'tnfd': { /* TNFD data */ }
}, headers={
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
})

print(response.json())
```

### cURL
```bash
curl -X POST http://localhost:3000/api/v1/scoring/calculate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "brand": { "brand_id": "techcorp-001", ... },
    "esg": { ... },
    "carbon": { ... },
    "tnfd": { ... }
  }'
```

## 📈 Scaling

### Horizontal Scaling
- **Load Balancing**: Nginx reverse proxy
- **Service Replication**: Multiple API instances
- **Database Sharding**: MongoDB sharding
- **Cache Clustering**: Redis cluster

### Vertical Scaling
- **GPU Scaling**: Multiple GPU workers
- **Memory Optimization**: Efficient memory usage
- **CPU Optimization**: Multi-core utilization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write tests for new features
- Update documentation
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [API Docs](http://localhost:3000/api/v1/docs)
- **Issues**: [GitHub Issues](https://github.com/brandos/protocol-backend/issues)
- **Email**: support@brandos.ai
- **Discord**: [Community Discord](https://discord.gg/brandos)

## 🗺️ Roadmap

### v1.1 (Q2 2026)
- [ ] GraphQL API support
- [ ] Advanced AI model integration
- [ ] Real-time WebSocket connections
- [ ] Enhanced GPU optimization

### v1.2 (Q3 2026)
- [ ] Multi-tenant architecture
- [ ] Advanced analytics dashboard
- [ ] Mobile SDK
- [ ] Edge computing support

### v2.0 (Q4 2026)
- [ ] Microservices architecture
- [ ] Kubernetes deployment
- [ ] Advanced security features
- [ ] Machine learning pipeline

---

**Built with ❤️ by the BrandOS Protocol Team**
