import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Usuario } from '../users/user.entity';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  cliente: Usuario;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({
    type: 'enum',
    enum: ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado'],
    default: 'pendiente',
  })
  estado: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  fecha: Date;
}
