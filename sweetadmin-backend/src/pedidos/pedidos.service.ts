import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from './pedido.entity';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private readonly repo: Repository<Pedido>,
  ) {}

  listar() {
    return this.repo.find({
      where: { activo: true },
      relations: { cliente: true },
      order: { fecha: 'DESC' },
    });
  }

  obtener(id: number) {
    return this.repo.findOne({
      where: { id, activo: true },
      relations: { cliente: true },
    });
  }

  crear(clienteId: number) {
    const pedido = this.repo.create({ cliente: { id: clienteId } });
    return this.repo.save(pedido);
  }

  async cambiarEstado(id: number, estado: string) {
    await this.repo.update(id, { estado });
    return this.obtener(id);
  }

  async eliminar(id: number) {
    await this.repo.update(id, { activo: false });
    return { mensaje: 'Pedido cancelado' };
  }
}
