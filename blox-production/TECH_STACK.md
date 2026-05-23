# BLOX Production - Full Tech Stack

## 🏗️ Architecture Overview

**Type**: Monorepo (NPM Workspaces)  
**Structure**: Multi-package workspace with shared codebase  
**Packages**: 
- `@blox/admin` - Admin dashboard application
- `@blox/customer` - Customer-facing application
- `@blox/shared` - Shared utilities, services, components, and models

---

## 🎨 Frontend Stack

### Core Framework
- **React** `^19.2.0` - UI library
- **React DOM** `^19.2.0` - React rendering
- **TypeScript** `~5.9.3` - Type-safe JavaScript

### Build Tools & Bundlers
- **Vite** `^7.2.4` - Build tool and dev server
- **@vitejs/plugin-react** `^5.1.1` - React plugin for Vite
- **ESBuild** - Fast JavaScript bundler (used by Vite)

### UI Framework & Components
- **Material-UI (MUI)** `^7.3.6` - Component library
  - `@mui/material` - Core components
  - `@mui/icons-material` - Icon library
  - `@mui/x-date-pickers` `^8.21.0` - Date picker components
  - `@mui/lab` `^7.0.1-beta.20` - Experimental components (customer only)
- **Emotion** `^11.14.0` - CSS-in-JS (used by MUI)
  - `@emotion/react`
  - `@emotion/styled`

### Styling
- **SASS/SCSS** `^1.95.1` - CSS preprocessor
- **CSS Modules** - Scoped styling

### Routing
- **React Router DOM** `^7.10.1` - Client-side routing

### State Management
- **Redux Toolkit** `^2.11.1` - State management
- **React Redux** `^9.2.0` - React bindings for Redux
- **TanStack React Query** `^5.90.12` - Server state management and caching

### Forms & Validation
- **React Hook Form** `^7.68.0` - Form handling
- **Yup** `^1.7.1` - Schema validation
- **@hookform/resolvers** `^5.2.2` - Form validation resolvers

### HTTP Client
- **Axios** `^1.13.2` - HTTP client for API requests

### Real-time Communication
- **Socket.IO Client** `^4.8.1` - WebSocket client for AI chatbot
- **WebSocket** - Native WebSocket for AI chat connections

### Data Visualization
- **Chart.js** `^4.5.1` - Charting library
- **React Chart.js 2** `^5.3.1` - React wrapper for Chart.js

### PDF Handling
- **React PDF** `^10.2.0` - PDF viewer component
- **jsPDF** `^3.0.4` - PDF generation (admin only)
- **jsPDF AutoTable** `^5.0.2` - Table plugin for jsPDF (admin only)
- **Print.js** `^1.6.0` - Print functionality

### Animation & UI Enhancements
- **Framer Motion** `^12.23.26` - Animation library
- **React Loading Skeleton** `^3.5.0` - Loading placeholders

### Utilities
- **Moment.js** `^2.30.1` - Date/time manipulation
- **libphonenumber-js** `^1.12.31` - Phone number formatting/validation
- **DOMPurify** `^3.3.1` - HTML sanitization
- **React Toastify** `^11.0.5` - Toast notifications
- **Web Vitals** `^5.1.0` - Performance monitoring

---

## 🗄️ Backend & Database

### Backend-as-a-Service
- **Supabase** `^2.87.1` - Backend platform
  - PostgreSQL database
  - Authentication (Supabase Auth)
  - Real-time subscriptions
  - Storage (file uploads)
  - Edge Functions (serverless functions)

### Database
- **PostgreSQL** (via Supabase) - Primary database
- **Row Level Security (RLS)** - Database-level security policies

### External Services
- **SkipCash Payment Gateway** - Payment processing
  - Sandbox: `https://skipcashtest.azurewebsites.net`
  - Production: SkipCash production API
- **BLOX AI Backend** - AI chatbot service
  - WebSocket connections for real-time chat
  - File upload endpoints
  - Document processing

---

## 🧪 Testing

### Testing Framework
- **Vitest** `^4.0.15` - Test runner (Vite-native)
- **@vitest/ui** `^4.0.15` - Test UI interface
- **@vitest/coverage-v8** `^4.0.15` - Code coverage

### Testing Libraries
- **React Testing Library** `^16.3.0` - React component testing
- **@testing-library/jest-dom** `^6.9.1` - DOM matchers
- **@testing-library/user-event** `^14.6.1` - User interaction simulation

### Test Environment
- **jsdom** `^27.3.0` - DOM environment for tests
- **happy-dom** `^20.0.11` - Alternative DOM environment
- **MSW (Mock Service Worker)** `^2.12.4` - API mocking

### Testing Tools
- **@axe-core/react** `^4.11.0` - Accessibility testing
- **jest-axe** `^10.0.0` - Jest integration for axe

---

## 🔧 Development Tools

