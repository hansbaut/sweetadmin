import { Injectable } from '@nestjs/common';
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

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email, activo: true } });
  }

  findAll() {
    return this.repo.find({ where: { activo: true } });
  }

  async crear(datos: { nombre: string; email: string; password: string; rol?: string }) {
    const fuerza = this.evaluarFortaleza(datos.password);
    const hash = await bcrypt.hash(datos.password, 10);
    const usuario = this.repo.create({
      ...datos,
      password: hash,
      fuerza_password: fuerza,
    });
    return this.repo.save(usuario);
  }

  async eliminar(id: number) {
    await this.repo.update(id, { activo: false });
    return { mensaje: 'Usuario desactivado' };
  }

  evaluarFortaleza(password: string): string {
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[!@#$%^&*]/.test(password),
    ];
    const puntaje = checks.filter(Boolean).length;
    if (puntaje <= 1) return 'debil';
    if (puntaje <= 3) return 'intermedio';
    return 'fuerte';
  }
}
