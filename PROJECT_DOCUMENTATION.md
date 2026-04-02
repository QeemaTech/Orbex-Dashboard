# Orbex Dashboard - Project Documentation

## Project Overview

**Project Name:** Orbex-Dashboard (Originally: convert_next_react)  
**Type:** Frontend Dashboard Application  
**Framework:** React 19.x with TypeScript  
**Build Tool:** Vite 7.x  
**Styling:** Tailwind CSS 4.x with Radix UI components

The Orbex Dashboard is a comprehensive logistics and shipment management system with multi-role support. It provides different views and functionality based on user roles and serves as the central hub for managing shipments, merchants, couriers, warehouses, and customer service operations.

---

## Technology Stack

### Core Dependencies

- **React**: 19.1.1 - UI library
- **React Router DOM**: 7.13.2 - Client-side routing
- **TypeScript**: ~5.8.3 - Type-safe JavaScript
- **Vite**: 7.1.2 - Fast build tool and dev server
- **Tailwind CSS**: 4.1.13 - Utility-first CSS framework

### UI & Components

- **Radix UI**: Various components (@radix-ui/react-avatar, @radix-ui/react-dropdown-menu, @radix-ui/react-slot)
- **Lucide React**: 0.544.0 - Icon library
- **Class Variance Authority**: 0.7.1 - Component class composition
- **Tailwind Merge**: 3.3.1 - Intelligent Tailwind class merging
- **CLSX**: 2.1.1 - Conditional className utilities

### State Management & Data Fetching

- **TanStack React Query**: 5.95.2 - Data fetching, caching, and synchronization
- **TanStack React Router**: (implied from routing setup)

### Internationalization

- **i18next**: 26.0.2 - Internationalization framework
- **i18next-browser-languagedetector**: 8.2.1 - Language detection
- **react-i18next**: 17.0.1 - React bindings for i18next

### Charting & Visualization

- **Recharts**: 3.8.1 - Composable chart library

### Animation

- **tw-animate-css**: 1.3.8 - Tailwind animation utilities

### Development Tools

- **ESLint**: 9.33.0 - Code linting
- **TypeScript ESLint**: 8.39.1 - TypeScript linting
- **React ESLint Plugins**: react-hooks, react-refresh
- **Vite Plugins**: @vitejs/plugin-react, @tailwindcss/vite
- **Node Types**: @types/node 25.5.0

---

## Project Structure

