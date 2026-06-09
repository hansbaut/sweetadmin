import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccessLogService } from './access-log.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('access-log')
@UseGuards(JwtAuthGuard)
export class AccessLogController {
  constructor(private readonly service: AccessLogService) {}

  @Get()
  listar() {
    return this.service.listar();
  }
}