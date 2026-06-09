import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessLogService } from './access-log.service';
import { AccessLog } from './access-log.entity';
import { AccessLogController } from './access-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AccessLog])],
  providers: [AccessLogService],
  exports: [AccessLogService],
  controllers: [AccessLogController],
})
export class AccessLogModule {}
