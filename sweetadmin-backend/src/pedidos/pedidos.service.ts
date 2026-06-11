import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from './pedido.entity';
import { PedidoDetalle } from './pedido-detalle.entity';
import { Producto } from '../productos/producto.entity';

// ─── Tabla de descuentos por total del pedido ─────────────────────────────────
// Si el pedido supera el monto → se aplica ese % de descuento
const DESCUENTOS = [
  { minimo: 500, porcentaje: 15 },
  { minimo: 200, porcentaje: 10 },
  { minimo: 100, porcentaje: 5 },
  { minimo: 0, porcentaje: 0 },
];

function calcularDescuento(subtotal: number, esUsuarioRegistrado: boolean): number {
  if (!esUsuarioRegistrado) return 0; // sin descuento para clientes sin cuenta
  const regla = DESCUENTOS.find(d => subtotal >= d.minimo);
  return regla ? regla.porcentaje : 0;
}

export interface CrearPedidoDto {
  // Cliente registrado
  clienteId?: number;
  // Cliente sin cuenta
  clienteNombre?: string;
  clienteTelefono?: string;
  // Tipo de entrega
  tipoEntrega: 'presencial' | 'delivery';
  // Productos del pedido
  detalles: { productoId: number; cantidad: number }[];
}

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(PedidoDetalle)
    private readonly detalleRepo: Repository<PedidoDetalle>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
  ) {}

  // ─── Listar todos los pedidos ─────────────────────────────────────────────
  listar() {
    return this.pedidoRepo.find({
      where: { activo: true },
      order: { fecha: 'DESC' },
    });
  }

  // ─── Obtener un pedido por ID ─────────────────────────────────────────────
  async obtener(id: number) {
    const pedido = await this.pedidoRepo.findOne({ where: { id, activo: true } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    return pedido;
  }

  // ─── Crear pedido con productos ───────────────────────────────────────────
  async crear(dto: CrearPedidoDto) {
    if (!dto.detalles || dto.detalles.length === 0)
      throw new BadRequestException('El pedido debe tener al menos un producto');
    if (!dto.clienteId && !dto.clienteNombre)
      throw new BadRequestException('Debe indicar el cliente');

    return await this.pedidoRepo.manager.transaction(async (manager) => {
      const productoRepo  = manager.getRepository(Producto);
      const pedidoRepo    = manager.getRepository(Pedido);
      const detalleRepo   = manager.getRepository(PedidoDetalle);

      let subtotal = 0;
      const detalles: PedidoDetalle[] = [];

      for (const item of dto.detalles) {
        const producto = await productoRepo.findOne({
          where: { id: item.productoId, activo: true },
        });
        if (!producto)
          throw new NotFoundException(`Producto ${item.productoId} no encontrado`);
        if (producto.stock < item.cantidad)
          throw new BadRequestException(`Stock insuficiente para "${producto.nombre}"`);

        const precioUnitario = Number(producto.precio);
        const itemSubtotal = precioUnitario * item.cantidad;
        subtotal += itemSubtotal;

        const detalle = detalleRepo.create({
          productoId:     item.productoId,
          cantidad:       item.cantidad,
          precioUnitario,
          subtotal:       itemSubtotal,
        });
        detalles.push(detalle);

        await productoRepo.update(item.productoId, {
          stock: producto.stock - item.cantidad,
        });
      }

      const esRegistrado       = !!dto.clienteId;
      const porcentajeDescuento = calcularDescuento(subtotal, esRegistrado);
      const descuento           = (subtotal * porcentajeDescuento) / 100;
      const total               = subtotal - descuento;
      const anticipo            = dto.tipoEntrega === 'delivery' ? total * 0.5 : 0;

      const pedido = pedidoRepo.create({
        clienteId:        dto.clienteId        ?? undefined,
        clienteNombre:    dto.clienteNombre    ?? undefined,
        clienteTelefono:  dto.clienteTelefono  ?? undefined,
        tipoEntrega:        dto.tipoEntrega,
        subtotal,
        porcentajeDescuento,
        descuento,
        total,
        anticipo,
        detalles,
      } as Partial<Pedido>);

      return pedidoRepo.save(pedido);
    });
  }

  // ─── Cambiar estado ───────────────────────────────────────────────────────
  async cambiarEstado(id: number, estado: string) {
    await this.pedidoRepo.update(id, { estado });
    return this.obtener(id);
  }

  // ─── Cancelar pedido (lógico) y devolver stock ────────────────────────────
  async eliminar(id: number) {
    const pedido = await this.obtener(id);

    // Devolver stock de cada producto
    for (const detalle of pedido.detalles) {
      const producto = await this.productoRepo.findOne({
        where: { id: detalle.productoId },
      });
      if (producto) {
        await this.productoRepo.update(detalle.productoId, {
          stock: producto.stock + detalle.cantidad,
        });
      }
    }

    await this.pedidoRepo.update(id, { activo: false, estado: 'cancelado' });
    return { mensaje: 'Pedido cancelado y stock restaurado' };
  }
}
