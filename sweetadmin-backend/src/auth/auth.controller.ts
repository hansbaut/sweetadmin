import { Controller, Post, Body, HttpCode, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email: string; password: string }, @Req() req: any) {
    const ip = req.ip;
    const browser = req.headers['user-agent'];
    return this.authService.login(body.email, body.password, ip, browser);
  }

  @Post('registro')
  registro(@Body() body: { nombre: string; email: string; password: string }) {
    return this.authService.registro(body.nombre, body.email, body.password);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any) {
    const ip = req.ip;
    const browser = req.headers['user-agent'];
    return this.authService.logout(req.user.id, ip, browser);
  }
}
