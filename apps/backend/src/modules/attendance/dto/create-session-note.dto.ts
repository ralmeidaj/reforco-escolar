import { IsUUID, IsString, MinLength } from 'class-validator';

export class CreateSessionNoteDto {
  @IsUUID() sessionId: string;
  @IsString() @MinLength(1) content: string;
}
