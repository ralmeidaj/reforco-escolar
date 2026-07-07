import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSessionStatusDto {
  @ApiProperty({ enum: ['agendada', 'confirmada', 'realizada', 'cancelada'] })
  @IsIn(['agendada', 'confirmada', 'realizada', 'cancelada'])
  status: string;

  @ApiPropertyOptional({ description: 'Motivo (obrigatório ao cancelar)' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
