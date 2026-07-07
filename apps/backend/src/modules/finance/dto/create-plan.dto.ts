import { IsString, IsInt, IsNumber, IsOptional, IsUUID, IsBoolean, Min, MaxLength, MinLength } from 'class-validator';

export class CreatePlanDto {
  @IsString() @MinLength(1) @MaxLength(150) name: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(1) totalLessons: number;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsUUID() subjectId?: string;
}
