import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // API prefix
  app.setGlobalPrefix('api');

  // If running behind a reverse proxy/load balancer, trust X-Forwarded-For
  // so `req.ip` reflects the original client IP. Use the underlying Express
  // instance to set this option (avoids TypeScript error on INestApplication).
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter && (httpAdapter as any).getInstance ? (httpAdapter as any).getInstance() : null;
  if (expressInstance && typeof expressInstance.set === 'function') {
    expressInstance.set('trust proxy', true);
  }

  // Swagger docs at /docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ExamTrust API')
    .setDescription('Academic Trust Suite – REST API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 ExamTrust API running on http://localhost:${port}/api`);
  console.log(`📖 Swagger docs    → http://localhost:${port}/docs`);
}
bootstrap();
