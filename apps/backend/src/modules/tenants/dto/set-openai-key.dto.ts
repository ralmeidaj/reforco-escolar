import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class SetOpenAiKeyDto {
  @ApiProperty({ example: 'sk-...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(300)
  apiKey: string;
}
