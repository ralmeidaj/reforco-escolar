import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsInt,
  IsIn,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty()
  @IsUUID()
  teacherId: string;

  @ApiProperty()
  @IsUUID()
  studentId: string;

  @ApiProperty()
  @IsUUID()
  subjectId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  slotId?: string;

  @ApiProperty({ example: '2025-05-01T08:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: ['presencial', 'online'], default: 'presencial' })
  @IsOptional()
  @IsIn(['presencial', 'online'])
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  meetLink?: string;
}
