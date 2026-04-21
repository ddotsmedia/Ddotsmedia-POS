import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

const USER_SELECT = {
  id: true, tenantId: true, branchId: true,
  name: true, email: true, role: true, isActive: true,
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string, tenantId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, ...(tenantId && { tenantId }), isActive: true },
      select: { ...USER_SELECT, passwordHash: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.tenantId, user.role);
    const { passwordHash: _, ...safeUser } = user;
    return { ...tokens, user: safeUser };
  }

  async loginWithPin(pin: string, branchId: string) {
    const user = await this.prisma.user.findFirst({
      where: { pin, branchId, isActive: true },
      select: USER_SELECT,
    });

    if (!user) throw new UnauthorizedException('Invalid PIN');

    const tokens = await this.generateTokens(user.id, user.tenantId, user.role);
    return { ...tokens, user };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: USER_SELECT } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokens = await this.generateTokens(stored.userId, stored.user.tenantId, stored.user.role);
    return { ...tokens, user: stored.user };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  private async generateTokens(userId: string, tenantId: string, role: string) {
    const payload = { sub: userId, tenantId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      }),
    ]);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
