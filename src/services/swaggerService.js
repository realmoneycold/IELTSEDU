const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IELTSPRACTICE API Documentation',
      version: '1.0.0',
      description: 'API documentation for the IELTSPRACTICE platform',
      contact: {
        name: 'API Support',
        url: 'https://ieltspractice.com/support',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? process.env.FRONTEND_URL 
          : 'http://localhost:4000',
        description: 'Primary Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/app.js'], // files containing annotations
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
