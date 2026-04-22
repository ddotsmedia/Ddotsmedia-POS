import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async getPromotions(tenantId: string, activeOnly = false, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const where: any = {
      tenantId,
      ...(activeOnly && {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      }),
    };
    const [promotions, total] = await Promise.all([
      this.prisma.promotion.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.promotion.count({ where }),
    ]);
    return { data: promotions, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async validatePromoCode(tenantId: string, code: string, orderAmount: number) {
    const now = new Date();
    const promo = await this.prisma.promotion.findUnique({ where: { tenantId_code: { tenantId, code } } });

    if (!promo) throw new NotFoundException('Promotion code not found');
    if (!promo.isActive) throw new BadRequestException('Promotion is inactive');
    if (promo.startsAt > now) throw new BadRequestException('Promotion has not started yet');
    if (promo.expiresAt && promo.expiresAt < now) throw new BadRequestException('Promotion has expired');
    if (promo.maxUses && promo.usedCount >= promo.maxUses) throw new BadRequestException('Promotion usage limit reached');
    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
      throw new BadRequestException(`Minimum order amount is ${promo.minOrderAmount}`);
    }

    let discountAmount = 0;
    if (promo.type === 'PERCENTAGE') {
      discountAmount = (orderAmount * promo.value) / 100;
    } else if (promo.type === 'FIXED') {
      discountAmount = Math.min(promo.value, orderAmount);
    } else if (promo.type === 'BUY_X_GET_Y') {
      discountAmount = promo.value;
    }

    return { valid: true, promotion: promo, discountAmount };
  }

  async applyPromoCode(tenantId: string, code: string) {
    const promo = await this.prisma.promotion.findUnique({ where: { tenantId_code: { tenantId, code } } });
    if (!promo) throw new NotFoundException('Promotion not found');
    return this.prisma.promotion.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
  }

  async createPromotion(data: any, tenantId: string, createdBy: string) {
    return this.prisma.promotion.create({
      data: {
        ...data,
        tenantId,
        createdBy,
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async updatePromotion(id: string, data: any) {
    return this.prisma.promotion.update({ where: { id }, data });
  }

  async togglePromotion(id: string) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promotion not found');
    return this.prisma.promotion.update({ where: { id }, data: { isActive: !promo.isActive } });
  }

  async deletePromotion(id: string) {
    return this.prisma.promotion.delete({ where: { id } });
  }
}
