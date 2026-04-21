import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @IsString() productId: string;
  @IsOptional() @IsString() variantId?: string;
  @IsNumber() quantity: number;
  @IsOptional() @IsNumber() unitPrice?: number;
  @IsOptional() @IsNumber() discount?: number;
  @IsOptional() @IsNumber() taxRate?: number;
}

export class PaymentDto {
  @IsString() method: string;
  @IsNumber() amount: number;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsNumber() cashGiven?: number;
  @IsOptional() @IsNumber() changeDue?: number;
  @IsOptional() @IsNumber() pointsUsed?: number;
}

export class CreateSaleDto {
  @IsOptional() @IsString() tenantId?: string;
  @IsString() branchId: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsNumber() discountAmount?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isOffline?: boolean;
  @IsOptional() @IsString() offlineCreatedAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];
}
