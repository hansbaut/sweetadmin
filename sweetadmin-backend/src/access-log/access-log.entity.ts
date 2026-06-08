import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Usuario } from '../users/user.entity';

@Entity('access_log')
export class AccessLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { nullable: true })
  usuario: Usuario;

  @Column({ nullable: true })
  ip: string;

  @Column({ type: 'enum', enum: ['ingreso', 'salida'], default: 'ingreso' })
  evento: string;

  @Column({ nullable: true })
  browser: string;

  @CreateDateColumn()
  fecha_hora: Date;
}
