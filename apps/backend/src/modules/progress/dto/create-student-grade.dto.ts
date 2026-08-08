import { IsUUID, IsString, IsNumber } from 'class-validator';

export class CreateStudentGradeDto {
  @IsUUID() studentId: string;
  @IsString() subject: string;
  @IsNumber() value: number;
}
