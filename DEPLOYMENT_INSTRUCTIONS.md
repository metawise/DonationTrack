# Deployment Instructions for Vercel

## Project Structure
This is a standard Next.js 15 application using the App Router. All API routes are now in the `src/app/api` directory following Next.js conventions.

## Local Development
To run the application locally:
```bash
./run-dev.sh
# or
npx next dev -p 5000
```

## Building for Production
To build the application for deployment:
```bash
./run-build.sh
# or
npx next build
```

## Deploying to Vercel

### Method 1: GitHub Integration
1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Vercel will automatically detect Next.js and configure the build settings
4. Deploy with one click

### Method 2: Vercel CLI
1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Run in your project directory:
```bash
vercel
```

3. Follow the prompts to deploy

### Method 3: Manual Upload
1. Build the project locally:
```bash
npx next build
```

2. Upload the entire project directory to Vercel

## Environment Variables
Make sure to set these environment variables in Vercel:
- `DATABASE_URL` - Your PostgreSQL connection string
- `MYWELL_API_TOKEN_PUBLIC` - Your MyWell API token
- `MYWELL_API_TOKEN_PRIVATE` - Your MyWell private token (if needed)
- `RESEND_API_KEY` - Your Resend API key for emails
- `NODE_ENV` - Set to "production"

## API Routes
All API endpoints are now at standard Next.js locations:
- `/api/auth` - Authentication check
- `/api/auth/send-otp` - Send OTP email
- `/api/auth/verify-otp` - Verify OTP code
- `/api/auth/logout` - Logout
- `/api/auth/me` - Get current user
- `/api/dashboard/metrics` - Dashboard metrics
- `/api/customers` - Customer management
- `/api/transactions` - Transaction management
- `/api/staff` - Staff management
- `/api/staff/[id]` - Individual staff member
- `/api/sync/mywell` - MyWell data sync
- `/api/sync/status` - Sync status

## Database
The application uses PostgreSQL. Make sure your database is accessible from Vercel's servers.

## Notes
- All routes use standard Next.js App Router conventions
- CORS headers are configured in `next.config.js`
- Session management uses HTTP-only cookies
- The application is fully compatible with Vercel's serverless architecture