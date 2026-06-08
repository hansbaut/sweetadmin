import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from '../categorias/categoria.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ nullable: true })
  imagen: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Categoria, { nullable: true, eager: true })
  @JoinColumn({ name: 'categoriaId' })
  categoria: Categoria;

  @Column({ nullable: true })
  categoriaId: number;

  @CreateDateColumn()
  created_at: Date;
}