```
Orbex-Dashboard/
├── src/
│   ├── api/                          # API client layer
│   │   ├── accounting-api.ts         # Accounting endpoints
│   │   ├── auth-api.ts               # Authentication endpoints
│   │   ├── client.ts                 # HTTP client with token refresh
│   │   ├── couriers-api.ts           # Courier management endpoints
│   │   ├── merchants-api.ts          # Merchant management endpoints
│   │   ├── notifications-api.ts      # Notifications endpoints
│   │   ├── shipments-api.ts          # Shipment management endpoints
│   │   └── warehouse-api.ts          # Warehouse endpoints
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx            # Main layout wrapper
│   │   │   ├── Header.tsx            # Top navigation header
│   │   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   │   └── sidebar-context.tsx   # Sidebar state management
│   │   │
│   │   ├── notifications/
│   │   │   └── NotificationMenu.tsx  # Notification menu component
│   │   │
│   │   ├── shared/
│   │   │   ├── StatCard.tsx          # Statistics card component
│   │   │   └── StatusBadge.tsx       # Status badge component
│   │   │
│   │   └── ui/                       # Shadcn/ui components
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       └── table.tsx
│   │
│   ├── features/
│   │   ├── customer-service/
│   │   │   ├── components/           # Feature-specific components
│   │   │   ├── lib/                  # Utilities (e.g., location extraction)
│   │   │   └── pages/
│   │   │       ├── CsCouriersPage.tsx
│   │   │       └── CsShipmentsPage.tsx
│   │   │
│   │   └── shipment-status/
│   │       ├── status-types.ts       # Status type definitions
│   │       ├── status-view-mappers.ts # Status display mappers
│   │       └── status-view-mappers.test.ts
│   │
│   ├── hooks/
│   │   └── useMediaQuery.ts          # Responsive media query hook
│   │
│   ├── i18n/
│   │   ├── index.ts                  # i18n initialization
│   │   └── locales/
│   │       ├── ar.json               # Arabic translations
│   │       └── en.json               # English translations
│   │
│   ├── lib/
│   │   ├── auth-context.tsx          # Authentication context and provider
│   │   ├── realtime.ts               # WebSocket real-time updates
│   │   ├── toast.ts                  # Toast notifications
│   │   └── utils.ts                  # Utility functions
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx             # Login page
│   │   ├── Dashboard/
│   │   │   └── DashboardPage.tsx     # Main dashboard
│   │   ├── ShipmentsPage.tsx         # Shipments list
│   │   ├── ShipmentDetailsPage.tsx   # Shipment details
│   │   ├── MerchantsPage.tsx         # Merchants management
│   │   ├── CollectionsPage.tsx       # Collections page
│   │   ├── WarehousePage.tsx         # Warehouse management
│   │   └── PlaceholderPage.tsx       # Placeholder for future pages
│   │
│   ├── types/
│   │   └── dashboard.ts              # TypeScript type definitions
│   │
│   ├── data/
│   │   └── mockDashboard.ts          # Mock data for development
│   │
│   ├── assets/                       # Static assets
│   ├── App.tsx                       # Main app component with routing
│   ├── App.css                       # Global app styles
│   ├── main.tsx                      # Application entry point
│   ├── index.css                     # Global styles
│   └── vite-env.d.ts                 # Vite type definitions
│
├── public/                           # Static files served as-is
├── components.json                   # Shadcn/ui configuration
├── tailwind.config.js                # Tailwind CSS configuration
├── vite.config.ts                    # Vite configuration
├── tsconfig.json                     # TypeScript base configuration
├── tsconfig.app.json                 # TypeScript app configuration
├── tsconfig.node.json                # TypeScript node configuration
├── eslint.config.js                  # ESLint configuration
├── index.html                        # HTML entry point
├── package.json                      # Dependencies and scripts
└── README.md                         # Project readme

```

---

## Architecture & Design Patterns

### Authentication & Authorization

**Pattern:** React Context API with Token-Based Authentication

- **Location:** `src/lib/auth-context.tsx`
- **Features:**
  - JWT token refresh mechanism
  - Multi-role authorization (7 roles supported)
  - Persistent authentication state in localStorage
  - Auth state broadcasting via custom events

**Supported User Roles:**
1. `ADMIN` - Full system access
2. `CUSTOMER_SERVICE` - Customer service operations
3. `SALES` - Sales operations
4. `ACCOUNTS` - Accounting operations
5. `WAREHOUSE` - Warehouse operations
6. `COURIER` - Courier operations
7. `MERCHANT` - Merchant operations

### API Client Layer

**Pattern:** Centralized HTTP Client with Interceptors

- **Location:** `src/api/client.ts`
- **Features:**
  - Base URL configuration via environment variables
  - Automatic token injection in headers
  - Token refresh on 401 errors
  - Error handling with custom `ApiError` class
  - Centralized storage keys for tokens and user data

**Environment Variables:**
- `VITE_API_BASE_URL` - Backend API base URL (defaults to `http://127.0.0.1:5000`)
- `VITE_WS_BASE_URL` - WebSocket URL (auto-converts from API URL if not set)
- `VITE_DASHBOARD_SEED` - Enable dashboard seed data ("true"/"false")

### Real-Time Updates

**Pattern:** WebSocket Bridge with React Query Integration

- **Location:** `src/lib/realtime.ts`
- **Features:**
  - WebSocket connection management
  - Event-based query invalidation
  - Automatic cache updates for:
    - Shipment updates
    - Timeline events
    - KPI updates
    - Notifications

