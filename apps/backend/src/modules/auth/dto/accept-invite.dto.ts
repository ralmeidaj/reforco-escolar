import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
