import { IsIn, IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional() @IsIn(['pendente', 'pago', 'cancelado']) status?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() externalRef?: string;
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @IsString() notes?: string;
}
