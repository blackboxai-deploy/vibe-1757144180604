import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Core modules
import { PrismaModule } from './common/database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

// Business modules
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { CustomersModule } from './customers/customers.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { ShippingModule } from './shipping/shipping.module';
import { ReturnsModule } from './returns/returns.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';

// E-commerce modules
import { StorefrontModule } from './storefront/storefront.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';

// Shared modules
import { EmailModule } from './common/email/email.module';
import { FileUploadModule } from './common/file-upload/file-upload.module';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: undefined, // Add Joi validation schema if needed
      cache: true,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('RATE_LIMIT_WINDOW', 900000), // 15 minutes
        limit: config.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
        skipIf: (context) => {
          // Skip rate limiting for health checks and internal requests
          const request = context.switchToHttp().getRequest();
          const skipPaths = ['/health', '/metrics'];
          return skipPaths.includes(request.url);
        },
      }),
    }),

    // Static file serving for uploads
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          rootPath: join(__dirname, '..', '..', 'uploads'),
          serveRoot: '/uploads',
          exclude: ['/api*'],
        },
        {
          rootPath: join(__dirname, '..', '..', 'public'),
          serveRoot: '/public',
          exclude: ['/api*'],
        },
      ],
    }),

    // Database
    PrismaModule,

    // Core modules
    LoggerModule,
    AuthModule,
    UsersModule,
    EmailModule,
    FileUploadModule,

    // Business logic modules
    ProductsModule,
    InventoryModule,
    SuppliersModule,
    PurchaseOrdersModule,
    CustomersModule,
    SalesOrdersModule,
    ShippingModule,
    ReturnsModule,
    ReportsModule,
    AuditModule,
    SettingsModule,

    // E-commerce modules
    StorefrontModule,
    CartModule,
    PaymentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const port = this.configService.get<number>('API_PORT', 5000);
    
    console.log(`🔧 Application initialized in ${nodeEnv} mode`);
    console.log(`🏠 Server will run on port ${port}`);
  }
}