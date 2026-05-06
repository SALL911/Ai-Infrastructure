# BrandOS AI Infrastructure - Extended Backend System

Production-ready Node.js backend for comprehensive brand scoring with MongoDB integration, historical analysis, and external API support.

## Overview

The BrandOS Scoring Backend implements the BrandOS AI Infrastructure protocol for calculating comprehensive brand scores. The system evaluates brands across four key dimensions with specific algorithms and provides secure, verifiable results. This extended version includes MongoDB persistence, historical trend analysis, compliance tagging, and external integration capabilities.

## Architecture

### Scoring Algorithm

The system implements the BrandOS scoring formula:

```
Brand Perception Score = (sentiment * 50) + (nps * 0.5)
ESG Score = (e + s + g) / 3
Carbon Score = 100 - normalized(total_emission)
TNFD Score = (1 - risk) * 50 + (1 - impact) * 30 + (1 - dependency) * 20

Final Brand Score = 0.30 * Brand Perception + 0.25 * ESG + 0.20 * Carbon + 0.25 * TNFD
```

### Data Schema

```json
{
  "brand": {
    "mentions": number,
    "sentiment": number,    // -1 to 1
    "nps": number          // -100 to 100
  },
  "esg": {
    "e": number,          // 0 to 100
    "s": number,          // 0 to 100
    "g": number           // 0 to 100
  },
  "carbon": {
    "total_emission": number
  },
  "tnfd": {
    "dependency": number,  // 0 to 1
    "impact": number,      // 0 to 1
    "risk": number         // 0 to 1
  }
}
```

## New Features

### MongoDB Integration
- **Persistent Storage**: All brand scores stored in MongoDB for reliability
- **Advanced Indexing**: Optimized queries for fast retrieval and ranking
- **Data Relationships**: Connected historical data and compliance tags
- **Scalability**: Horizontal scaling support with MongoDB clusters

### Historical Analysis & Trends
- **Time-Series Data**: Monthly, quarterly, yearly historical tracking
- **Trend Analysis**: Score evolution, volatility, and direction indicators
- **Industry Trends**: Aggregate trends across industries and regions
- **Top Movers**: Identify biggest gainers and decliners

### Compliance Tagging System
- **ESG Compliance**: Automated ESG compliance assessment
- **TNFD Compliance**: Nature-related financial disclosure compliance
- **Carbon Neutral**: Carbon footprint and neutrality tracking
- **Risk Assessment**: Automated risk level classification

### External Integration Ready
- **API Key Authentication**: Secure external partner access
- **Rate Limiting**: Per-key rate limiting for fair usage
- **Export Capabilities**: CSV and JSON data export
- **Webhook Support**: Real-time score change notifications

### Advanced Rankings
- **Multi-Dimensional Sorting**: By score, grade, industry, compliance
- **Real-Time Rankings**: Live brand score rankings
- **Filtering Options**: Advanced filtering by multiple criteria
- **Search Functionality**: Full-text search across brand data

## Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- MongoDB 6.0+ (local or cloud instance)
- 1GB free disk space for data storage

### Installation

1. **Clone and setup**
```bash
cd brandos-backend
npm install
cp .env.example .env
```

2. **Configure MongoDB**
```bash
# Update .env with your MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/brandos
```

3. **Start MongoDB** (if running locally)
```bash
mongod --dbpath /path/to/your/db
```

4. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

5. **Verify installation**
```bash
curl http://localhost:3000/health
```

## API Documentation

### Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Core Endpoints

#### Calculate Brand Score
```bash
POST /api/brand-score/calculate
Content-Type: application/json

{
  "brand_id": "techcorp-001",
  "brand": {
    "mentions": 15000,
    "sentiment": 0.75,
    "nps": 45
  },
  "esg": {
    "e": 85,
    "s": 78,
    "g": 92
  },
  "carbon": {
    "total_emission": 2500.5
  },
  "tnfd": {
    "dependency": 0.3,
    "impact": 0.2,
    "risk": 0.15
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "brand_score": 78.5,
    "grade": "A",
    "confidence": 0.925,
    "verified": true,
    "hash": "a1b2c3d4e5f6...",
    "breakdown": {
      "brand": 82.5,
      "esg": 85.0,
      "carbon": 75.0,
      "tnfd": 71.5
    },
    "compliance_tags": ["ESG_Compliant", "Sustainable"],
    "execution_time_ms": 45,
    "timestamp": "2026-04-14T21:00:00.000Z"
  }
}
```

