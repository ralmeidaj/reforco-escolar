import { IsString, IsIn, IsOptional, IsDateString, MinLength, MaxLength } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(['padrao', 'trabalho', 'eureka', 'trilha']) type?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
