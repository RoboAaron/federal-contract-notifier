# Contributing to Federal Contract Notifier

Thank you for your interest in contributing to the Federal Contract Notifier project! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Git
- Docker (optional, for containerized development)

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/federal-contract-notifier.git
   cd federal-contract-notifier
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. **Set up the database**
   ```bash
   createdb federal_contracts_dev
   export DATABASE_URL="postgresql://username:password@localhost:5432/federal_contracts_dev"
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Configure environment**
   ```bash
   cp config.example config
   # Edit config file with your settings
   ```

5. **Start development servers**
   ```bash
   # Backend
   npm run dev
   
   # Frontend (in another terminal)
   cd frontend && npm start
   ```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for good test coverage
- Use descriptive test names

### Git Workflow

1. Create a feature branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

3. Push your branch and create a pull request
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

Use conventional commit format:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

Example: `feat: add email notification system`

## Pull Request Process

1. **Update documentation** - If you're adding new features, update the README.md
2. **Add tests** - Include tests for new functionality
3. **Ensure CI passes** - All GitHub Actions checks must pass
4. **Update CHANGELOG** - Document your changes
5. **Request review** - Ask for code review from maintainers

## Project Structure

```
federal-contract-notifier/
├── src/                    # Backend source code
│   ├── collectors/         # Data collection modules
│   ├── config/            # Configuration files
│   ├── entities/          # Database entities
│   ├── notifications/     # Notification services
│   ├── repositories/      # Data access layer
│   ├── server/           # Express server setup
│   └── utils/            # Utility functions
├── frontend/              # React frontend
├── prisma/               # Database schema and migrations
├── docs/                 # Documentation
└── scripts/              # Utility scripts
```

## Database Changes

When making database schema changes:

1. Create a new migration
   ```bash
   npx prisma migrate dev --name description-of-changes
   ```

2. Update the Prisma schema if needed
3. Test the migration on a clean database
4. Include migration files in your PR

## API Development

- Follow RESTful conventions
- Use proper HTTP status codes
- Include error handling
- Add input validation
- Document new endpoints

## Frontend Development

- Use TypeScript for all components
- Follow Material-UI design patterns
- Implement responsive design
- Add proper error boundaries
- Use React hooks appropriately

## Reporting Issues

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node.js version, etc.)
- Screenshots if applicable

## Feature Requests

For feature requests:

- Describe the feature clearly
- Explain the use case
- Consider implementation complexity
- Check if it aligns with project goals

## Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow project guidelines

## Getting Help

- Check existing issues and discussions
- Ask questions in GitHub Discussions
- Review documentation in the `docs/` folder
- Contact maintainers for urgent issues

Thank you for contributing to Federal Contract Notifier! 🚀 