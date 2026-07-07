import { IsUUID, IsOptional, IsDateString } from 'class-validator';

export class EnrollStudentPlanDto {
  @IsUUID() studentId: string;
  @IsUUID() planId: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}
