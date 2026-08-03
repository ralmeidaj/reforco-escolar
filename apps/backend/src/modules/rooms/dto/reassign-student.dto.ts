import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReassignStudentDto {
  @ApiProperty({ description: 'ID do novo RoomAssignment (professor destino)' })
  @IsUUID()
  assignmentId: string;
}
