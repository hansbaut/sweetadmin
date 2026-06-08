import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessLogService } from './access-log.service';
import { AccessLog } from './access-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccessLog])],
  providers: [AccessLogService],
  exports: [AccessLogService],
})
export class AccessLogModule {}
