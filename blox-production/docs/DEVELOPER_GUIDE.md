# Developer Guide

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Supabase account and project

### Installation

```bash
# Install dependencies
npm install

# Start development server (admin)
npm run dev:admin

# Start development server (customer)
npm run dev:customer
```

### Environment Variables

Create `.env` files in each package directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SENTRY_DSN=your_sentry_dsn (optional)
```

## Project Structure

```
blox-react/
├── packages/
│   ├── admin/          # Admin dashboard
│   ├── customer/       # Customer-facing app
│   └── shared/         # Shared code
├── .github/
│   └── workflows/      # CI/CD pipelines
└── docs/               # Documentation
```

## Development Workflow

### Adding a New Feature

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Write tests
4. Run tests: `npm test`
5. Lint code: `npm run lint`
6. Create pull request

### Code Style

- Use TypeScript for all new code
- Follow existing component patterns
- Use functional components with hooks
- Add JSDoc comments for public APIs

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build:admin
npm run build:customer
```

## Common Tasks

### Adding a New Service

1. Create service file in `packages/shared/src/services/`
2. Export from `packages/shared/src/services/index.ts`
3. Add tests in `packages/shared/src/__tests__/services/`

### Adding a New Component

1. Create component in appropriate package
2. Add styles (SCSS modules)
3. Export from component index
4. Add Storybook story (if applicable)

### Database Changes

1. Create migration script in `supabase/migrations/`
2. Test in development
3. Apply to staging
4. Apply to production

## Troubleshooting

### Common Issues

**Build fails**: Clear node_modules and reinstall
```bash
rm -rf node_modules packages/*/node_modules
npm install
```

**Tests fail**: Clear cache
```bash
npm test -- --clearCache
```

**Type errors**: Run type check
```bash
npx tsc --noEmit
```

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [Supabase Documentation](https://supabase.com/docs)
- [Material-UI Documentation](https://mui.com)

