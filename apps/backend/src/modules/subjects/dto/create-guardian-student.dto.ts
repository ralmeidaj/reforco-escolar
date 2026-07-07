import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGuardianStudentDto {
  @ApiProperty()
  @IsUUID()
  guardianId: string;

  @ApiProperty()
  @IsUUID()
  studentId: string;
}
