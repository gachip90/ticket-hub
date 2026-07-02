import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message = this.getMessage(exceptionResponse);

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private getMessage(exceptionResponse: string | object | null) {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      exceptionResponse &&
      'message' in exceptionResponse &&
      typeof exceptionResponse.message === 'string'
    ) {
      return exceptionResponse.message;
    }

    if (
      exceptionResponse &&
      'message' in exceptionResponse &&
      Array.isArray(exceptionResponse.message)
    ) {
      return exceptionResponse.message.join(', ');
    }

    return 'Internal server error.';
  }
}
