import { IsUUID, IsIn } from 'class-validator';

export class CreateAttendanceDto {
  @IsUUID() sessionId: string;
  @IsUUID() studentId: string;
  @IsIn(['presente', 'ausente', 'justificado']) status: string;
}