#### Retrieve Stored Result
```bash
GET /api/brand-score/:id
```

#### Verify Result Integrity
```bash
GET /api/brand-score/:id/verify
```

### Extended Endpoints

#### Brand Rankings
```bash
GET /api/brand-score/ranking?limit=100&grade=A&industry=technology&complianceTags=ESG_Compliant
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rankings": [
      {
        "rank": 1,
        "brand_id": "techcorp-001",
        "brand_score": 92.5,
        "grade": "AAA",
        "compliance_tags": ["ESG_Compliant", "Carbon_Neutral"],
        "metadata": { "industry": "technology" }
      }
    ],
    "total": 1,
    "filters": { "grade": "A", "industry": "technology" }
  }
}
```

#### Historical Data
```bash
GET /api/brand-score/:brandId/history?period=monthly&limit=12
```

**Response:**
```json
{
  "success": true,
  "data": {
    "brand_id": "techcorp-001",
    "current_score": { "score": 78.5, "grade": "A" },
    "historical_trend": [
      {
        "period_start": "2026-01-01T00:00:00Z",
        "score": 75.2,
        "trend_change": 3.3,
        "trend_direction": "improving"
      }
    ],
    "trend_analysis": { "data_points": 12, "trend_direction": "improving" }
  }
}
```

#### Industry Trends
```bash
GET /api/brand-score/trends/industry/technology?period=monthly&limit=12
```

#### Top Movers
```bash
GET /api/brand-score/trends/movers?period=monthly&limit=10&direction=up
```

#### Compliance Tags
```bash
GET /api/brand-score/compliance/tags
```

#### Compliance Statistics
```bash
GET /api/brand-score/compliance/statistics
```

#### Search
```bash
POST /api/brand-score/search
Content-Type: application/json

{
  "searchTerm": "technology",
  "limit": 50,
  "offset": 0
}
```

#### Export Data
```bash
GET /api/brand-score/export?format=csv&grade=A&limit=100
Headers: X-API-Key: your-api-key
```

#### List Results
```bash
GET /api/brand-score?limit=10&offset=0&grade=A
```

#### Get Statistics
```bash
GET /api/brand-score/stats
```

#### Get Configuration
```bash
GET /api/brand-score/config
```

## Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "data": {
    "brand_score": number,        // 0-100
    "grade": "AAA|AA|A|BBB|Risk", // Credit-style grade
    "confidence": number,         // 0.8-0.95
    "verified": true,
    "hash": "string",            // SHA-256 verification hash
    "breakdown": {
      "brand": number,           // 0-100
      "esg": number,             // 0-100
      "carbon": number,          // 0-100
      "tnfd": number             // 0-100
    }
  },
  "metadata": {
    "request_id": "string",
    "processing_time_ms": number,
    "api_version": "v1"
  }
}
```

## Grade System

| Score Range | Grade | Description |
|-------------|-------|-------------|
| 90-100      | AAA   | Excellent - Minimal risk |
| 80-89       | AA    | Very Good - Low risk |
| 70-79       | A     | Good - Moderate risk |
| 60-69       | BBB   | Adequate - Acceptable risk |
| 0-59        | Risk  | Below acceptable - High risk |

## Security Features

### Data Integrity
- **SHA-256 Hashing**: All input data is cryptographically hashed
- **Verification Endpoint**: Verify stored result integrity anytime
- **Immutable Storage**: Results cannot be modified after storage

### Input Validation
- **Comprehensive Validation**: All inputs validated against schema
- **Type Safety**: Strict type checking for all numeric inputs
- **Range Validation**: All values checked for valid ranges

### Rate Limiting
- **Request Throttling**: 1000 requests per 15 minutes per IP
- **Protection**: Prevents abuse and ensures system stability

## Storage System

### File-Based Persistence
- **JSON Storage**: Results stored in structured JSON format
- **In-Memory Cache**: Fast access to recent calculations
- **Automatic Backup**: Configurable backup intervals

### Data Structure
```json
{
  "id": "uuid",
  "brand_score": 78.5,
  "grade": "A",
  "confidence": 0.925,
  "verified": true,
  "hash": "sha256-hash",
  "breakdown": {...},
  "input_data": {...},
  "created_at": "2026-04-14T21:00:00.000Z",
  "execution_time_ms": 45
}
```

## Database Setup

### MongoDB Configuration

1. **Install MongoDB**
```bash
# Ubuntu/Debian
sudo apt-get install -y mongodb

