import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from './auth.types';
import { parseLoginDto, parseRegisterDto } from './auth.validation';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.authService.register(parseRegisterDto(body));
  }

  @Post('login')
  login(@Body() body: unknown) {
    return this.authService.login(parseLoginDto(body));
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user);
  }
}
