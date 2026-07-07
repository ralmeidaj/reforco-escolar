import { IsUUID, IsNumber, IsIn, IsOptional, IsString, IsDateString, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID() studentId: string;
  @IsOptional() @IsUUID() studentPlanId?: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsIn(['pendente', 'pago', 'cancelado']) status?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() externalRef?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() notes?: string;
}
