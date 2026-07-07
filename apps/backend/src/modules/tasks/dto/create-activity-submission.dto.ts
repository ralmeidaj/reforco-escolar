import { IsUUID, IsString, IsOptional } from 'class-validator';

export class CreateActivitySubmissionDto {
  @IsUUID() taskId: string;
  @IsOptional() @IsString() comment?: string;
}
