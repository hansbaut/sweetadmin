import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { Pedido } from '../pedidos/pedido.entity';
import { Producto } from '../productos/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, Producto])],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
