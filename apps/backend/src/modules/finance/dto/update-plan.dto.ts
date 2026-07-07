import { IsString, IsInt, IsNumber, IsOptional, IsBoolean, Min, MaxLength } from 'class-validator';

export class UpdatePlanDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) totalLessons?: number;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
