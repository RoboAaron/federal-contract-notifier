# Federal Contract Notifier

A system to track and notify about federal government contract opportunities.

## Features

- Daily collection of federal contract opportunities
- Technology categorization
- Agency/department tracking
- Sales representative notification system
- Historical data tracking
- Daily digest emails
- Web server for status and control
- Scheduled notifications

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- SAM.gov API key

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your configuration:
   ```bash
   cp .env.example .env
   ```
4. Create the database:
   ```bash
   createdb federal_contracts
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linter

## Project Structure

```
src/
├── config/         # Configuration files
├── entities/       # Database entities
├── collectors/     # Data collection modules
├── notifications/  # Email notification system
├── server/         # Web server for status and control
├── utils/         # Utility functions
└── index.ts       # Application entry point
```

## Data Sources

- SAM.gov API
- Grants.gov
- Agency-specific websites

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT 