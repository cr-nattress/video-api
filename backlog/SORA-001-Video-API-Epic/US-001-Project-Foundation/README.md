# User Story: US-001 - Project Foundation & Configuration

## Story Description
**As a** developer
**I want** a properly configured Node.js/TypeScript project with development tools
**So that** I can start building the API with best practices and modern tooling

## Acceptance Criteria
- [ ] Node.js project initialized with package.json
- [ ] TypeScript configured with strict mode
- [ ] All core dependencies installed
- [ ] Development scripts (dev, build, start, test, lint) working
- [ ] ESLint and Prettier configured
- [ ] Project directory structure created
- [ ] Environment configuration setup with .env.example
- [ ] Git repository initialized with .gitignore
- [ ] Basic server runs without errors

## Story Points
5

## Priority
Must Have (P0)

## Dependencies
None

## Technical Notes
- Use Node.js v18+ for best compatibility
- TypeScript 5+ with strict mode enabled
- Fastify as the web framework
- Follow the layered architecture pattern

---

## Task Prompts

### Task 1: Initialize Node.js Project
```
Initialize a new Node.js project with npm in the video-api directory. Create a package.json with the following details:
- name: "sora-video-api"
- version: "1.0.0"
- description: "OpenAI Sora Video Generation API"
- main: "dist/server.js"
- Set engines to require Node.js >= 18.0.0

Install the following PRODUCTION dependencies:
- fastify@^4.25.0
- @fastify/swagger@^8.14.0
- @fastify/swagger-ui@^2.1.0
- @fastify/type-provider-typebox@^4.0.0
- @sinclair/typebox@^0.32.0
- dotenv@^16.3.1
- pino@^8.16.0
- pino-pretty@^10.2.3

Install the following DEV dependencies:
- typescript@^5.3.3
- @types/node@^20.10.0
- tsx@^4.7.0
- eslint@^8.56.0
- @typescript-eslint/eslint-plugin@^6.15.0
- @typescript-eslint/parser@^6.15.0
- prettier@^3.1.1
- jest@^29.7.0
- @types/jest@^29.5.11
- ts-jest@^29.1.1
- @jest/globals@^29.7.0
```

### Task 2: Configure TypeScript
```
Create a tsconfig.json file with the following configuration:
- target: ES2022
- module: NodeNext
- moduleResolution: NodeNext
- strict: true
- esModuleInterop: true
- skipLibCheck: true
- forceConsistentCasingInFileNames: true
- outDir: ./dist
- rootDir: ./src
- resolveJsonModule: true
- declaration: true
- sourceMap: true
- Include: ["src/**/*"]
- Exclude: ["node_modules", "dist", "tests"]
- Enable path aliases: "@/*" maps to "./src/*"

Ensure the configuration supports:
- Strict null checks
- No implicit any
- No unused locals
- No unused parameters
```

### Task 3: Configure ESLint
```
Create .eslintrc.js with TypeScript ESLint configuration:
- Extend @typescript-eslint/recommended
- Parser: @typescript-eslint/parser
- ParserOptions: ecmaVersion 2022, sourceType module, project ./tsconfig.json
- Rules:
  - @typescript-eslint/no-explicit-any: warn
  - @typescript-eslint/explicit-function-return-type: off
  - @typescript-eslint/no-unused-vars: error
  - @typescript-eslint/no-non-null-assertion: warn
  - semi: [error, always]
  - quotes: [error, single]
  - indent: [error, 2]
- Ignore patterns: dist, node_modules, coverage

Create .eslintignore file to exclude:
- dist/
- node_modules/
- coverage/
- *.config.js
```

### Task 4: Configure Prettier
```
Create .prettierrc file with the following settings:
- semi: true
- trailingComma: all
- singleQuote: true
- printWidth: 100
- tabWidth: 2
- arrowParens: always
- endOfLine: lf

Create .prettierignore file to exclude:
- dist/
- node_modules/
- coverage/
- package-lock.json
- *.md
```

### Task 5: Configure Jest
```
Create jest.config.js for TypeScript testing:
- preset: ts-jest
- testEnvironment: node
- roots: ['<rootDir>/tests']
- testMatch: ['**/*.test.ts', '**/*.spec.ts']
- collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/types/**']
- coverageDirectory: coverage
- coverageThreshold: { global: { branches: 70, functions: 70, lines: 70, statements: 70 } }
- moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }
- transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] }
```

### Task 6: Create Package Scripts
```
Add the following scripts to package.json:
- "dev": "tsx watch src/server.ts"
- "build": "tsc"
- "start": "node dist/server.js"
- "test": "jest"
- "test:watch": "jest --watch"
- "test:coverage": "jest --coverage"
- "lint": "eslint src/**/*.ts tests/**/*.ts"
- "lint:fix": "eslint src/**/*.ts tests/**/*.ts --fix"
- "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\""
- "format:check": "prettier --check \"src/**/*.ts\" \"tests/**/*.ts\""
- "type-check": "tsc --noEmit"
- "validate": "npm run lint && npm run format:check && npm run type-check && npm run test"
```

### Task 7: Create Project Directory Structure
```
Create the following directory structure in the src/ folder:
src/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── services/         # Business logic
├── repositories/     # Data access layer
├── models/           # Data models and DTOs
├── schemas/          # Validation schemas
├── routes/           # Route definitions
├── middleware/       # Custom middleware
├── utils/            # Utility functions
└── types/            # TypeScript type definitions

Create the following directory structure for tests:
tests/
├── unit/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── integration/
│   └── routes/
└── fixtures/         # Mock data and test fixtures
```

