import { IsUUID, IsIn, IsNumber, Min, Max } from 'class-validator';

const UNIDADES = ['1', '2', '3', '4'] as const;

export class CreateStudentGradeDto {
  @IsUUID() studentId: string;
  @IsUUID() subjectId: string;
  @IsIn(UNIDADES) unidade: string;
  @IsNumber() @Min(0) @Max(10) value: number;
}
