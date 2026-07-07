import { IsUUID, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateProgressDto {
  @IsUUID() studentId: string;
  @IsUUID() subjectId: string;
  @IsIn(['iniciante', 'basico', 'intermediario', 'avancado']) level: string;
  @IsOptional() @IsString() notes?: string;
}
