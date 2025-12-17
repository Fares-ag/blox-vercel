# Blox Admin Frontend - React Rebuild

A comprehensive admin dashboard for managing vehicle financing applications, products, offers, promotions, packages, and financial ledgers. Built with React 19+ and TypeScript.

## Technology Stack

- **React 19+** with TypeScript
- **Vite** - Build tool
- **Redux Toolkit** - State management
- **Material-UI (MUI) v5+** - UI framework
- **React Router v6** - Routing
- **Axios** - HTTP client
- **Chart.js** with react-chartjs-2 - Charts
- **React Hook Form** with Yup - Form handling
- **Socket.io-client** - WebSocket support
- **React Toastify** - Notifications
- **Moment.js** - Date handling

## Project Structure

```
src/
├── app/
│   ├── components/          # Reusable components
│   │   ├── core/            # Core UI components (Button, Input, Select, etc.)
│   │   ├── shared/          # Shared components (Table, SidePanel, etc.)
│   │   └── layouts/         # Layout components (MainLayout)
│   ├── features/            # Feature modules
│   │   ├── auth/            # Authentication
│   │   ├── dashboard/       # Dashboard
│   │   ├── applications/    # Application management
│   │   ├── products/        # Product management
│   │   ├── offers/          # Offer management
│   │   ├── promotions/      # Promotion management
│   │   ├── packages/        # Package management
│   │   └── ledgers/         # Financial ledgers
│   ├── services/            # API and business logic
│   ├── store/               # Redux store and slices
│   ├── guards/              # Route guards
│   ├── models/              # TypeScript interfaces
│   ├── utils/               # Utility functions
│   ├── hooks/               # Custom React hooks
│   ├── config/              # Configuration files
│   └── routes/              # Route configuration
├── assets/                  # Static assets
└── styles/                  # Global styles
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env.development` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_FILE_BASE_URL=http://localhost:3000/files
VITE_BYPASS_GUARDS=true
```

## Features

### Authentication
- Login with email/password
- Forgot password flow
- Reset password
- Remember me functionality
- Protected routes with guards

### Dashboard
- Statistics cards (Projected Insurance, Funding, Revenue, Real Revenue)
- Doughnut chart for Paid vs Unpaid Installments
- Blox percentage indicators
- Date range filtering

### Applications
- List all applications with pagination
- View application details
- Create/Edit applications (multi-step form)
- Application status management
- Document upload and preview

### Products
- Product catalog with advanced filtering
- Create/Edit products
- Product status management
- Image and document management

### Offers, Promotions, Packages
- CRUD operations for all entities
- Status management
- Default offer selection

### Ledgers
- Financial transaction listing
- Date filtering
- Export functionality

## Brand Guidelines

### Colors
- Primary: #BCB4FF (Purple accent)
- Secondary: #2E2C34 (Dark gray)
- Primary Button: #00CFA2 (Teal green)
- Background: #F1F2F4

### Typography
- Font Family: IBM Plex Sans
- Headings: 28px, 24px, 16px, 14px
- Body: 14px

## Development Guidelines

### Component Structure
- Use functional components with hooks
- Implement TypeScript interfaces for all props
- Follow React best practices
- Use custom hooks for reusable logic

### State Management
- Redux Toolkit for global state
- Local state for UI-only state
- React Query for server state (future implementation)

### Styling
- SCSS modules for component styles
- CSS variables for theming
- Material-UI theme customization
- Responsive design with breakpoints

## API Integration

The application integrates with a RESTful API. All API calls are handled through the `apiService` in `src/app/services/api.service.ts`.

### Base Configuration
- Base URL: Configured via environment variables
- Authentication: Bearer token in Authorization header
- Error Handling: Automatic token refresh and error handling

## Routing

- `/auth/login` - Login page
- `/auth/forgot-password` - Forgot password
- `/auth/reset-password` - Reset password
- `/main/dashboard` - Dashboard
- `/main/applications` - Applications list
- `/main/applications/view/:id` - Application details
- `/main/products` - Products list
- `/main/offers` - Offers list
- `/main/promotions` - Promotions list
- `/main/packages` - Packages list
- `/main/ledgers` - Ledgers list

## Contributing

1. Follow React best practices
2. Write TypeScript interfaces for all data structures
3. Use functional components with hooks
4. Implement proper error handling
5. Add loading states for async operations
6. Ensure responsive design
7. Follow the brand guidelines

## License

Private - All rights reserved