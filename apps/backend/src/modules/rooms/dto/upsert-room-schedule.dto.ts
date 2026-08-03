import { IsInt, Min, Max, IsIn, IsUUID, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertRoomScheduleDto {
  @ApiProperty({ description: '0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb' })
  @IsInt() @Min(0) @Max(6)
  dayOfWeek: number;

  @ApiProperty({ enum: ['manhã', 'tarde', 'noite'] })
  @IsIn(['manhã', 'tarde', 'noite'])
  shift: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  subjectId?: string;

  @ApiProperty({ type: [String] })
  @IsArray() @IsUUID('4', { each: true })
  teacherIds: string[];
}
