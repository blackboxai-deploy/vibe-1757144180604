import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Compression middleware
  app.use(compression());

  // CORS configuration
  const allowedOrigins = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000').split(',');
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-request-id'],
    credentials: true,
    optionsSuccessStatus: 200,
  });

  // Global prefix for API routes
  app.setGlobalPrefix('api/v1', {
    exclude: ['/health', '/metrics'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validateCustomDecorators: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filters
  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new HttpExceptionFilter(),
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger API documentation
  if (configService.get<boolean>('ENABLE_SWAGGER', true)) {
    const config = new DocumentBuilder()
      .setTitle('Inventory Management System API')
      .setDescription(`
        Comprehensive inventory management system with e-commerce capabilities.
        
        ## Features
        - Role-based access control (Super Admin, Admin, Subordinate)
        - Complete audit trail for all operations
        - Real-time inventory tracking
        - Purchase order management
        - Sales order processing
        - E-commerce integration
        - Customer management
        - Returns and refunds
        - Advanced reporting
        
        ## Authentication
        This API uses JWT tokens for authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your_token>\`
        
        ## Rate Limiting
        API endpoints are rate limited to prevent abuse. Check response headers for limit information.
        
        ## Error Handling
        All errors follow RFC 7807 Problem Details for HTTP APIs standard.
      `)
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Users', 'User management endpoints')
      .addTag('Products', 'Product catalog management')
      .addTag('Inventory', 'Stock and warehouse management')
      .addTag('Suppliers', 'Supplier management')
      .addTag('Purchase Orders', 'Purchase order processing')
      .addTag('Sales Orders', 'Sales order management')
      .addTag('Customers', 'Customer management')
      .addTag('E-commerce', 'Storefront and shopping cart')
      .addTag('Shipping', 'Order fulfillment and shipping')
      .addTag('Returns', 'Return and refund processing')
      .addTag('Reports', 'Analytics and reporting')
      .addTag('Audit', 'Audit logs and security')
      .addTag('Settings', 'System configuration')
      .addServer('http://localhost:5000', 'Development server')
      .addServer('http://localhost:3000/api', 'Frontend proxy')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'Inventory Management API Docs',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #1976d2 }
      `,
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: 'none',
        defaultModelExpandDepth: 2,
        defaultModelsExpandDepth: 1,
      },
    });

    logger.log('📚 Swagger documentation available at http://localhost:5000/docs');
  }

  // Health check endpoint
  app.use('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  const port = configService.get<number>('API_PORT', 5000);
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📖 API Documentation: http://localhost:${port}/docs`);
  logger.log(`🏥 Health Check: http://localhost:${port}/health`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});