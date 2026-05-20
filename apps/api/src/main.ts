import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from '@/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();

  const webDistPath = join(__dirname, '../../web/dist');

  if (existsSync(webDistPath)) {
    app.useStaticAssets(webDistPath, { index: false });

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      if (req.path.includes('.')) {
        return next();
      }
      res.sendFile(join(webDistPath, 'index.html'));
    });

    Logger.log(`Serving frontend from: ${webDistPath}`, 'Bootstrap');
  }

  const port = process.env.PORT ?? 3000;

  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${String(port)}`, 'Bootstrap');
}

void bootstrap();
