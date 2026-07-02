import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.APP_WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.API_PORT ?? 3001);
}
void bootstrap();