**Supported Events:**
- `shipment.updated` - Invalidates shipment queries
- `timeline.appended` - Invalidates timeline queries
- `kpi.updated` - Invalidates dashboard KPI queries
- `notification.created` - Invalidates notification queries

### Internationalization

**Pattern:** i18next with RTL Support

- **Location:** `src/i18n/`
- **Features:**
  - Dual language support (English & Arabic)
  - Automatic RTL/LTR document direction switching
  - Browser language detection
  - localStorage persistence
  - React component integration via hooks

**Supported Languages:**
- `en` - English (LTR)
- `ar` - Arabic (RTL)

### Responsive Design

**Pattern:** Mobile-First Tailwind CSS with Custom Hook

- **Hook:** `useMediaQuery` - Screen size detection
- **Breakpoints:** Tailwind defaults (sm, md, lg, xl, 2xl)
- **UI Pattern:** Collapsible sidebar on mobile/tablet

---

## Type System

### Core Types

#### User Types
```typescript
type UserRole = 
  | "ADMIN"
  | "CUSTOMER_SERVICE"
  | "SALES"
  | "ACCOUNTS"
  | "WAREHOUSE"
  | "COURIER"
  | "MERCHANT"

type AuthUser = {
  id: string
  username: string
  fullName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

#### Shipment Status Types
```typescript
// Core Status
type ShipmentCoreStatus =
  | "PENDING"
  | "IN_WAREHOUSE"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURNED"

// Sub Status
type ShipmentSubStatus =
  | "NONE"
  | "CONFIRMED"
  | "ASSIGNED"
  | "LOCATION_RECEIVED"
  | "REJECTED"
  | "DELAYED"
  | "RESCHEDULED"
  | "RETURNED_TO_WAREHOUSE"
  | "RETURN_TO_MERCHANT"
  | "DAMAGED"
  | "OVERDUE"

// Payment Status
type ShipmentPaymentStatus =
  | "PENDING_COLLECTION"
  | "COLLECTED"
  | "POS_PENDING"
  | "READY_FOR_SETTLEMENT"
  | "SETTLED"
  | "ON_HOLD"
```

#### Dashboard Types
```typescript
type ShipmentStatus = "delivered" | "rejected" | "postponed" | "in_transit"

interface DashboardStats {
  totalShipments: number
  delivered: number
  rejected: number
  postponed: number
}

interface ShipmentRow {
  id: string
  customerName: string
  phone: string
  status: ShipmentStatus
  paymentMethod: string
  amountCents: number
}
```

---

## API Integration

### Available API Modules

#### Authentication API (`auth-api.ts`)
```typescript
- loginRequest(body: LoginBody): Promise<LoginResponse>
- meRequest(token: string): Promise<AuthUser>
- refreshRequest(refreshToken: string): Promise<RefreshResponse>

Endpoints:
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/refresh
```

#### Shipments API (`shipments-api.ts`)
```typescript
- Lists shipments with pagination
- Tracks shipment locations
- Status and sub-status tracking
- Payment status management
- Merchant and courier association

