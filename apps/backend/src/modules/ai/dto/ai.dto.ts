import { IsUUID, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateActivityDto {
  @ApiProperty() @IsUUID() subjectId: string;
  @ApiPropertyOptional({ enum: ['quiz', 'exercicio', 'desafio'] })
  @IsOptional()
  @IsIn(['quiz', 'exercicio', 'desafio'])
  type?: 'quiz' | 'exercicio' | 'desafio';
}

export class ReviewSuggestionDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';
}
