import { PrismaClient, MemberRole, TransactionType, PaymentMethod, TransactionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPin(pin: string): Promise<string> {
  return await bcrypt.hash(pin, 10);
}

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.member.deleteMany();
  await prisma.stokvelGroup.deleteMany();
  await prisma.user.deleteMany();

  // ========== CREATE SUPERADMIN ==========
  console.log("👑 Creating SUPERADMIN...");

  const superadmin = await prisma.user.create({
    data: {
      phoneNumber: "0800000000",
      fullName: "System Admin",
      email: "admin@estokvel.co.za",
      password: await hashPassword("Admin@2026!"),
      pin: null, // Superadmin uses password, not PIN
      role: "SUPERADMIN",
      mustChangePin: false,
      isVerified: true,
      language: "en",
    },
  });

  console.log(`✅ SUPERADMIN: ${superadmin.fullName} (${superadmin.email}) Password: Admin@2026!`);

  // ========== CREATE ADMIN ==========
  console.log("📝 Creating ADMIN...");

  const admin = await prisma.user.create({
    data: {
      phoneNumber: "0831234567",
      fullName: "John Doe",
      email: "john@example.com",
      idNumber: "8001015009087",
      pin: await hashPin("56789"),
      role: "ADMIN",
      mustChangePin: true,
      isVerified: true,
      language: "en",
      createdById: superadmin.id,
    },
  });

  console.log(`✅ ADMIN: ${admin.fullName} (${admin.phoneNumber}) PIN: 56789`);

  // ========== CREATE MEMBERS ==========
  console.log("📝 Creating MEMBER users...");

  const memberData = [
    { phoneNumber: "0831234568", fullName: "Jane Smith", email: "jane@example.com", idNumber: "8502026008087" },
    { phoneNumber: "0831234569", fullName: "Bob Johnson", email: "bob@example.com", idNumber: "9003037007087" },
    { phoneNumber: "0831234570", fullName: "Alice Williams", email: "alice@example.com", idNumber: "9504048006087" },
    { phoneNumber: "0831234571", fullName: "Charlie Brown", email: "charlie@example.com", idNumber: "8705059005087" },
    { phoneNumber: "0831234572", fullName: "Diana Prince", email: "diana@example.com", idNumber: "9206061234087" },
  ];

  const members: any[] = [];
  for (const m of memberData) {
    const user = await prisma.user.create({
      data: {
        ...m,
        pin: await hashPin("94716"),
        role: "MEMBER",
        mustChangePin: true,
        isVerified: true,
        language: "en",
        createdById: admin.id,
      },
    });
    members.push(user);
  }

  console.log(`✅ Created ${members.length} member users`);

  // ========== CREATE STOKVEL GROUP ==========
  console.log("🏦 Creating stokvel group...");

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 12);

  const group = await prisma.stokvelGroup.create({
    data: {
      name: "Mabogo Dinku Investment Club",
      code: "MDIC2024",
      description: "A community investment club focused on property and small businesses",
      contributionAmount: 1000,
      contributionFrequency: "MONTHLY",
      currency: "ZAR",
      meetingSchedule: "First Saturday of every month at 10 AM",
      isActive: true,
      durationMonths: 12,
      startDate: startDate,
      endDate: endDate,
      createdById: admin.id,
      adminId: admin.id,
    },
  });

  console.log(`✅ Created group: ${group.name} (${group.code})`);

  // ========== ADD MEMBERS TO GROUP ==========
  console.log("👥 Adding members to group...");

  // Add admin as ADMIN member
  await prisma.member.create({
    data: {
      userId: admin.id,
      stokvelGroupId: group.id,
      role: MemberRole.ADMIN,
      joinedAt: new Date(),
    },
  });

  // Add all members as MEMBER
  for (const member of members) {
    await prisma.member.create({
      data: {
        userId: member.id,
        stokvelGroupId: group.id,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
      },
    });
  }

  console.log(`✅ Added ${members.length + 1} members to the group`);

  // ========== CREATE SAMPLE TRANSACTIONS ==========
  console.log("💰 Creating sample transactions...");

  const allGroupMembers = await prisma.member.findMany({
    where: { stokvelGroupId: group.id },
  });

  const transactions = [];
  const txStartDate = new Date();
  txStartDate.setMonth(txStartDate.getMonth() - 6);

  for (let i = 0; i < 15; i++) {
    const member = allGroupMembers[i % allGroupMembers.length];
    const transactionDate = new Date(txStartDate);
    transactionDate.setDate(transactionDate.getDate() + i * 14);

    transactions.push({
      stokvelGroupId: group.id,
      memberId: member.id,
      transactionType: i % 5 === 0 ? TransactionType.PAYOUT : TransactionType.CONTRIBUTION,
      amount: i % 5 === 0 ? 5000 : 1000,
      currency: "ZAR",
      referenceNumber: `REF-${Date.now()}-${i}`,
      paymentMethod: i % 2 === 0 ? PaymentMethod.EFT : PaymentMethod.BANK_TRANSFER,
      transactionDate: transactionDate,
      recordedById: admin.id,
      status: i > 10 ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      notes: i % 5 === 0 ? "Group payout" : "Monthly contribution",
    });
  }

  const createdTransactions = await prisma.transaction.createMany({
    data: transactions,
  });

  console.log(`✅ Created ${createdTransactions.count} sample transactions`);

  // ========== SUMMARY ==========
  console.log("\n🎉 Seed completed successfully!");
  console.log("📊 Summary:");
  console.log(`   👑 SUPERADMIN: admin@estokvel.co.za / Password: Admin@2026!`);
  console.log(`   🏛️  ADMIN: 0831234567 / PIN: 56789`);
  console.log(`   👥 MEMBERS: 5 users / PIN: 94716 (must change)`);
  console.log(`   🏦 Groups: 1`);
  console.log(`   💰 Transactions: ${createdTransactions.count}`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
