import { IsString, IsArray, IsIn, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsString() @MinLength(1) content: string;
  @IsOptional()
  @IsArray()
  @IsIn(['teacher', 'student', 'guardian', 'tenant_admin'], { each: true })
  targetRoles?: string[];
}
