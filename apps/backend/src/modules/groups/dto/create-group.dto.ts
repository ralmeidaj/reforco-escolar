import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: '5º Ano' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'fundamental', enum: ['infantil', 'fundamental', 'medio'] })
  @IsOptional()
  @IsString()
  level?: string;
}
