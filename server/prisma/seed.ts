import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'my-store' },
    update: {},
    create: {
      name: 'My Store',
      slug: 'my-store',
      currency: 'AED',
      taxRate: 5.0,
      taxLabel: 'VAT',
      timezone: 'Asia/Dubai',
    },
  });
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  // Branch
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-main' },
    update: {},
    create: {
      id: 'branch-main',
      tenantId: tenant.id,
      name: 'Main Branch',
      address: 'Dubai, UAE',
      phone: '+971-4-000-0000',
    },
  });
  console.log(`Branch: ${branch.name}`);

  // Admin User
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@mystore.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Admin User',
      email: 'admin@mystore.com',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'ADMIN',
      pin: '1234',
    },
  });
  console.log(`Admin: ${admin.email} / admin123 (PIN: 1234)`);

  // Manager
  const manager = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'manager@mystore.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Store Manager',
      email: 'manager@mystore.com',
      passwordHash: await bcrypt.hash('manager123', 12),
      role: 'MANAGER',
      pin: '5678',
    },
  });
  console.log(`Manager: ${manager.email} / manager123 (PIN: 5678)`);

  // Cashier
  const cashier = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'cashier@mystore.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'John Cashier',
      email: 'cashier@mystore.com',
      passwordHash: await bcrypt.hash('cashier123', 12),
      role: 'CASHIER',
      pin: '9999',
    },
  });
  console.log(`Cashier: ${cashier.email} / cashier123 (PIN: 9999)`);

  // Categories
  const electronics = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'electronics' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Electronics', slug: 'electronics', icon: '📱', color: '#3B82F6' },
  });
  const food = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'food-beverages' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Food & Beverages', slug: 'food-beverages', icon: '🥤', color: '#10B981' },
  });
  const clothing = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'clothing' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Clothing', slug: 'clothing', icon: '👕', color: '#8B5CF6' },
  });
  console.log('Categories created');

  // Products
  const products = [
    { name: 'USB-C Cable 1m', barcode: '6001234567890', sku: 'USB-C-1M', sellingPrice: 25, costPrice: 10, categoryId: electronics.id, slug: 'usb-c-cable-1m' },
    { name: 'Wireless Earbuds', barcode: '6001234567891', sku: 'WEB-001', sellingPrice: 149, costPrice: 55, categoryId: electronics.id, slug: 'wireless-earbuds' },
    { name: 'Phone Case (iPhone)', barcode: '6001234567892', sku: 'PHC-IP-001', sellingPrice: 45, costPrice: 12, categoryId: electronics.id, slug: 'phone-case-iphone' },
    { name: 'Screen Protector', barcode: '6001234567893', sku: 'SPR-001', sellingPrice: 20, costPrice: 4, categoryId: electronics.id, slug: 'screen-protector' },
    { name: 'Mineral Water 500ml', barcode: '6001234567894', sku: 'WAT-500', sellingPrice: 3, costPrice: 1, categoryId: food.id, slug: 'mineral-water-500ml' },
    { name: 'Orange Juice 1L', barcode: '6001234567895', sku: 'OJC-1L', sellingPrice: 12, costPrice: 5, categoryId: food.id, slug: 'orange-juice-1l' },
    { name: 'Chocolate Bar', barcode: '6001234567896', sku: 'CHO-001', sellingPrice: 8, costPrice: 3, categoryId: food.id, slug: 'chocolate-bar' },
    { name: 'T-Shirt (M)', barcode: '6001234567897', sku: 'TSH-M', sellingPrice: 85, costPrice: 30, categoryId: clothing.id, slug: 't-shirt-m' },
    { name: 'Jeans (32)', barcode: '6001234567898', sku: 'JNS-32', sellingPrice: 220, costPrice: 80, categoryId: clothing.id, slug: 'jeans-32' },
    { name: 'Sunglasses', barcode: '6001234567899', sku: 'SNG-001', sellingPrice: 120, costPrice: 35, categoryId: clothing.id, slug: 'sunglasses' },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: {},
      create: { tenantId: tenant.id, ...p, taxIncluded: true, trackInventory: true, minStockAlert: 10 },
    });

    // Set initial inventory (use findFirst + create to handle null variantId)
    const existingInv = await prisma.inventory.findFirst({
      where: { productId: product.id, branchId: branch.id, variantId: null },
    });
    if (!existingInv) {
      await prisma.inventory.create({
        data: { productId: product.id, branchId: branch.id, quantity: 100, reservedQty: 0 },
      });
    }
  }
  console.log(`${products.length} products + inventory created`);

  // Sample Customer
  await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: '+971501234567' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Ahmed Al Rashid',
      email: 'ahmed@example.com',
      phone: '+971501234567',
      loyaltyPoints: 250,
      totalSpent: 2500,
      visitCount: 12,
    },
  });
  console.log('Sample customer created');

  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Tenant ID  : ${tenant.id}`);
  console.log(`Branch ID  : ${branch.id}`);
  console.log('Admin      : admin@mystore.com / admin123');
  console.log('Manager    : manager@mystore.com / manager123');
  console.log('Cashier    : cashier@mystore.com / cashier123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
