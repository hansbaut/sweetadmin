import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AccessLogService } from '../access-log/access-log.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private accessLogService: AccessLogService,
  ) {}

  async login(email: string, password: string, ip?: string, browser?: string) {
    const usuario = await this.usersService.findByEmail(email);
    if (!usuario) throw new UnauthorizedException('Credenciales incorrectas');

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) throw new UnauthorizedException('Credenciales incorrectas');

    // Registrar ingreso automáticamente
    await this.accessLogService.registrar({
      usuarioId: usuario.id,
      ip,
      evento: 'ingreso',
      browser,
    });

    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }

  async registro(nombre: string, email: string, password: string) {
    return this.usersService.crear({ nombre, email, password });
  }

  async logout(usuarioId: number, ip?: string, browser?: string) {
    await this.accessLogService.registrar({
      usuarioId,
      ip,
      evento: 'salida',
      browser,
    });
    return { mensaje: 'Sesión cerrada correctamente' };
  }
}
