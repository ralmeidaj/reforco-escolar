import { IsUUID, IsString, IsOptional, IsInt, Min, IsDateString, MinLength, MaxLength } from 'class-validator';

export class CreateStudyLogDto {
  @IsOptional() @IsUUID() sessionId?: string;
  @IsUUID() subjectId: string;
  @IsString() @MinLength(1) @MaxLength(300) topic: string;
  @IsOptional() @IsInt() @Min(0) pagesRead?: number;
  @IsDateString() studiedAt: string;
}
