import { IsString, IsOptional, IsDateString } from 'class-validator';

export class ConfirmSchoolTaskCaptureDto {
  @IsString() imageUrl: string;
  @IsOptional() @IsString() subject?: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
