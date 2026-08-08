import { IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActivityCorrectionDto {
  @ApiProperty() @IsUUID() studentId: string;
  @ApiProperty() @IsString() subject: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gradeLevel?: string;
}