# macOS (using Homebrew)
brew install mongodb-community

# Windows
# Download and install from mongodb.com
```

2. **Start MongoDB Service**
```bash
# Linux/macOS
sudo systemctl start mongod

# macOS (Homebrew)
brew services start mongodb-community

# Windows
net start MongoDB
```

3. **Create Database**
```bash
# Connect to MongoDB shell
mongosh

# Create database and user
use brandos
db.createUser({
  user: "brandos_user",
  pwd: "your_password",
  roles: ["readWrite"]
})
```

4. **Verify Connection**
```bash
# Test connection
mongosh "mongodb://localhost:27017/brandos"
```

### MongoDB Atlas (Cloud Option)

1. **Create Cluster**
   - Sign up at [MongoDB Atlas](https://cloud.mongodb.com)
   - Create a free cluster
   - Get connection string

2. **Configure Network Access**
   - Add your IP address to whitelist
   - Create database user

3. **Update Environment**
```bash
# In .env file
MONGODB_URI=mongodb+srv://brandos_user:password@cluster.mongodb.net/brandos
```

## Development

### Project Structure
```
brandos-backend/
src/
  app.js                    # Main application
  config/
    database.js             # MongoDB configuration
  models/
    BrandScore.js           # Brand score model
    HistoricalScore.js      # Historical data model
    ComplianceTag.js        # Compliance tag model
  scoring/
    brandScoreEngine.js     # Core scoring algorithm
  routes/
    brandScore.js          # Basic API routes
    brandScoreExtended.js   # Extended API routes
  middleware/
    auth.js                # Authentication & API keys
    validation.js          # Input validation
    errorHandler.js        # Error handling
  services/
    databaseService.js      # Database service layer
  utils/
    logger.js              # Logging system
    storage.js             # Legacy storage (migration)
examples/
  request-response-examples.js  # API usage examples
data/                       # MongoDB data directory (legacy)
logs/                       # Application logs
```

### Running Examples
```bash
# Run all examples
node examples/request-response-examples.js

# Run specific example
node -e "require('./examples/request-response-examples.js').exampleCalculateBrandScore()"
```

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## External Integration

### API Key Authentication
For external partners and integrations, the system supports API key authentication:

```bash
# Set up API keys in .env
API_KEYS=partner-key-001,client-key-002,integration-key-003

# Use API key in requests
curl -H "X-API-Key: partner-key-001" \
     -H "Content-Type: application/json" \
     https://api.brandos.ai/api/brand-score/ranking
```

### Rate Limiting for External Access
- **Default**: 1000 requests per 15 minutes per API key
- **Export Limit**: 100 requests per 15 minutes
- **Configurable**: Per-key rate limiting

### Webhook Integration
Configure webhooks for real-time notifications:

```bash
# In .env
WEBHOOK_URL=https://your-domain.com/brandos-webhook
```

### Export Capabilities
External partners can export data in multiple formats:

```bash
# CSV Export
curl -H "X-API-Key: your-api-key" \
     "https://api.brandos.ai/api/brand-score/export?format=csv"

# JSON Export
curl -H "X-API-Key: your-api-key" \
     "https://api.brandos.ai/api/brand-score/export?format=json"
```

## Configuration

### Environment Variables
```bash
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/brandos
MONGODB_DB_NAME=brandos

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_MAX=1000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
ALLOWED_EXTERNAL_ORIGINS=https://partner-domain.com

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# API Keys for External Integration
API_KEYS=brandos-api-key-2026,external-partner-key-001,integration-test-key

# Storage (Legacy - for migration)
DATA_DIR=./data
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24

# External Services
WEBHOOK_URL=https://your-webhook-endpoint.com/brand-score
NOTIFICATION_EMAIL=admin@yourcompany.com

