import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength, IsIn } from 'class-validator';

const ALLOWED_ROLES = ['tenant_admin', 'teacher', 'student', 'guardian'] as const;

export class SignupDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'joao@escola.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senhaSegura123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: ALLOWED_ROLES })
  @IsIn(ALLOWED_ROLES)
  role: string;
}