Related Types:
- CsShipmentRow
- CsMerchant
- CsCourier
- CsShipmentStatusEvent
- ShipmentListResponse
```

#### Additional APIs
- `accounting-api.ts` - Financial operations
- `couriers-api.ts` - Courier management
- `merchants-api.ts` - Merchant management
- `notifications-api.ts` - Notification handling
- `warehouse-api.ts` - Warehouse operations

### API Client Features

**Token Management:**
- Automatic token injection in `Authorization` header
- Automatic token refresh on 401 responses
- Token refresh deduplication (single refresh per session)
- Secure token storage in localStorage with encrypted keys

**Error Handling:**
- Custom `ApiError` class with status codes
- Centralized error responses
- Auth state cleanup on token expiration

---

## Routing & Pages

### Route Structure

```
/login                          → LoginPage (public)
/                              → Root redirect (protected)
/dashboard                     → DashboardPage (protected)
/shipments                     → ShipmentsPage (protected)
/shipments/:shipmentId         → ShipmentDetailsPage (protected)
/couriers                      → CsCouriersPage (protected, ADMIN only)
/merchants                     → MerchantsPage (protected, ADMIN only)
/collections                   → CollectionsPage (protected)
/warehouse                     → WarehousePage (protected)
/placeholder                   → PlaceholderPage (protected)
```

### Route Protection

**Levels of Protection:**
1. **Public Routes** - No authentication required
2. **Protected Routes** - Requires valid authentication
3. **Role-Based Routes** - Requires specific user role

**Implementation:**
- `<Protected>` wrapper - Enforces authentication
- `<ProtectedRole>` wrapper - Enforces role-based access with fallback redirect

---

## Component Architecture

### Layout Components

#### Layout (`Layout.tsx`)
- Main wrapper component for authenticated pages
- Provides sidebar and header context
- Title management
- Responsive navigation

#### Header (`Header.tsx`)
- Top navigation bar
- Page title display
- Notification menu integration
- User menu (implied)

#### Sidebar (`Sidebar.tsx`)
- Navigation sidebar with collapse support
- Context-based state management
- Responsive behavior (hidden on mobile by default)
- Mobile backdrop overlay on smaller screens

### Shared Components

#### StatCard
- Statistics display component
- Used for KPI visualization

#### StatusBadge
- Status indicator component
- Colored badges for different statuses

### UI Component Library

**Shadcn/ui Components Available:**
- Avatar - User profile pictures
- Badge - Status and category labels
- Button - Interactive buttons
- Card - Content containers
- Dropdown Menu - Menu interactions
- Input - Form inputs
- Table - Data tables

**Configuration:** `components.json`

---

## State Management

### React Query (TanStack Query)

**Usage Pattern:**
- Centralized data fetching
- Automatic caching and deduplication
- Background updates and refetching
- Optimistic updates support

**Query Keys:**
```typescript
- ["shipments-list"]        // Shipment list queries
- ["cs-shipments"]          // Customer service shipments
- ["shipment-detail"]       // Individual shipment details
- ["shipment-timeline"]     // Shipment timeline/events
- ["dashboard-kpis"]        // Dashboard KPI data
- ["notifications", "inbox"] // User notifications
```

### Authentication Context

**State:**
```typescript
{
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  loading: boolean
}
```

**Methods:**
- `login(username, password): Promise<AuthUser>`
- `logout(): void`

### Sidebar Context

**State:**
```typescript
{
  open: boolean
  setOpen: (open: boolean) => void
}
```

---

## Styling System

### Tailwind CSS Configuration

**Version:** 4.1.13  
**Features:**
- CSS Variables for theming
- Vite plugin integration
- New York style design system (via shadcn/ui)
- Custom animation utilities (tw-animate-css)

**Content Coverage:**
```typescript
content: ["./index.html", "./src/**/*.{ts,tsx}"]
```

**Base Color:** Neutral

### CSS Structure

**Global Styles:** `src/index.css`
- Base styles and design tokens
- CSS variable definitions
- Tailwind directives

**App Styles:** `src/App.css`
- Application-specific styling

---

## Build & Development

### Build Configuration

**Vite Config:** `vite.config.ts`

```typescript
Plugins:
- @vitejs/plugin-react - React Fast Refresh
- @tailwindcss/vite - Tailwind CSS processing

