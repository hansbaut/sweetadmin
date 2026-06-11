import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, ParseIntPipe, Request,
  UseGuards, ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Solo ADMIN puede ver todos los usuarios ───────────────────────────────
  @Get()
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }

  // ─── Solo ADMIN puede ver un usuario por ID ────────────────────────────────
  @Get(':id')
  @Roles('admin')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  // ─── Solo ADMIN puede crear usuarios con cualquier rol ────────────────────
  @Post()
  @Roles('admin')
  crear(
    @Body() body: {
      nombre: string;
      email: string;
      password: string;
      rol: 'admin' | 'empleado' | 'cliente';
    },
  ) {
    return this.usersService.crear(body);
  }

  // ─── Solo ADMIN puede editar usuarios (nombre, email) ─────────────────────
  @Put(':id')
  @Roles('admin')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nombre?: string; email?: string; password?: string },
  ) {
    return this.usersService.actualizar(id, body);
  }

  // ─── Solo ADMIN puede cambiar el rol de un usuario ────────────────────────
  @Patch(':id/rol')
  @Roles('admin')
  cambiarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rol: 'admin' | 'empleado' | 'cliente' },
  ) {
    return this.usersService.cambiarRol(id, body.rol);
  }

  // ─── Solo ADMIN puede desactivar (eliminación lógica) ────────────────────
  @Delete(':id')
  @Roles('admin')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    // Evitar que el admin se elimine a sí mismo
    if (req.user.id === id) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }
    return this.usersService.eliminar(id);
  }

  // ─── Cualquier usuario autenticado puede ver su propio perfil ─────────────
  @Get('perfil/me')
  perfil(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }
}
