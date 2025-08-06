# Overview

This is a donation management system for Jews for Jesus, built as a full-stack web application. The system provides a comprehensive dashboard for managing donors, tracking transactions, and processing donations. It features a modern React frontend with a clean, professional interface and an Express.js backend with PostgreSQL database integration.

The application serves as an internal tool for staff members to view donation analytics, manage customer records, process transactions, and handle refunds. It supports both one-time donations and monthly subscriptions with detailed tracking of payment methods and donor information.

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
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Development**: TSX for TypeScript execution during development
- **Production Build**: esbuild for fast bundling with external package handling
- **API Pattern**: RESTful endpoints with consistent error handling and request/response logging

## Data Storage Architecture
- **Database**: PostgreSQL with Neon Database serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Shared TypeScript schema definitions between client and server
- **Migrations**: Drizzle Kit for database schema management
- **Development Storage**: In-memory storage implementation with seed data for development/testing

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
- **Monorepo Structure**: Client and server code in same repository with shared schema
- **Development**: Hot module replacement via Vite with Express server integration
- **Build Process**: Separate client and server builds with static file serving
- **Environment**: Replit-optimized with development banners and error overlays

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Connect-pg-simple**: PostgreSQL session store for Express sessions

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