import { IsString, IsInt, IsOptional, IsBoolean, IsUUID, Min, Max, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateAvailabilitySlotDto {
  @ApiProperty({ description: 'ID do professor' })
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({ description: '0=Dom 1=Seg ... 6=Sab', minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiProperty({ example: '08:00' })
  @Matches(TIME_REGEX, { message: 'startTime deve ser HH:mm' })
  startTime: string;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_REGEX, { message: 'endTime deve ser HH:mm' })
  endTime: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Data específica para slot avulso (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  specificDate?: string;
}
