import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessLog } from './access-log.entity';

@Injectable()
export class AccessLogService {
  constructor(
    @InjectRepository(AccessLog)
    private readonly repo: Repository<AccessLog>,
  ) {}

  async registrar(datos: {
    usuarioId?: number;
    ip?: string;
    evento: string;
    browser?: string;
  }) {
    const log = this.repo.create({
      usuario: datos.usuarioId ? { id: datos.usuarioId } : undefined,
      ip: datos.ip,
      evento: datos.evento as 'ingreso' | 'salida',
      browser: datos.browser,
    });
    return this.repo.save(log);
  }

  listar() {
    return this.repo.find({
      relations: { usuario: true },
      order: { fecha_hora: 'DESC' },
      take: 100,
    });
  }

  listarPorUsuario(usuarioId: number) {
    return this.repo.find({
      where: { usuario: { id: usuarioId } },
      order: { fecha_hora: 'DESC' },
    });
  }
}