### Linting & Code Quality
- **ESLint** `^9.39.1` - JavaScript/TypeScript linter
- **TypeScript ESLint** `^8.46.4` - TypeScript-specific linting
- **ESLint React Hooks** `^7.0.1` - React Hooks linting rules
- **ESLint React Refresh** `^0.4.24` - React Fast Refresh support

### Type Definitions
- **@types/node** `^24.10.1` - Node.js type definitions
- **@types/react** `^19.2.5` - React type definitions
- **@types/react-dom** `^19.2.3` - React DOM type definitions
- **@types/react-router-dom** `^5.3.3` - React Router type definitions
- **@types/react-pdf** `^6.2.0` - React PDF type definitions
- **@types/dompurify** `^3.0.5` - DOMPurify type definitions

---

## 📦 Package Management

- **NPM Workspaces** - Monorepo package management
- **NPM** - Package manager

---

## 🚀 Deployment & Monitoring

### Error Tracking
- **Sentry** `^10.30.0` - Error tracking and monitoring
  - `@sentry/react` - React integration
  - `@sentry/vite-plugin` `^4.6.1` - Vite plugin for source maps

### Build Configuration
- **Source Maps** - Enabled for production debugging
- **Code Splitting** - Manual chunks for optimization
- **Minification** - ESBuild minification

---

## 🔐 Security

### Authentication
- **Supabase Auth** - User authentication
  - Email/password
  - Session management
  - Token refresh

### Security Libraries
- **DOMPurify** - XSS prevention
- **Row Level Security (RLS)** - Database-level access control

---

## 📱 Application Structure

### Admin Application (`@blox/admin`)
- Admin dashboard
- Vehicle/product management
- Application management
- Offer management
- Payment management
- Reports and analytics

### Customer Application (`@blox/customer`)
- Customer portal
- Application creation
- Document upload
- Payment processing
- AI chatbot support
- Credit top-up

### Shared Package (`@blox/shared`)
- Shared services (Supabase, AI client, payment services)
- Shared components
- Shared utilities
- Shared models/types
- Shared hooks
- Shared styles

---

## 🌐 API & Integration

### Internal APIs
- **Supabase REST API** - Database operations
- **Supabase Realtime** - Real-time subscriptions
- **Supabase Storage API** - File storage

### External APIs
- **BLOX AI API** - AI chatbot service
  - WebSocket connections
  - File upload endpoints (`/upload`, `/batch/upload`)
  - Chat endpoints
- **SkipCash API** - Payment gateway
  - Payment initiation
  - Payment status checking
  - Callback handling

### API Communication
- **REST** - HTTP RESTful APIs
- **WebSocket** - Real-time communication
- **GraphQL** - Not used (Supabase supports it but not implemented)

---

## 🗂️ File Structure

```
blox-production/
├── packages/
│   ├── admin/          # Admin dashboard app
│   ├── customer/       # Customer portal app
│   └── shared/         # Shared code
├── package.json        # Root package.json
├── tsconfig.json       # TypeScript config
├── vitest.config.ts    # Test configuration
└── vite.config.ts     # Build configuration (if unified)
```

---

## 🔄 Development Workflow

### Scripts
- `npm run dev` - Start admin dev server
- `npm run dev:admin` - Start admin dev server
- `npm run dev:customer` - Start customer dev server
- `npm run build` - Build all packages
- `npm run build:admin` - Build admin package
- `npm run build:customer` - Build customer package
- `npm run lint` - Lint all packages
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_BLOX_AI_URL` - BLOX AI backend URL
- `VITE_API_BASE_URL` - API base URL
- `VITE_FILE_BASE_URL` - File service base URL
- `SENTRY_ORG` - Sentry organization
- `SENTRY_PROJECT` - Sentry project name
- `SENTRY_AUTH_TOKEN` - Sentry authentication token

---

## 📊 Key Features

### Admin Features
- Dashboard with analytics
- Vehicle/product management
- Application review and approval
- Offer creation and management
- Payment tracking
- Report generation (PDF)
- User management

### Customer Features
- Vehicle browsing and selection
- Loan application creation
- Document upload
- Payment processing (SkipCash integration)
- Credit top-up system
- AI chatbot support
- Application tracking
- Payment calendar

### Shared Features
- Authentication (Supabase Auth)
- File upload and storage
- Real-time updates
- Error tracking (Sentry)
- Form validation
- Date/time handling
- Currency formatting
- Phone number formatting

---

## 🎯 Technology Highlights

1. **Modern React** - Using React 19 with latest features
2. **Type Safety** - Full TypeScript implementation
3. **Monorepo** - Shared codebase for efficiency
4. **Real-time** - WebSocket and Supabase Realtime
5. **Serverless** - Supabase Edge Functions
6. **Modern Build** - Vite for fast development and builds
7. **Comprehensive Testing** - Vitest with React Testing Library
8. **Production Ready** - Error tracking, monitoring, and optimization

---

**Last Updated**: January 2025  
**Project**: BLOX Production  
**Version**: 0.0.0 (Development)
