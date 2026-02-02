import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Create first restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Restooo Main',
      email: 'contact@restooo.com',
      phone: '+20-123-456-7890',
      address: 'Cairo, Egypt',
    },
  });

  console.log('✅ Restaurant created:', restaurant.name);

  // Create first admin employee
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  
  const admin = await prisma.employee.create({
    data: {
      email: 'admin@restooo.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      phone: '+20-100-000-0001',
      restaurantId: restaurant.id,
    },
  });

  console.log('✅ Admin employee created:');
  console.log('   Email:', admin.email);
  console.log('   Password: Admin123!');
  console.log('   ⚠️  Change this password after first login!\n');

  // Create sample menu items
  const menuItems = await prisma.menuItem.createMany({
    data: [
      {
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato, mozzarella, and basil',
        category: 'MAIN_COURSE',
        price: 89.99,
        available: true,
        prepTimeMinutes: 20,
        allergens: ['dairy', 'gluten'],
        restaurantId: restaurant.id,
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh romaine with parmesan and croutons',
        category: 'APPETIZER',
        price: 45.50,
        available: true,
        prepTimeMinutes: 10,
        allergens: ['dairy', 'eggs'],
        restaurantId: restaurant.id,
      },
      {
        name: 'Tiramisu',
        description: 'Classic Italian dessert',
        category: 'DESSERT',
        price: 55.00,
        available: true,
        prepTimeMinutes: 5,
        allergens: ['dairy', 'eggs', 'gluten'],
        restaurantId: restaurant.id,
      },
      {
        name: 'Fresh Orange Juice',
        description: 'Freshly squeezed orange juice',
        category: 'BEVERAGE',
        price: 25.00,
        available: true,
        prepTimeMinutes: 5,
        allergens: [],
        restaurantId: restaurant.id,
      },
    ],
  });

  console.log(`✅ Created ${menuItems.count} menu items`);

  // Create sample tables
  const tables = await prisma.table.createMany({
    data: [
      { number: 1, capacity: 2, status: 'AVAILABLE', location: 'Main Floor', restaurantId: restaurant.id },
      { number: 2, capacity: 4, status: 'AVAILABLE', location: 'Main Floor', restaurantId: restaurant.id },
      { number: 3, capacity: 6, status: 'AVAILABLE', location: 'Patio', restaurantId: restaurant.id },
      { number: 4, capacity: 8, status: 'AVAILABLE', location: 'Private Room', restaurantId: restaurant.id },
    ],
  });

  console.log(`✅ Created ${tables.count} tables\n`);
  
  console.log('🎉 Database seeded successfully!\n');
  console.log('📝 Admin Login Credentials:');
  console.log('   Email: admin@restooo.com');
  console.log('   Password: Admin123!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });