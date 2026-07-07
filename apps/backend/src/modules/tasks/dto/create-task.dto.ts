import { IsUUID, IsString, IsIn, IsOptional, IsDateString, MinLength, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsUUID() studentId: string;
  @IsUUID() subjectId: string;
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(['padrao', 'trabalho', 'eureka', 'trilha']) type?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
