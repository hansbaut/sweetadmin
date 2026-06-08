import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: ['admin', 'empleado', 'cliente'], default: 'cliente' })
  rol: string;

  @Column({ type: 'enum', enum: ['debil', 'intermedio', 'fuerte'], nullable: true })
  fuerza_password: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;
}
