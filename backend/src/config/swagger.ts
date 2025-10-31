import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

// Minimal OpenAPI spec. Expand paths incrementally as needed.
export const swaggerSpec: any = {
  openapi: '3.0.3',
  info: {
    title: 'Farm-to-Consumer API',
    version: '1.0.0',
    description: 'API documentation for the Farm-to-Consumer platform.'
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth' },
    { name: 'Crops' },
    { name: 'Farmers' },
    { name: 'Orders' },
    { name: 'Payments' },
    { name: 'Feedback' },
    { name: 'Admin' }
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'API health status',
        responses: { '200': { description: 'OK' } }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: { required: true },
        responses: { '201': { description: 'Created' } }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login user',
        requestBody: { required: true },
        responses: { '200': { description: 'OK' } }
      }
    },
    '/api/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/api/crop/categories': {
      get: {
        tags: ['Crops'],
        summary: 'Get crop categories',
        responses: { '200': { description: 'OK' } }
      }
    },
    '/api/crop/browse': {
      get: {
        tags: ['Crops'],
        summary: 'Browse crops (public)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { '200': { description: 'OK' } }
      }
    },
    '/api/crop/public/{id}': {
      get: {
        tags: ['Crops'],
        summary: 'Get crop details (public)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } }
      }
    },
    '/api/crop': {
      post: {
        tags: ['Crops'],
        summary: 'Create crop (farmer)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Created' }, '403': { description: 'Forbidden' } }
      },
      get: {
        tags: ['Crops'],
        summary: 'Get farmer crops (farmer)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' }, '403': { description: 'Forbidden' } }
      }
    },
    '/api/crop/{id}': {
      get: {
        tags: ['Crops'],
        summary: 'Get crop details by id (public)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } }
      },
      put: {
        tags: ['Crops'],
        summary: 'Update crop (farmer)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } }
      },
      delete: {
        tags: ['Crops'],
        summary: 'Delete crop (farmer)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } }
      }
    }
  }
};

export function registerSwagger(app: Express): void {
  // Serve OpenAPI spec
  app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));
  // Serve Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}


