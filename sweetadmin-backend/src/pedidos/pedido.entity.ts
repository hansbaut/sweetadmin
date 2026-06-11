import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, CreateDateColumn, JoinColumn,
} from 'typeorm';
import { Usuario } from '../users/user.entity';
import { PedidoDetalle } from './pedido-detalle.entity';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  // ─── Cliente registrado (opcional) ───────────────────────────────────────
  @ManyToOne(() => Usuario, { nullable: true, eager: true })
  @JoinColumn({ name: 'clienteId' })
  cliente: Usuario;

  @Column({ nullable: true })
  clienteId: number;

  // ─── Cliente sin cuenta (presencial) ─────────────────────────────────────
  @Column({ length: 100, nullable: true })
  clienteNombre: string;

  @Column({ length: 20, nullable: true })
  clienteTelefono: string;

  // ─── Totales ──────────────────────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  descuento: number;           // monto descontado en Bs.

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  porcentajeDescuento: number; // % aplicado

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;               // subtotal - descuento

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  anticipo: number;            // 50% pagado por adelantado

  // ─── Estado ───────────────────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado'],
    default: 'pendiente',
  })
  estado: string;

  // ─── Tipo de entrega ──────────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ['presencial', 'delivery'],
    default: 'presencial',
  })
  tipoEntrega: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  fecha: Date;

  // ─── Detalles (productos del pedido) ─────────────────────────────────────
  @OneToMany(() => PedidoDetalle, detalle => detalle.pedido, {
    cascade: true,
    eager: true,
  })
  detalles: PedidoDetalle[];
}
