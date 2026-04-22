import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class GiftCardsService {
  constructor(private prisma: PrismaService) {}

  private generateCode(): string {
    return randomBytes(4).toString('hex').toUpperCase().match(/.{4}/g)!.join('-');
  }

  async getGiftCards(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { tenantId };
    const [cards, total] = await Promise.all([
      this.prisma.giftCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { transactions: { orderBy: { createdAt: 'desc' }, take: 5 } },
      }),
      this.prisma.giftCard.count({ where }),
    ]);
    return { data: cards, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getGiftCard(id: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: { id },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!card) throw new NotFoundException('Gift card not found');
    return card;
  }

  async lookupByCode(tenantId: string, code: string) {
    const card = await this.prisma.giftCard.findUnique({ where: { tenantId_code: { tenantId, code } } });
    if (!card) throw new NotFoundException('Gift card not found');
    if (!card.isActive) throw new BadRequestException('Gift card is inactive');
    if (card.expiresAt && card.expiresAt < new Date()) throw new BadRequestException('Gift card has expired');
    return card;
  }

  async createGiftCard(data: any, tenantId: string, createdBy: string) {
    const code = data.code || this.generateCode();
    return this.prisma.giftCard.create({
      data: {
        tenantId,
        code,
        initialValue: data.initialValue,
        balance: data.initialValue,
        issuedTo: data.issuedTo,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy,
      },
    });
  }

  async topUp(id: string, amount: number, note: string, createdBy: string) {
    const card = await this.prisma.giftCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Gift card not found');

    const balanceBefore = card.balance;
    const balanceAfter = balanceBefore + amount;

    await this.prisma.$transaction([
      this.prisma.giftCard.update({ where: { id }, data: { balance: balanceAfter } }),
      this.prisma.giftCardTransaction.create({
        data: { giftCardId: id, type: 'TOP_UP', amount, balanceBefore, balanceAfter, note, createdBy },
      }),
    ]);
    return { success: true, newBalance: balanceAfter };
  }

  async redeem(id: string, amount: number, saleId: string, createdBy: string) {
    const card = await this.prisma.giftCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Gift card not found');
    if (!card.isActive) throw new BadRequestException('Gift card is inactive');
    if (card.balance < amount) throw new BadRequestException('Insufficient gift card balance');

    const balanceBefore = card.balance;
    const balanceAfter = balanceBefore - amount;

    await this.prisma.$transaction([
      this.prisma.giftCard.update({ where: { id }, data: { balance: balanceAfter } }),
      this.prisma.giftCardTransaction.create({
        data: { giftCardId: id, type: 'REDEMPTION', amount: -amount, balanceBefore, balanceAfter, saleId, createdBy },
      }),
    ]);
    return { success: true, newBalance: balanceAfter };
  }

  async deactivate(id: string) {
    return this.prisma.giftCard.update({ where: { id }, data: { isActive: false } });
  }
}
