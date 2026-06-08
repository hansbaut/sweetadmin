import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { AccessLogModule } from '../access-log/access-log.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    AccessLogModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'sweetadmin_secret_2025',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
