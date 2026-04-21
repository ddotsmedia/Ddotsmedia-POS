import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async getBranches(tenantId: string) {
    return this.prisma.branch.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async createBranch(data: any, tenantId: string) {
    return this.prisma.branch.create({ data: { ...data, tenantId } });
  }

  async updateBranch(id: string, data: any) {
    return this.prisma.branch.update({ where: { id }, data });
  }
}
