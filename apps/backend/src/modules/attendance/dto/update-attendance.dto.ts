import { IsIn } from 'class-validator';

export class UpdateAttendanceDto {
  @IsIn(['presente', 'ausente', 'justificado']) status: string;
}
