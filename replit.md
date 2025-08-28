# Overview

This is a comprehensive donation management system for Jews for Jesus, built as a full-stack web application. The system integrates with MyWell payment processor API for real transaction data, uses Supabase cloud database for customer storage, and includes Resend API for email notifications. It provides a modern React dashboard for managing donors, tracking transactions, processing donations, and configuring automated data synchronization.

The application serves as an internal tool for staff members to view donation analytics, manage customer records, process transactions, handle refunds, and monitor API integrations. It features configurable sync functionality that periodically fetches data from the MyWell API rather than real-time interaction, ensuring reliable data management and reduced API load.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Handling**: React Hook Form with Zod for validation and type safety
- **Styling**: Tailwind CSS with custom CSS variables for theming, including Jews for Jesus brand colors

## Backend Architecture
- **Runtime**: Vercel serverless functions with Node.js runtime
- **Language**: TypeScript with ES modules
- **API Pattern**: Individual NextJS-style API routes (/api/*.ts)
- **Production**: Each endpoint deploys as a standalone serverless function
- **Development**: Vite development server with API route support

## Data Storage Architecture
- **Database**: PostgreSQL with Supabase cloud hosting and serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Shared TypeScript schema definitions between client and server
- **Migrations**: Drizzle Kit for database schema management (`npm run db:push`)
- **Data Sources**: Real transaction data from MyWell API, stored customer information, staff records

## Sync Architecture
- **Status**: Sync functionality disabled in serverless architecture
- **API Integration**: MyWell API integration code available but requires scheduled execution
- **Data Processing**: Prepared for customer record creation/updates and transaction deduplication
- **Future**: Could be implemented via Vercel Cron Jobs or external scheduler

## Database Schema Design
- **Customers Table**: Stores donor information including personal details, addresses, and donation metrics
- **Transactions Table**: Records all donation transactions with payment method details, amounts, and metadata
- **Relationships**: Foreign key relationship between transactions and customers
- **Data Types**: Monetary amounts stored as integers (cents) for precision, UUIDs for primary keys

## Authentication & Authorization
- Currently uses session-based approach with placeholder authentication
- Designed for internal staff use with basic user identification
- Ready for integration with more robust authentication systems

## Development & Deployment Strategy
- **Frontend-Only Development**: Pure Vite development server for frontend
- **API Routes**: Individual serverless functions in /api directory
- **Build Process**: Static frontend build with serverless function deployment
- **Deployment**: Vercel-optimized with automatic serverless function detection
- **Environment**: Replit development with Vercel production deployment

# External Dependencies

## Database Services
- **Supabase**: Cloud PostgreSQL database with real-time capabilities and connection pooling
- **Connect-pg-simple**: PostgreSQL session store for Express sessions

## External API Integrations
- **MyWell API**: Payment processor integration for transaction data synchronization
  - Endpoint: https://dev-api.mywell.io/api/transaction/gift/search
  - Authentication: API token-based (84c7f095-8f50-4645-bc65-b0163c104839)
  - Features: Paginated transaction retrieval, date range filtering, gift transaction search

## Email Services
- **Resend**: Modern email API for transactional emails
  - Authentication codes and password reset emails
  - Professional email templates with Jews for Jesus branding
  - API Key: re_FCHtmZRs_BejUiuRkmnSnXszoSDyQz8JD

## UI & Component Libraries
- **Radix UI**: Unstyled, accessible component primitives for all interactive elements
- **Lucide React**: Icon library providing consistent iconography throughout the application
- **Embla Carousel**: Carousel component for any future image/content sliding needs
- **CMDK**: Command palette component for potential search functionality

## Development & Build Tools
- **Vite**: Frontend build tool with hot module replacement and optimized bundling
- **esbuild**: Fast JavaScript bundler for production server builds
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer
- **Replit Plugins**: Development environment integration with cartographer and error modals

## Form & Data Handling
- **React Hook Form**: Form state management with performance optimization
- **Zod**: Runtime type validation and schema definition
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **Date-fns**: Date manipulation and formatting utilities

## Utility Libraries
- **Class Variance Authority**: Utility for creating variant-based component APIs
- **clsx**: Conditional className utility for dynamic styling
- **Tailwind Merge**: Intelligent Tailwind class merging to prevent conflicts