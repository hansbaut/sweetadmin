import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  // ─── Buscar por email (usado en auth) ─────────────────────────────────────
  findByEmail(email: string) {
    return this.repo.findOne({ where: { email, activo: 1 as any } });
  }

  // ─── Listar todos los usuarios activos ────────────────────────────────────
  findAll() {
    return this.repo.find({
      where: { activo: 1 as any },
      select: {
        id: true, nombre: true, email: true, rol: true,
        fuerza_password: true, activo: true, created_at: true,
      },
      order: { created_at: 'DESC' },
    });
  }
  // ─── Buscar usuario por ID ────────────────────────────────────────────────
  async findById(id: number) {
    const usuario = await this.repo.findOne({
      where: { id, activo: 1 as any },
      select: {
        id: true, nombre: true, email: true, rol: true,
        fuerza_password: true, activo: true, created_at: true,
      },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  // ─── Crear usuario (solo admin) ───────────────────────────────────────────
  async crear(datos: {
    nombre: string;
    email: string;
    password: string;
    rol?: 'admin' | 'empleado' | 'cliente';
  }) {
    // Verificar que el email no esté en uso
    const existe = await this.repo.findOne({ where: { email: datos.email } });
    if (existe) throw new ConflictException('El correo ya está registrado');

    const fuerza = this.evaluarFortaleza(datos.password);
    const hash = await bcrypt.hash(datos.password, 10);

    const usuario = this.repo.create({
      nombre: datos.nombre,
      email: datos.email,
      password: hash,
      rol: datos.rol ?? 'cliente',
      fuerza_password: fuerza,
      activo: true,
    });
    const saved = await this.repo.save(usuario);

    // Retornar sin la contraseña
    const { password: _, ...result } = saved;
    return result;
  }

  // ─── Actualizar nombre / email / contraseña ───────────────────────────────
  async actualizar(id: number, datos: {
    nombre?: string;
    email?: string;
    password?: string;
  }) {
    const usuario = await this.repo.findOne({ where: { id, activo: 1 as any } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (datos.email && datos.email !== usuario.email) {
      const existe = await this.repo.findOne({ where: { email: datos.email } });
      if (existe) throw new ConflictException('El correo ya está en uso');
    }

    const update: Partial<Usuario> = {};
    if (datos.nombre) update.nombre = datos.nombre;
    if (datos.email) update.email = datos.email;
    if (datos.password) {
      update.password = await bcrypt.hash(datos.password, 10);
      update.fuerza_password = this.evaluarFortaleza(datos.password) as any;
    }

    await this.repo.update(id, update);
    return this.findById(id);
  }

  // ─── Cambiar rol de usuario ───────────────────────────────────────────────
  async cambiarRol(id: number, rol: 'admin' | 'empleado' | 'cliente') {
    const usuario = await this.repo.findOne({ where: { id, activo: true } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    await this.repo.update(id, { rol });
    return this.findById(id);
  }

  // ─── Eliminación lógica ───────────────────────────────────────────────────
  async eliminar(id: number) {
    const usuario = await this.repo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    await this.repo.update(id, { activo: false });
    return { mensaje: 'Usuario desactivado correctamente' };
  }

  // ─── Evaluar fortaleza de contraseña ─────────────────────────────────────
  evaluarFortaleza(password: string): 'debil' | 'intermedio' | 'fuerte' {
    const checks = [
      password.length >= 8,       // mínimo 8 caracteres
      /[A-Z]/.test(password),     // al menos una mayúscula
      /[0-9]/.test(password),     // al menos un número
      /[!@#$%^&*]/.test(password),// al menos un carácter especial
    ];
    const puntaje = checks.filter(Boolean).length;
    if (puntaje <= 1) return 'debil';
    if (puntaje <= 3) return 'intermedio';
    return 'fuerte';
  }
}