### Task 8: Create Environment Configuration
```
Create a .env.example file with the following variables:
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# OpenAI Sora Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_SORA_BASE_URL=https://api.openai.com/v1/sora
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3

# API Security
API_KEY=your-api-key-here
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Logging
LOG_LEVEL=info
LOG_PRETTY=true

Add instructions at the top of .env.example:
# Copy this file to .env and update with your actual values
# Never commit .env to version control

Create a .env file by copying .env.example (this will be gitignored).
```

### Task 9: Create Git Configuration
```
Create a .gitignore file with the following entries:
# Dependencies
node_modules/
package-lock.json

# Build output
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# Testing
coverage/
.nyc_output/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Temporary files
tmp/
temp/

Initialize git repository if not already initialized:
git init
```

### Task 10: Create Basic Server Files
```
Create src/server.ts as the application entry point:
/**
 * Server entry point
 * Starts the Fastify server
 */
import { config } from 'dotenv';
import { buildApp } from './app.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Start the server
 */
async function start() {
  try {
    const app = await buildApp();

    await app.listen({ port: PORT, host: HOST });

    logger.info(`Server running at http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

start();

Create src/app.ts for Fastify app configuration:
/**
 * Fastify application setup
 * Configures plugins, routes, and middleware
 */
import Fastify, { FastifyInstance } from 'fastify';
import { logger } from './utils/logger.js';

/**
 * Build and configure the Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger,
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
  });

  // Health check route (temporary)
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
```

### Task 11: Create Basic Logger Utility
```
Create src/utils/logger.ts with basic Pino logger configuration:
/**
 * Logger utility using Pino
 * Provides structured logging throughout the application
 */
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || 'info';
const prettyPrint = process.env.LOG_PRETTY === 'true';

/**
 * Application logger instance
 */
export const logger = pino({
  level: logLevel,
  transport: isDevelopment && prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
```

### Task 12: Create Project README
```
Create a comprehensive README.md in the project root with the following sections:
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
\`\`\`bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your OpenAI API key
\`\`\`

## Configuration
Edit the \`.env\` file with your configuration:
- \`OPENAI_API_KEY\`: Your OpenAI API key
- \`PORT\`: Server port (default: 3000)
- \`API_KEY\`: Your API authentication key

## Development
\`\`\`bash
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
\`\`\`

## Production
\`\`\`bash
# Build the project
npm run build

# Start production server
npm start
\`\`\`

## Project Structure
\`\`\`
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
\`\`\`

## Architecture
This API follows a layered architecture pattern:
- **Presentation Layer**: Controllers and routes
- **Business Logic Layer**: Services
- **Data Access Layer**: Repositories
- **Infrastructure Layer**: Configuration, logging, error handling

## API Documentation
Once the server is running, visit:
- Swagger UI: http://localhost:3000/docs (coming in US-004)
- Health Check: http://localhost:3000/health

## Testing
\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
\`\`\`

## Code Quality
\`\`\`bash
# Run all quality checks
npm run validate

# This runs: lint, format:check, type-check, and test
\`\`\`

## Contributing
1. Follow the existing code style
2. Write tests for new features
3. Ensure all tests pass
4. Run \`npm run validate\` before committing

## License
MIT

## Support
For issues and questions, please open an issue in the repository.
```

---

## Definition of Done Checklist

### Code Quality
- [ ] All code passes ESLint with zero errors
- [ ] All code passes Prettier formatting checks
- [ ] TypeScript compiles with zero errors (npm run type-check)
- [ ] No console.log statements (use logger instead)

### Testing
- [ ] Unit tests created for logger utility
- [ ] Tests verify server starts successfully
- [ ] Tests verify health endpoint returns 200
- [ ] All tests passing (npm test)
- [ ] Test coverage meets 70% threshold

### Documentation
- [ ] All functions have JSDoc comments
- [ ] README.md created with setup instructions
- [ ] .env.example contains all required variables
- [ ] Inline comments for complex logic

### Functionality
- [ ] npm install completes successfully
- [ ] npm run dev starts server without errors
- [ ] Server responds to GET /health
- [ ] npm run build creates dist/ folder
- [ ] npm start runs production build
- [ ] All npm scripts work as expected

### Repository
- [ ] Git repository initialized
- [ ] .gitignore properly excludes files
- [ ] Initial commit made
- [ ] No sensitive data in repository

### Code Review
- [ ] Code follows TypeScript best practices
- [ ] Proper error handling in place
- [ ] Environment variables loaded correctly
- [ ] Logger configured and working

---

## Verification Steps

1. **Install and Build**
   ```bash
   npm install
   npm run build
   ```
   Expected: No errors, dist/ folder created

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   Expected: Server starts on port 3000

3. **Test Health Endpoint**
   ```bash
   curl http://localhost:3000/health
   ```
   Expected: `{"status":"ok","timestamp":"..."}`

4. **Run Tests**
   ```bash
   npm test
   ```
   Expected: All tests pass

5. **Run Quality Checks**
   ```bash
   npm run validate
   ```
   Expected: All checks pass

6. **Verify Environment**
   ```bash
   npm run type-check
   npm run lint
   npm run format:check
   ```
   Expected: Zero errors

---

## Notes for Developers
- This is the foundation story - all other stories depend on this
- Ensure all tools are properly configured before moving forward
- The server.ts and app.ts are minimal - they will be enhanced in later stories
- Focus on getting the tooling right - it will save time later
- Test that hot reload works in development mode

## Related Documentation
- `/docs/US-001-setup-guide.md` (to be created in DoD)
