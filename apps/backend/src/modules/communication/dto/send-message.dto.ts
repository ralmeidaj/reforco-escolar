import { IsUUID, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID() toId: string;
  @IsString() @MinLength(1) content: string;
}
