# Farm-to-Consumer Web Application

A full-stack web application connecting farmers directly with consumers, built with Angular 18 and Node.js + Express.

## Project Structure

```
farm-to-consumer-web/
├── frontend/          # Angular 18 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          # Core services and models
│   │   │   ├── features/      # Feature modules
│   │   │   ├── shared/        # Shared components and services
│   │   │   └── ...
│   │   └── ...
│   └── package.json
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── config/    # Database and app configuration
│   │   ├── controllers/ # API controllers
│   │   ├── middleware/ # Custom middleware
│   │   ├── models/     # Sequelize models
│   │   ├── routes/     # API routes
│   │   └── ...
│   └── package.json
└── README.md
```

## Features

### Frontend (Angular 18)
- 🅰️ Angular 18 with standalone components
- 🎨 SCSS styling support
- 🛣️ Angular Router for navigation
- 🔧 Module-based architecture
- 📱 Responsive design ready

### Backend (Node.js + Express)
- 🔐 JWT Authentication with role-based access control
- 🗄️ PostgreSQL database with Sequelize ORM
- 🛡️ Security middleware (Helmet, CORS)
- 📝 Request logging with Morgan
- 🔄 Database migrations and seeding
- 🏗️ TypeScript support
- 🚀 Hot reloading in development

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Update the `.env` file with your database credentials and JWT secret.

5. Create the PostgreSQL database:
```sql
CREATE DATABASE farm_to_consumer;
```

6. Run database migrations:
```bash
npm run db:migrate
```

7. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
ng serve
```

The application will be available at `http://localhost:4200`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Health Check
- `GET /api/health` - API health status

## User Roles

- **Farmer**: Can list and manage their products
- **Consumer**: Can browse and purchase products
- **Admin**: Full system access

## Development

### Backend Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed the database
npm run db:reset     # Reset and reseed the database
```

### Frontend Commands
```bash
ng serve             # Start development server
ng build             # Build for production
ng test              # Run unit tests
ng e2e               # Run end-to-end tests
```

## Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farm_to_consumer
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
