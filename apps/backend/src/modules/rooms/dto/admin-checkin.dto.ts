import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminCheckinDto {
  @ApiProperty()
  @IsUUID()
  studentId: string;
}
