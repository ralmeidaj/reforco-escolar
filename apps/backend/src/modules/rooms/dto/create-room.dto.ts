import { IsString, IsInt, IsOptional, IsUUID, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ example: 'Sala 01' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'ID do grupo fixo alocado nesta sala' })
  @IsOptional()
  @IsUUID()
  fixedGroupId?: string;
}
