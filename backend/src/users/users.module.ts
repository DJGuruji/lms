import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { PeersController } from './peers.controller.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController, PeersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
