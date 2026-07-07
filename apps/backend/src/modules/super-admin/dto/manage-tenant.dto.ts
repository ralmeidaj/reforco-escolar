import { IsString, IsOptional, IsIn, IsUUID, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantStatusDto {
  @ApiProperty({ enum: ['active', 'suspended', 'deleted'] })
  @IsString()
  @IsIn(['active', 'suspended', 'deleted'])
  status: string;
}

export class AssignSaasPlanDto {
  @ApiProperty() @IsUUID() planId: string;
}

export class CreateSaasPlanDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: ['free', 'pro', 'enterprise'] }) @IsIn(['free', 'pro', 'enterprise']) type: string;
  @ApiPropertyOptional() @IsOptional() priceMonthly?: number;
  @ApiPropertyOptional() @IsOptional() maxStudents?: number;
  @ApiPropertyOptional() @IsOptional() maxTeachers?: number;
}

export class UpdateSaasPlanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ enum: ['free', 'pro', 'enterprise'] }) @IsOptional() @IsIn(['free', 'pro', 'enterprise']) type?: string;
  @ApiPropertyOptional() @IsOptional() priceMonthly?: number;
  @ApiPropertyOptional() @IsOptional() maxStudents?: number;
  @ApiPropertyOptional() @IsOptional() maxTeachers?: number;
}

export class CreateTenantByAdminDto {
  @ApiProperty({ example: 'Reforço Silva' }) @IsString() name: string;
  @ApiProperty({ example: 'reforco-silva' }) @IsString() slug: string;
  @ApiProperty({ example: 'responsavel@reforco.com' }) @IsEmail() adminEmail: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) adminPassword: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Reforço Silva' }) @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ example: 'reforco-silva' }) @IsOptional() @IsString() slug?: string;
  @ApiPropertyOptional({ example: 'novo@email.com' }) @IsOptional() @IsEmail() adminEmail?: string;
  @ApiPropertyOptional({ minLength: 8 }) @IsOptional() @IsString() @MinLength(8) adminPassword?: string;
}
