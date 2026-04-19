import { Module } from '@nestjs/common';
import { InstituteController } from './institute.controller.js';
import { InstituteService } from './institute.service.js';

@Module({
  controllers: [InstituteController],
  providers: [InstituteService],
  exports: [InstituteService],
})
export class InstituteModule {}