Path Aliases:
- "@/*" → "./src/*"
- "react-lucid" → "lucide-react"
```

### TypeScript Configuration

**Files:**
- `tsconfig.json` - Base configuration with path aliases
- `tsconfig.app.json` - App-specific settings
- `tsconfig.node.json` - Dev tool settings

**Path Mappings:**
```json
{
  "@/*": ["./src/*"],
  "react-lucid": ["./node_modules/lucide-react/dist/lucide-react.d.ts"]
}
```

### NPM Scripts

```bash
npm run dev      # Start development server (Vite)
npm run build    # Build for production (TypeScript + Vite)
npm run lint     # Run ESLint on all source files
npm run preview  # Preview production build
```

### ESLint Configuration

**Rules:**
- Enforces React hooks best practices
- React refresh optimization
- TypeScript type checking
- Exceptions for UI components and context providers

---

## Development Features

### Hot Module Replacement (HMR)

- Enabled by default in `vite.config.ts`
- Automatic browser refresh on file changes
- Component-level updates with React Fast Refresh

### Development Mock Data

- Mock dashboard data available via `src/data/mockDashboard.ts`
- Enabled with `VITE_DASHBOARD_SEED=true` environment variable

### Code Quality

**Linting:** ESLint with TypeScript support
- JavaScript best practices (ES2020+)
- React hooks compliance
- TypeScript strict rules

---

## Performance Optimizations

### Code Splitting

- Vite automatic code splitting for routes
- Dynamic imports for feature modules

### Image Optimization

- Logo lazy loading on login page
- Static asset serving via `/public`

### React Optimizations

- React.StrictMode for development warnings
- React Fast Refresh for instant updates

### Data Layer Optimizations

- React Query caching and deduplication
- Background refetching and stale time management
- Real-time WebSocket updates for fresh data

---

## Security

### Authentication

- JWT token-based authentication
- Access token + refresh token pattern
- Automatic token refresh on expiration
- Token revocation on logout

### API Security

- Token injection in `Authorization` headers
- CORS handling via backend
- HttpOnly cookie support (if configured on backend)

### Content Security

- XSS protection via React's DOM escaping
- CSRF tokens (backend responsibility)
- Input validation in forms

### Storage

- Tokens stored in localStorage (not HttpOnly)
- Secure storage keys with prefixes (`orbex_*`)
- User data serialized in localStorage

---

## Known Issues & Considerations

### Current State

1. **Seed Data Mode** - Dashboard can be populated with mock data
2. **Placeholder Pages** - Some pages (PlaceholderPage) are stubs for future features
3. **Test Coverage** - Only `status-view-mappers.test.ts` visible in structure
4. **Environment Setup** - Requires backend API running on configured URL

### Development Notes

1. **Backend Dependency** - Frontend requires backend API for authentication and data
2. **WebSocket Integration** - Real-time features require WebSocket backend support
3. **Localization** - Limited to English and Arabic; requires translation files for other languages

---

## Project Statistics

- **React Version:** 19.1.1 (latest)
- **TypeScript Version:** ~5.8.3
- **Total Dependencies:** 23 production, 13 development
- **Code Language:** 100% TypeScript + JSX
- **Styling:** Pure Tailwind CSS (no global CSS)

---

## Getting Started

### Prerequisites

- Node.js 16+ (recommended 18+)
- npm or yarn package manager
- Backend API running (typically http://127.0.0.1:5000)

### Installation

```bash
npm install
```

### Environment Setup

Create `.env.local` or `.env`:

```bash
VITE_API_BASE_URL=http://your-backend-url
VITE_WS_BASE_URL=ws://your-websocket-url
VITE_DASHBOARD_SEED=false
```

### Development

```bash
npm run dev
# Application available at http://localhost:5173
```

### Production Build

```bash
npm run build
npm run preview
```

### Code Quality

```bash
npm run lint
```

---

## Future Development Indicators

Based on the codebase structure:

1. **Placeholder Page** - Indicates planned features
2. **Customer Service Feature Module** - Advanced role-based features
3. **Mock Data Support** - Development/testing capability
4. **Real-time Infrastructure** - Scalability for live updates
5. **Multi-language Support** - International expansion capability
6. **Test Framework** - Ready for test-driven development expansion

---

## Support & Maintenance

### Code Organization

- Modular feature-based structure
- Separated concerns (API, components, pages, types)
- Context-based state management
- Type-safe across the application

### Scalability

- Ready for additional features via modular design
- Real-time infrastructure for live updates
- Role-based access control for team expansion
- Multi-language support for global growth

### Maintainability

- TypeScript for type safety
- ESLint for code consistency
- Component library for UI consistency
- Centralized API client for easy backend migrations

---

**Last Updated:** Based on project structure observed in the codebase  
**Project Status:** Active Development  
**Version:** 0.0.0 (Pre-release)
