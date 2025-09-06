import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');
    
    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
      errorFormat: 'pretty',
    });

    // Log database queries in development
    if (configService.get<string>('NODE_ENV') === 'development') {
      this.$on('query', (e) => {
        this.logger.verbose(`Query: ${e.query}`);
        this.logger.verbose(`Params: ${e.params}`);
        this.logger.verbose(`Duration: ${e.duration}ms`);
      });
    }

    // Log database errors
    this.$on('error', (e) => {
      this.logger.error(`Database error: ${e.message}`);
    });

    // Log database info
    this.$on('info', (e) => {
      this.logger.log(`Database info: ${e.message}`);
    });

    // Log database warnings
    this.$on('warn', (e) => {
      this.logger.warn(`Database warning: ${e.message}`);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
      
      // Run database health check
      await this.healthCheck();
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('🔌 Database disconnected');
    } catch (error) {
      this.logger.error('❌ Error disconnecting from database:', error);
    }
  }

  /**
   * Database health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Clean disconnect (useful for testing)
   */
  async cleanupConnection(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Execute raw SQL with error handling
   */
  async executeRaw(sql: string, ...args: any[]): Promise<any> {
    try {
      return await this.$queryRawUnsafe(sql, ...args);
    } catch (error) {
      this.logger.error(`Raw query failed: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const stats = await this.$metrics.json();
      return stats;
    } catch (error) {
      this.logger.error('Failed to get database statistics:', error);
      return null;
    }
  }

  /**
   * Transaction helper with automatic rollback on error
   */
  async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
    }
  ): Promise<T> {
    try {
      return await this.$transaction(fn, {
        maxWait: options?.maxWait || 5000, // 5 seconds
        timeout: options?.timeout || 30000, // 30 seconds
      });
    } catch (error) {
      this.logger.error('Transaction failed:', error);
      throw error;
    }
  }
}