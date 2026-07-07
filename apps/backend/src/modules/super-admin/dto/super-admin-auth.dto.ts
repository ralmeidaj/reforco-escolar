import { IsEmail, IsString, MinLength, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuperAdminLoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
}

export class SuperAdminVerifyTotpDto {
  @ApiProperty() @IsString() @Length(6, 6) token: string;
  @ApiProperty() @IsString() tempToken: string;
}

export class SuperAdminSetupTotpDto {
  @ApiProperty() @IsString() @Length(6, 6) token: string;
}

export class SuperAdminChangePasswordDto {
  @ApiProperty() @IsString() @MinLength(8) currentPassword: string;
  @ApiProperty() @IsString() @MinLength(8) newPassword: string;
}
