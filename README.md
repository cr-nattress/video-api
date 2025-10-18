# Sora Video API

## Overview
A production-ready Node.js/Fastify API for generating videos using OpenAI Sora, built with TypeScript and following layered architecture principles.

## Features
- RESTful API with Swagger documentation
- Single and batch video generation
- Async job tracking
- Type-safe TypeScript implementation
- Comprehensive error handling
- Structured logging
- High test coverage

## Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- OpenAI API key with Sora access

## Installation
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your OpenAI API key
```

## Configuration
Edit the `.env` file with your configuration:
- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: Server port (default: 3000)
- `API_KEY`: Your API authentication key

## Development
```bash
# Run in development mode with hot reload
npm run dev

# Run linting
npm run lint

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Type check
npm run type-check

# Format code
npm run format
```

## Production
```bash
# Build the project
npm run build

# Start production server
npm start
```

## Project Structure
```
video-api/
├── src/
│   ├── config/           # Configuration
│   ├── controllers/      # Route handlers
│   ├── services/         # Business logic
│   ├── repositories/     # Data access
│   ├── models/           # Data models
│   ├── schemas/          # Validation schemas
│   ├── routes/           # Route definitions
│   ├── middleware/       # Custom middleware
│   ├── utils/            # Utilities
│   ├── types/            # TypeScript types
│   ├── app.ts            # App configuration
│   └── server.ts         # Entry point
├── tests/                # Test files
└── docs/                 # Documentation
```

## Architecture
This API follows a layered architecture pattern:
- **Presentation Layer**: Controllers and routes
- **Business Logic Layer**: Services
- **Data Access Layer**: Repositories
- **Infrastructure Layer**: Configuration, logging, error handling

## API Endpoints

### Video Generation (Coming Soon)
- `POST /api/v1/videos` - Create a single video
- `POST /api/v1/videos/batch` - Create multiple videos in batch
- `GET /api/v1/videos/:jobId` - Get job status
- `GET /api/v1/videos/:jobId/result` - Get video result
- `DELETE /api/v1/videos/:jobId` - Cancel a job
- `GET /api/v1/videos` - List jobs with filtering

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /ready` - Readiness probe (coming soon)
- `GET /metrics` - Application metrics (coming soon)

### Documentation
- `GET /docs` - Swagger UI (coming in US-004)

## API Documentation
Once the server is running, visit:
- Swagger UI: http://localhost:3000/docs (coming in US-004)
- Health Check: http://localhost:3000/health

## Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Code Quality
```bash
# Run all quality checks
npm run validate

# This runs: lint, format:check, type-check, and test
```

## Contributing
1. Follow the existing code style
2. Write tests for new features
3. Ensure all tests pass
4. Run `npm run validate` before committing

## License
MIT

## Support
For issues and questions, please open an issue in the repository.
