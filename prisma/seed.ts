import { PrismaClient, MemberRole, TransactionType, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

console.log("?? STARTING SEED SCRIPT - WILL CLEAR EXISTING DATA FIRST");

const prisma = new PrismaClient({
  log: ['error', 'warn']
});

async function main() {
  console.log("?? Seeding eStokvel database...");
  
  try {
    // CLEAR EXISTING DATA FIRST
    console.log("0. Clearing existing data...");
    await prisma.transaction.deleteMany();
    await prisma.member.deleteMany();
    await prisma.stokvelGroup.deleteMany();
    await prisma.user.deleteMany();
    console.log("? Cleared existing data");
    
    // Hash password for all users
    console.log("1. Hashing password...");
    const hashedPassword = await bcrypt.hash("password123", 10);
    console.log("? Password hashed");
    
    // 1. Create treasurer (Thandi Molefe)
    console.log("2. Creating treasurer...");
    const treasurer = await prisma.user.create({
      data: {
        phoneNumber: "27831234567",
        email: "thandi.molefe@example.com",
        fullName: "Thandi Molefe",
        idNumber: "8501015089089",
        passwordHash: hashedPassword,
        language: "en"
      }
    });
    console.log("? Treasurer created: Thandi Molefe");
    
    // 2. Create stokvel group
    console.log("3. Creating stokvel group...");
    const group = await prisma.stokvelGroup.create({
      data: {
        name: "Mothers of Soweto Savings",
        code: "MOS2024",
        description: "Monthly savings group for mothers in Soweto community",
        contributionAmount: 500,
        contributionFrequency: "MONTHLY",
        currency: "ZAR",
        meetingSchedule: "Every 1st Saturday at 2 PM, Community Hall",
        payoutDate: new Date("2024-12-20"),
        createdById: treasurer.id
      }
    });
    console.log("? Stokvel group created: Mothers of Soweto Savings");
    
    // 3. Add treasurer as member
    console.log("4. Adding treasurer as member...");
    await prisma.member.create({
      data: {
        userId: treasurer.id,
        stokvelGroupId: group.id,
        role: MemberRole.TREASURER
      }
    });
    console.log("? Treasurer added as TREASURER member");
    
    // 4. Create additional members with proper enum types
    console.log("5. Creating additional members...");
    const membersData: Array<{phone: string, name: string, role: MemberRole}> = [
      { phone: "27832223344", name: "Nomsa Dlamini", role: MemberRole.SECRETARY },
      { phone: "27833334455", name: "Lerato Mohale", role: MemberRole.CHAIRPERSON },
      { phone: "27834445566", name: "Sipho Nkosi", role: MemberRole.MEMBER },
      { phone: "27835556677", name: "Zanele Ndlovu", role: MemberRole.MEMBER },
      { phone: "27836667788", name: "Bongani Zulu", role: MemberRole.MEMBER }
    ];
    
    for (const memberData of membersData) {
      console.log(`   Creating ${memberData.name}...`);
      const user = await prisma.user.create({
        data: {
          phoneNumber: memberData.phone,
          fullName: memberData.name,
          passwordHash: hashedPassword,
          language: "en"
        }
      });
      
      await prisma.member.create({
        data: {
          userId: user.id,
          stokvelGroupId: group.id,
          role: memberData.role
        }
      });
      console.log(`   ? ${memberData.name} added as ${memberData.role}`);
    }
    
    // 5. Create sample transactions with proper enum types
    console.log("6. Creating sample transactions...");
    const allMembers = await prisma.member.findMany({
      where: { stokvelGroupId: group.id }
    });
    
    console.log(`   Found ${allMembers.length} members for transactions`);
    
    const now = new Date();
    const paymentMethods: PaymentMethod[] = [PaymentMethod.CASH, PaymentMethod.MOBILE_MONEY, PaymentMethod.BANK_TRANSFER];
    
    // Create 15 sample transactions
    for (let i = 0; i < 15; i++) {
      const member = allMembers[i % allMembers.length];
      const monthOffset = Math.floor(i / 5);
      const transactionDate = new Date(now);
      transactionDate.setMonth(transactionDate.getMonth() - monthOffset);
      
      let transactionType: TransactionType = TransactionType.CONTRIBUTION;
      let amount = 500;
      let notes = "Monthly contribution";
      
      if (i === 3) {
        transactionType = TransactionType.FINE_PAYMENT;
        amount = 50;
        notes = "Late payment fine";
      } else if (i === 8) {
        transactionType = TransactionType.INTEREST;
        amount = 125;
        notes = "Monthly interest earned";
      }
      
      await prisma.transaction.create({
        data: {
          stokvelGroupId: group.id,
          memberId: member.id,
          transactionType,
          amount,
          currency: "ZAR",
          referenceNumber: `REF-${Date.now()}-${i}`,
          paymentMethod: paymentMethods[i % paymentMethods.length],
          transactionDate,
          recordDate: new Date(),
          recordedById: treasurer.id,
          status: "COMPLETED",
          notes: `${notes} - ${transactionDate.toLocaleString("default", { month: "long", year: "numeric" })}`
        }
      });
      
      if (i % 5 === 0) {
        console.log(`   Created ${i + 1} transactions...`);
      }
    }
    console.log("? 15 sample transactions created");
    
    // 6. Display summary
    console.log("7. Generating summary...");
    const [userCount, groupCount, memberCount, transactionCount] = await prisma.$transaction([
      prisma.user.count(),
      prisma.stokvelGroup.count(),
      prisma.member.count(),
      prisma.transaction.count()
    ]);
    
    console.log("\n" + "=".repeat(60));
    console.log("?? SEEDING COMPLETE!");
    console.log("=".repeat(60));
    console.log("\n?? DATABASE SUMMARY:");
    console.log(`   ?? Users: ${userCount}`);
    console.log(`   ?? Stokvel Groups: ${groupCount}`);
    console.log(`   ?? Members: ${memberCount}`);
    console.log(`   ?? Transactions: ${transactionCount}`);
    
    console.log("\n?? TEST CREDENTIALS:");
    console.log(`   Phone: 27831234567`);
    console.log(`   Password: password123`);
    console.log(`   Role: TREASURER`);
    
    console.log("\n?? ADDITIONAL TEST USERS:");
    membersData.forEach(m => {
      console.log(`   ${m.name}: ${m.phone} (${m.role})`);
    });
    
    console.log("\n?? Database ready for development!");
    
  } catch (error: any) {
    console.error("\n? SEEDING ERROR:", error.message);
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log("\n?? Prisma disconnected");
  }
}

// Run the script
main()
  .then(() => {
    console.log("\n? Seed script completed successfully!");
    process.exit(0);
  })
  .catch((error: any) => {
    console.error("\n? Seed script failed!");
    console.error("Error:", error.message);
    process.exit(1);
  });
