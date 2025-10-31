# Farm-to-Consumer Backend API

A Node.js + Express backend API for the Farm-to-Consumer web application with PostgreSQL database and JWT authentication.

## Features

- 🔐 JWT Authentication with role-based access control
- 🗄️ PostgreSQL database with Sequelize ORM
- 🛡️ Security middleware (Helmet, CORS)
- 📝 Request logging with Morgan
- 🔄 Database migrations and seeding
- 🏗️ TypeScript support
- 🚀 Hot reloading in development

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
```

3. Update the `.env` file with your database credentials and JWT secret.

4. Create the PostgreSQL database:
```sql
CREATE DATABASE farm_to_consumer;
```

5. Run database migrations:
```bash
npm run db:migrate
```

## Development

Start the development server with hot reloading:
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

## Production

1. Build the TypeScript code:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Health Check
- `GET /api/health` - API health status

## Database Commands

- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed the database
- `npm run db:reset` - Reset and reseed the database

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | farm_to_consumer |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | password |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:4200 |

## Project Structure

```
src/
├── config/          # Database and app configuration
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Sequelize models
├── routes/          # API routes
├── services/        # Business logic services
├── utils/           # Utility functions
├── app.ts           # Express app configuration
└── server.ts        # Server entry point
```
