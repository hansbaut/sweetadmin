import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
  ) {}

  listar() {
    return this.repo.find({ where: { activo: true } });
  }

  obtener(id: number) {
    return this.repo.findOne({ where: { id, activo: true } });
  }

  crear(dto: CreateProductoDto) {
    const producto = this.repo.create(dto);
    return this.repo.save(producto);
  }

  async actualizar(id: number, dto: Partial<CreateProductoDto>) {
    await this.repo.update(id, dto);
    return this.obtener(id);
  }

  async eliminar(id: number) {
    await this.repo.update(id, { activo: false });
    return { mensaje: 'Producto eliminado correctamente' };
  }
}