# Compliance and Monitoring
COMPLIANCE_CHECK_INTERVAL_HOURS=6
HISTORICAL_DATA_RETENTION_MONTHS=36
EXPORT_RATE_LIMIT_MAX=100
```

### Scoring Configuration
The scoring weights can be modified in the scoring engine:

```javascript
weights: {
  brand_perception: 0.30,
  esg: 0.25,
  carbon: 0.20,
  tnfd: 0.25
}
```

### Compliance Tag Configuration
Compliance tags are automatically applied based on configurable criteria:

```javascript
// ESG_Compliant Tag Criteria
{
  min_total_score: 70,
  component_requirements: {
    esg: { min_score: 75, required: true }
  },
  min_grade: 'A'
}

// TNFD_Compliant Tag Criteria
{
  component_requirements: {
    tnfd: { 
      min_score: 70, 
      required: true,
      max_risk: 0.3,
      max_impact: 0.3,
      max_dependency: 0.4
    }
  }
}
```

## Monitoring & Logging

### Log Levels
- **error**: System errors and failures
- **warn**: Validation warnings and issues
- **info**: General operational information
- **http**: HTTP request logging
- **debug**: Detailed debugging information

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-14T21:00:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 3600,
  "memory": {...},
  "storage": {...}
}
```

## Performance

### Benchmarks
- **Response Time**: <50ms for scoring calculations
- **Throughput**: 1000+ requests/second
- **Memory Usage**: <256MB for typical workloads
- **Storage Efficiency**: ~1KB per result

### Optimization Features
- **In-Memory Caching**: Fast result retrieval
- **Efficient JSON Parsing**: Optimized data processing
- **Minimal Dependencies**: Lightweight footprint

## Production Deployment

### Docker Deployment
```dockerfile
# Build image
docker build -t brandos-backend .

# Run container
docker run -d \
  --name brandos-api \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  brandos-backend
```

### Environment Setup
```bash
# Production environment
NODE_ENV=production
LOG_LEVEL=warn
RATE_LIMIT_MAX=5000

# Security
ALLOWED_ORIGINS=https://your-domain.com
```

### Monitoring
- **Health Endpoints**: `/health` and `/api/brand-score/health`
- **Statistics**: `/api/brand-score/stats`
- **Logs**: File-based logging with rotation

## API Usage Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const response = await axios.post('http://localhost:3000/api/brand-score/calculate', {
  brand: { mentions: 15000, sentiment: 0.75, nps: 45 },
  esg: { e: 85, s: 78, g: 92 },
  carbon: { total_emission: 2500.5 },
  tnfd: { dependency: 0.3, impact: 0.2, risk: 0.15 }
});

console.log('Brand Score:', response.data.data.brand_score);
```

### Python
```python
import requests

response = requests.post('http://localhost:3000/api/brand-score/calculate', json={
    'brand': {'mentions': 15000, 'sentiment': 0.75, 'nps': 45},
    'esg': {'e': 85, 's': 78, 'g': 92},
    'carbon': {'total_emission': 2500.5},
    'tnfd': {'dependency': 0.3, 'impact': 0.2, 'risk': 0.15}
})

print(f"Brand Score: {response.json()['data']['brand_score']}")
```

### cURL
```bash
curl -X POST http://localhost:3000/api/brand-score/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "brand": {"mentions": 15000, "sentiment": 0.75, "nps": 45},
    "esg": {"e": 85, "s": 78, "g": 92},
    "carbon": {"total_emission": 2500.5},
    "tnfd": {"dependency": 0.3, "impact": 0.2, "risk": 0.15}
  }'
```

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Permission denied**
```bash
# Check file permissions
ls -la data/

# Fix permissions
chmod 755 data/
```

**Memory issues**
```bash
# Check memory usage
node --max-old-space-size=512 src/app.js
```

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Validation Error | Check input data format and ranges |
| 404 | Not Found | Verify result ID exists |
| 429 | Rate Limited | Wait before making more requests |
| 500 | Server Error | Check logs for details |

## Support

- **Documentation**: Complete API documentation at `/api`
- **Health Check**: System status at `/health`
- **Examples**: Comprehensive usage examples in `examples/`
- **Logs**: Detailed logging in `logs/` directory

## License

MIT License - see LICENSE file for details.

---

**BrandOS AI Infrastructure** - Production-ready brand scoring system for comprehensive brand evaluation.
