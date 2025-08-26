# GHL Clone CRM Backend

A backend service for a CRM system similar to GoHighLevel, built with Node.js, Express, Prisma, and PostgreSQL.

## Features

- User authentication with JWT
- Contact management
- Pipeline and deal management
- Automation workflows
- Third-party integrations (Kixie, iClosed)
- Webhook handling
- Encrypted credential storage
- Comprehensive API endpoints

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: express-validator
- **Testing**: Jest, Supertest
- **HTTP Client**: Axios with retry
- **Encryption**: Node.js Crypto

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your database credentials and other configuration:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/ghl_clone_crm"
   JWT_SECRET="your-super-secret-jwt-key-here"
   ENCRYPTION_KEY="your-32-character-encryption-key-here"
   PORT=3000
   ```

### Database Setup

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE ghl_clone_crm;
   ```

2. Run Prisma migrations:
   ```bash
   npm run migrate
   ```

3. Generate Prisma client:
   ```bash
   npm run generate
   ```

4. Seed the database with initial data:
   ```bash
   npm run seed
   ```

### Running the Application

- **Development mode** (with auto-reload):
  ```bash
  npm run dev
  ```

- **Production mode**:
  ```bash
  npm start
  ```

### Testing

Run the test suite:
```bash
npm test
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user

### Contacts

- `GET /api/v1/contacts` - Get all contacts
- `GET /api/v1/contacts/:id` - Get a single contact
- `POST /api/v1/contacts` - Create a new contact
- `PUT /api/v1/contacts/:id` - Update a contact
- `DELETE /api/v1/contacts/:id` - Delete a contact

### Pipelines

- `GET /api/v1/pipelines` - Get all pipelines
- `GET /api/v1/pipelines/:id/stages` - Get stages for a pipeline
- `GET /api/v1/pipelines/:id/deals` - Get deals for a pipeline
- `POST /api/v1/pipelines` - Create a new pipeline
- `PUT /api/v1/pipelines/:id` - Update a pipeline
- `DELETE /api/v1/pipelines/:id` - Delete a pipeline

### Deals

- `GET /api/v1/deals` - Get all deals
- `GET /api/v1/deals/:id` - Get a single deal
- `POST /api/v1/deals` - Create a new deal
- `PUT /api/v1/deals/:id` - Update a deal
- `DELETE /api/v1/deals/:id` - Delete a deal

### Workflows

- `GET /api/v1/workflows` - Get all workflows
- `GET /api/v1/workflows/:id` - Get a single workflow
- `POST /api/v1/workflows` - Create a new workflow
- `PUT /api/v1/workflows/:id` - Update a workflow
- `DELETE /api/v1/workflows/:id` - Delete a workflow
- `POST /api/v1/workflows/:id/execute` - Execute a workflow

### Integrations

- `GET /api/v1/integrations` - Get all integrations
- `GET /api/v1/integrations/:id` - Get a single integration
- `POST /api/v1/integrations` - Create a new integration
- `PUT /api/v1/integrations/:id` - Update an integration
- `DELETE /api/v1/integrations/:id` - Delete an integration
- `POST /api/v1/integrations/:id/test` - Test an integration

### Webhooks

- `POST /webhooks/kixie/call` - Handle Kixie call events
- `POST /webhooks/kixie/sms` - Handle Kixie SMS events
- `POST /webhooks/iclosed/deal` - Handle iClosed deal events
- `POST /webhooks/iclosed/contact` - Handle iClosed contact events
- `POST /webhooks/iclosed/activity` - Handle iClosed activity events

## Default Admin User

After running the seed command, you can use the following credentials to login:

- Email: `admin@example.com`
- Password: `admin123`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `ENCRYPTION_KEY` | 32-character key for encryption | Yes |
| `PORT` | Server port (default: 3000) | No |

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm run start` - Start production server
- `npm run migrate` - Run Prisma migrations
- `npm run seed` - Seed the database with initial data
- `npm run generate` - Generate Prisma client
- `npm run test` - Run the test suite

## Database Schema

The application uses the following main models:

- `User` - User accounts
- `Contact` - Contact information
- `Pipeline` - Sales pipelines
- `PipelineStage` - Stages within pipelines
- `Deal` - Sales deals
- `Activity` - Activity logs
- `AutomationWorkflow` - Automation workflows
- `Integration` - Third-party integrations
- `Tag` - Contact tags
- `CustomField` - Custom contact fields
- `WebhookLog` - Webhook request logs

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Encrypted credential storage
- Input validation
- CORS protection
- Helmet security headers
- Request logging

## Error Handling

The application uses centralized error handling with appropriate HTTP status codes and error messages. Errors are logged to the console in development mode.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the ISC License.
