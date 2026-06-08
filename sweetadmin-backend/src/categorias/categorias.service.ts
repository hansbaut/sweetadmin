import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './categoria.entity';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly repo: Repository<Categoria>,
  ) {}

  listar() {
    return this.repo.find({ where: { activo: true } });
  }

  crear(nombre: string) {
    const categoria = this.repo.create({ nombre });
    return this.repo.save(categoria);
  }

  async eliminar(id: number) {
    await this.repo.update(id, { activo: false });
    return { mensaje: 'Categoría eliminada' };
  }
}
