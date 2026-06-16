# AI Enterprise Automation Platform - Frontend

A professional React/Vite SPA frontend for an enterprise-grade AI automation platform with user management, knowledge base, and conversation features.

## Features

- **Authentication**: Secure login/register with token-based auth and auto-refresh
- **Dashboard**: KPI cards, recent activity, and quick statistics
- **Organization Management**: 
  - Users management with search and pagination
  - Departments management
  - Teams management
  - Roles & Permissions
- **Knowledge Platform**:
  - Document upload and management
  - AI-powered search and querying
  - Conversation history
- **Enterprise UI**: Professional design inspired by Linear, Notion, and Stripe
- **Responsive Design**: Mobile-first approach with full mobile support

## Tech Stack

- **Framework**: React 19 with Vite
- **Routing**: React Router v7
- **State Management**: React Context API + React Query
- **Forms**: React Hook Form
- **Styling**: Tailwind CSS v4
- **HTTP Client**: Axios with automatic token refresh
- **UI Components**: Custom components + Lucide icons

## Project Structure

```
src/
├── api/                    # API endpoints modules
│   ├── client.js          # Axios instance with interceptors
│   ├── auth.js            # Auth API calls
│   ├── users.js           # Users API calls
│   ├── departments.js     # Departments API calls
│   ├── teams.js           # Teams API calls
│   ├── roles.js           # Roles & Permissions API calls
│   ├── knowledge.js       # Knowledge platform API calls
│   └── conversations.js   # Conversations API calls
├── components/
│   ├── common/            # Reusable UI components
│   └── layout/            # Layout components (Sidebar, TopNav)
├── context/
│   └── AuthContext.jsx    # Authentication state management
├── pages/
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── organization/      # Organization management pages
│   ├── knowledge/         # Knowledge platform pages
│   └── conversations/     # Conversations pages
├── utils/
│   ├── constants.js       # App constants and routes
│   ├── formatters.js      # Date, number, text formatters
│   └── validators.js      # Form validation rules
├── App.jsx                # Main app with routing
└── main.jsx               # Entry point
```

## Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repo>
   cd project
   pnpm install
   ```

2. **Create environment file**:
   ```bash
   cp .env.local.example .env.local
   ```

3. **Configure API URL** in `.env.local`:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Start dev server**:
   ```bash
   pnpm dev
   ```

   The app will open at `http://localhost:5173`

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Preview production build
- `pnpm lint` - Run ESLint

### Key Features

#### Authentication
- Login with email/password
- User registration
- Password reset flow
- Auto token refresh on 401 errors
- Persistent sessions across tabs

#### API Integration
All API calls go through centralized Axios client (`src/api/client.js`) with:
- Automatic Bearer token injection
- Token refresh on expiration
- Logout all sessions on 401 error
- Single configuration point for API URL

#### State Management
- React Context for authentication state
- React Query for server state caching
- Custom hooks for common patterns

### Adding New Pages

1. Create page component in `src/pages/`
2. Create corresponding API module in `src/api/` if needed
3. Add route in `src/App.jsx`
4. Add navigation link in `src/components/layout/Sidebar.jsx`

Example page structure:
```jsx
import React from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useQuery } from '@tanstack/react-query';
import { someAPI } from '../../api/some';

export default function SomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['some'],
    queryFn: () => someAPI.list(),
  });

  return (
    <MainLayout>
      {/* Page content */}
    </MainLayout>
  );
}
```

## API Integration

The platform expects the backend to provide these endpoints:

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register
- `POST /api/v1/auth/refresh-token` - Refresh token
- `POST /api/v1/auth/logout-all` - Logout all sessions
- `GET /api/v1/auth/me` - Get current user

### Users
- `GET /api/v1/users` - List users
- `GET /api/v1/users/:id` - Get user
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Departments
- `GET /api/v1/departments` - List
- `GET /api/v1/departments/:id` - Get
- `POST /api/v1/departments` - Create
- `PUT /api/v1/departments/:id` - Update
- `DELETE /api/v1/departments/:id` - Delete

### Teams
- Similar structure to departments

### Roles & Permissions
- `GET /api/v1/roles` - List roles
- `POST /api/v1/roles/:id/permissions` - Assign permissions

### Knowledge
- `GET /api/v1/knowledge/documents` - List documents
- `POST /api/v1/knowledge/documents/upload` - Upload document
- `GET /api/v1/knowledge/search` - Search documents
- `POST /api/v1/knowledge/queries` - Create query

### Conversations
- `GET /api/v1/conversations` - List conversations
- `POST /api/v1/conversations/:id/messages` - Send message

## Design System

### Colors
- **Primary**: `#0066ff` (Blue)
- **Accent**: `#00d4ff` (Cyan)
- **Destructive**: `#ff4444` (Red)
- **Background**: `#ffffff` (White)
- **Foreground**: `#0f0f0f` (Black)
- **Muted**: `#e5e5e5` (Light Gray)

### Typography
- **Headings**: Plus Jakarta Sans (500, 600, 700 weights)
- **Body**: Inter (400, 500, 600 weights)

### Spacing
Uses Tailwind's default spacing scale (4px, 8px, 12px, 16px, 24px, etc.)

### Border Radius
- Default: 8px
- Small: 4.8px
- Large: 11.2px

## Production Build

```bash
pnpm build
```

This creates an optimized build in the `dist/` folder ready for deployment.

## Deployment

The app can be deployed to any static hosting:
- Vercel (recommended): `vercel deploy`
- Netlify: Connect GitHub repo
- AWS S3 + CloudFront: `pnpm build && aws s3 sync dist/ s3://bucket/`

## Environment Variables

- `VITE_API_BASE_URL` - Backend API base URL (default: http://localhost:8000)

## Security

- All API calls use HTTPS in production
- Access tokens stored in localStorage (consider using httpOnly cookies for production)
- CSRF protection via API token
- XSS protection via React's built-in escaping
- Input validation on all forms

## Performance

- Code splitting per route (automatic with React Router)
- Lazy loading of components
- React Query caching for API calls
- Optimized Tailwind CSS output
- No unused JavaScript shipped

## License

Proprietary - All rights reserved
