# Federal Contract Notifier

A comprehensive system for tracking and notifying about federal government contract opportunities. The application provides a modern web interface for browsing, filtering, sorting, and searching contract opportunities, sales representatives, and technology categories.

## 🚀 Features

- **Opportunity Management**: Browse, search, and filter federal contract opportunities
- **Sales Representative Management**: Track sales reps and their technology interests
- **Technology Categories**: Organize opportunities by technology categories
- **Advanced Filtering**: Filter by agency, budget range, status, and technology categories
- **Real-time Search**: Search across titles, descriptions, and agencies
- **Responsive UI**: Modern Material-UI interface that works on all devices
- **Docker Support**: Easy containerized deployment
- **Automated Data Collection**: Collects contract opportunities from SAM.gov and FBO.gov
- **Email Notifications**: Automated email notifications for new opportunities

## 🏗️ Architecture

- **Backend**: Node.js with TypeScript, Express.js, Prisma ORM
- **Frontend**: React with TypeScript, Material-UI
- **Database**: PostgreSQL
- **Data Collection**: Puppeteer for web scraping, CSV parsing
- **Job Queue**: Bull for background processing
- **Logging**: Pino for structured logging

## 📋 Prerequisites

- Docker and Docker Compose V2
- Node.js 20+ (for local development)
- PostgreSQL 15+ (for local development)

## 🚀 Quick Start with Docker

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/federal-contract-notifier.git
cd federal-contract-notifier
```

### 2. Configure Environment
```bash
# Copy the example configuration
cp config.example config

# Edit the configuration file with your settings
nano config
```

### 3. Start the Application
```bash
# Start with production frontend
docker compose --profile prod up -d

# Or start with development frontend (hot reloading)
docker compose --profile dev up -d
```

### 4. Initialize the Database
```bash
# Run database migrations
docker compose exec backend npx prisma migrate deploy

# Generate Prisma client
docker compose exec backend npx prisma generate
```

### 5. Access the Application
- **Frontend**: http://localhost:38889
- **Backend API**: http://localhost:38888
- **Database**: localhost:5432 (postgres/postgres)

## 💻 Development Setup (Without Docker)

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb federal_contracts

# Set environment variables
export DATABASE_URL="postgresql://username:password@localhost:5432/federal_contracts"
```

### 2. Backend Setup
```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start the backend server
PORT=38888 npm run dev
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set API URL for frontend
export REACT_APP_API_URL=http://localhost:38888/api

# Start the development server
npm start
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:38888

## 🔧 Configuration

### Environment Variables

Create a `config` file based on `config.example`:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/federal_contracts"

# Server Configuration
PORT=38888
NODE_ENV=development

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SAM.gov API Configuration
SAM_GOV_API_KEY=your-sam-gov-api-key

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Frontend Configuration
REACT_APP_API_URL=http://localhost:38888/api
```

## 📚 API Documentation

### Opportunities
- `GET /api/opportunities` - List opportunities with filtering and pagination
- `GET /api/opportunities/:id` - Get opportunity details

### Sales Representatives
- `GET /api/sales-reps` - List sales representatives with filtering

### Technology Categories
- `GET /api/technology-categories` - List technology categories

### Statistics
- `GET /api/stats` - Get system statistics

## 🗄️ Database Schema

### Opportunities
- Contract opportunity details
- Budget information
- Agency and status
- Technology categories
- Point of contact information

### Sales Representatives
- Contact information
- Regional coverage
- Budget preferences
- Technology interests

### Technology Categories
- Technology names and descriptions
- Keywords for matching
- Relationship counts

## 🐳 Docker Commands

### Development
```bash
# Start development environment
docker compose --profile dev up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Production
```bash
# Start production environment
docker compose --profile prod up -d

# Rebuild images
docker compose --profile prod build

# Stop and remove volumes
docker compose --profile prod down -v
```

### Database Operations
```bash
# Run migrations
docker compose exec backend npx prisma migrate deploy

# Generate client
docker compose exec backend npx prisma generate

# Open database shell
docker compose exec postgres psql -U postgres -d federal_contracts
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL environment variable
   - Verify database exists

2. **Frontend Can't Connect to Backend**
   - Check REACT_APP_API_URL environment variable
   - Ensure backend is running on correct port
   - Check CORS configuration

3. **Docker Build Issues**
   - Clear Docker cache: `docker system prune -a`
   - Rebuild without cache: `docker compose build --no-cache`

4. **Data Collection Issues**
   - Check SAM.gov API key configuration
   - Verify network connectivity
   - Check logs for specific error messages

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

If you encounter any issues or have questions, please:

1. Check the [troubleshooting section](#troubleshooting)
2. Search existing [issues](https://github.com/yourusername/federal-contract-notifier/issues)
3. Create a new issue with detailed information

## 🔐 Security

- Never commit sensitive configuration files
- Use environment variables for API keys and passwords
- Keep dependencies updated
- Follow security best practices for database access

## 📊 Project Status

- ✅ Core functionality implemented
- ✅ Docker containerization
- ✅ Database schema and migrations
- ✅ API endpoints
- ✅ Frontend interface
- ✅ Data collection from SAM.gov
- 🔄 Email notification system (in progress)
- 🔄 Advanced filtering (in progress) 