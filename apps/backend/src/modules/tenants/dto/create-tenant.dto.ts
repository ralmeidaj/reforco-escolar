import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'escola-silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug deve conter apenas letras minúsculas, números e hífens' })
  slug: string;

  @ApiProperty({ example: 'Escola Silva de Reforços' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
