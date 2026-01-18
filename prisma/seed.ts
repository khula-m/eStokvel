import { PrismaClient, UserRole, MemberRole, TransactionType, PaymentMethod, TransactionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function main() {
  console.log("?? Starting seed...");

  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.member.deleteMany();
  await prisma.stokvelGroup.deleteMany();
  await prisma.user.deleteMany();

  // ========== CREATE USERS ==========
  console.log("?? Creating users...");

  const users = await prisma.user.createMany({
    data: [
      {
        phoneNumber: "27831234567",
        email: "john@example.com",
        fullName: "John Doe",
        idNumber: "8001015009087",
        passwordHash: await hashPassword("password123"),
        language: "en",
        role: UserRole.TREASURER,
      },
      {
        phoneNumber: "27831234568",
        email: "jane@example.com",
        fullName: "Jane Smith",
        idNumber: "8502026008087",
        passwordHash: await hashPassword("password123"),
        language: "en",
        role: UserRole.SECRETARY,
      },
      {
        phoneNumber: "27831234569",
        email: "bob@example.com",
        fullName: "Bob Johnson",
        idNumber: "9003037007087",
        passwordHash: await hashPassword("password123"),
        language: "en",
        role: UserRole.MEMBER,
      },
      {
        phoneNumber: "27831234570",
        email: "alice@example.com",
        fullName: "Alice Williams",
        idNumber: "9504048006087",
        passwordHash: await hashPassword("password123"),
        language: "en",
        role: UserRole.CHAIRPERSON,
      },
      {
        phoneNumber: "27831234571",
        email: "charlie@example.com",
        fullName: "Charlie Brown",
        idNumber: "8705059005087",
        passwordHash: await hashPassword("password123"),
        language: "en",
        role: UserRole.MEMBER,
      },
      {
        phoneNumber: "27831234572",
        email: "diana@example.com",
        fullName: "Diana Prince",
        idNumber: "9206061234087",
        passwordHash: await hashPassword("password123"),
        language: "en",
        role: UserRole.MEMBER,
      },
    ],
  });

  console.log(`? Created ${users.count} users`);

  // ========== CREATE STOKVEL GROUP ==========
  console.log("?? Creating stokvel group...");

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
      createdById: (await prisma.user.findFirst({ where: { phoneNumber: "27831234567" } }))!.id,
    },
  });

  console.log(`? Created group: ${group.name} (${group.code})`);

  // ========== ADD MEMBERS TO GROUP ==========
  console.log("?? Adding members to group...");

  const allUsers = await prisma.user.findMany();
  const groupId = group.id;

  const membersData = allUsers.map((user, index) => ({
    userId: user.id,
    stokvelGroupId: groupId,
    role: index === 0 ? MemberRole.TREASURER : 
          index === 1 ? MemberRole.SECRETARY : 
          index === 3 ? MemberRole.CHAIRPERSON : 
          MemberRole.MEMBER,
    joinedAt: new Date(),
  }));

  const members = await prisma.member.createMany({
    data: membersData,
  });

  console.log(`? Added ${members.count} members to the group`);

  // ========== CREATE SAMPLE TRANSACTIONS ==========
  console.log("?? Creating sample transactions...");

  const groupMembers = await prisma.member.findMany({
    where: { stokvelGroupId: groupId },
    include: { user: true },
  });

  const transactions = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6); // Go back 6 months

  for (let i = 0; i < 15; i++) {
    const member = groupMembers[i % groupMembers.length];
    const transactionDate = new Date(startDate);
    transactionDate.setDate(transactionDate.getDate() + i * 14); // Every 2 weeks

    transactions.push({
      stokvelGroupId: groupId,
      memberId: member.id,
      transactionType: i % 3 === 0 ? TransactionType.CONTRIBUTION : 
                     i % 5 === 0 ? TransactionType.LOAN_DISBURSEMENT :
                     i % 7 === 0 ? TransactionType.LOAN_REPAYMENT : 
                     TransactionType.CONTRIBUTION,
      amount: i % 3 === 0 ? 1000 : 
             i % 5 === 0 ? 5000 :
             i % 7 === 0 ? 1500 : 1000,
      currency: "ZAR",
      referenceNumber: `REF-${Date.now()}-${i}`,
      paymentMethod: i % 2 === 0 ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER,
      transactionDate: transactionDate,
      recordedById: (await prisma.user.findFirst({ where: { phoneNumber: "27831234567" } }))!.id,
      status: i > 10 ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      notes: i % 3 === 0 ? "Monthly contribution" : 
            i % 5 === 0 ? "Business loan disbursement" :
            i % 7 === 0 ? "Loan repayment installment" : "Contribution",
    });
  }

  const createdTransactions = await prisma.transaction.createMany({
    data: transactions,
  });

  console.log(`? Created ${createdTransactions.count} sample transactions`);

  // ========== SUMMARY ==========
  console.log("\n?? Seed completed successfully!");
  console.log("?? Summary:");
  console.log(`   ?? Users: ${users.count}`);
  console.log(`   ?? Groups: 1`);
  console.log(`   ?? Members: ${members.count}`);
  console.log(`   ?? Transactions: ${createdTransactions.count}`);
}

main()
  .catch((e) => {
    console.error("? Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
