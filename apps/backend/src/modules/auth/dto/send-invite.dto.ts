import { IsEmail, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendInviteDto {
  @ApiProperty({ example: 'professor@escola.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['teacher', 'student', 'guardian'] })
  @IsIn(['teacher', 'student', 'guardian'])
  role: string;
}
