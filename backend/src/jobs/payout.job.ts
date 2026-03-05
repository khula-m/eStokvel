/**
 * Automatic Payout Scheduler
 *
 * Runs daily and checks for groups with due payouts.
 * Determines the next recipient via round-robin (nextPayoutOrder)
 * and initiates an Ozow payout.
 *
 * Usage: Import and call startPayoutScheduler() from server.ts
 */

import { prisma } from '../utils/prisma';
import { ozowService } from '../services/ozow.service';

const PAYOUT_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
let intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Check all active groups and process any due payouts.
 */
export async function processPayouts(): Promise<void> {
  try {
    const now = new Date();
    console.log(`[PayoutJob] Checking for due payouts at ${now.toISOString()}`);

    // Find active groups where payoutDate is due (today or past) and group has bank details
    const dueGroups = await prisma.stokvelGroup.findMany({
      where: {
        isActive: true,
        payoutDate: { lte: now },
      },
      include: {
        members: {
          orderBy: { nextPayoutOrder: 'asc' },
          include: {
            user: { select: { id: true, fullName: true, phoneNumber: true } },
            transactions: {
              where: { transactionType: 'CONTRIBUTION', status: 'COMPLETED' },
              select: { amount: true },
            },
          },
        },
      },
    });

    if (dueGroups.length === 0) {
      console.log('[PayoutJob] No groups with due payouts.');
      return;
    }

    for (const group of dueGroups) {
      try {
        console.log(`[PayoutJob] Processing payout for group "${group.name}" (${group.id})`);

        // Find the next member in the payout order
        const nextRecipient = group.members.find((m: any) => m.nextPayoutOrder !== null && m.nextPayoutOrder !== undefined)
          || group.members[0];

        if (!nextRecipient) {
          console.log(`[PayoutJob] Group "${group.name}" has no members. Skipping.`);
          continue;
        }

        // Check if member has bank details
        if (!nextRecipient.payoutBankName || !nextRecipient.payoutAccountNumber) {
          console.log(`[PayoutJob] Member ${nextRecipient.user.fullName} has no payout bank details. Skipping.`);
          continue;
        }

        // Calculate pool: sum of all completed contributions for this group
        const totalPool = group.members.reduce((sum: number, m: any) => {
          const memberTotal = m.transactions.reduce((s: number, t: any) => s + Number(t.amount), 0);
          return sum + memberTotal;
        }, 0);

        // Calculate existing payouts already made
        const existingPayouts = await prisma.transaction.aggregate({
          where: {
            stokvelGroupId: group.id,
            transactionType: 'PAYOUT',
            status: { in: ['COMPLETED', 'PENDING'] },
          },
          _sum: { amount: true },
        });

        const totalPaidOut = Number(existingPayouts._sum.amount || 0);
        const availableForPayout = totalPool - totalPaidOut;

        // Determine payout amount: either the full pool divided by members count,
        // or use contributionAmount × memberCount as the standard payout
        const memberCount = group.members.length;
        const standardPayout = Number(group.contributionAmount) * memberCount;
        const payoutAmount = Math.min(standardPayout, availableForPayout);

        if (payoutAmount <= 0) {
          console.log(`[PayoutJob] Group "${group.name}" has insufficient funds for payout. Pool: R${totalPool.toFixed(2)}, Already paid: R${totalPaidOut.toFixed(2)}`);
          continue;
        }

        console.log(`[PayoutJob] Initiating payout of R${payoutAmount.toFixed(2)} to ${nextRecipient.user.fullName}`);

        // Initiate payout via Ozow
        const result = await ozowService.initiatePayout({
          memberId: nextRecipient.id,
          groupId: group.id,
          amount: payoutAmount,
          reason: `Stokvel payout from ${group.name} (round ${nextRecipient.nextPayoutOrder || 1})`,
        });

        if (result.success) {
          console.log(`[PayoutJob] Payout initiated successfully: ${result.message}`);

          // Rotate payout order: move this member to end, advance others
          const sortedMembers = [...group.members].sort(
            (a, b) => (a.nextPayoutOrder || 999) - (b.nextPayoutOrder || 999)
          );

          for (let i = 0; i < sortedMembers.length; i++) {
            const newOrder = i === 0 ? sortedMembers.length : i;
            await prisma.member.update({
              where: { id: sortedMembers[i].id },
              data: { nextPayoutOrder: newOrder },
            });
          }

          // Advance the group's payoutDate to next cycle
          const frequency = group.contributionFrequency;
          const nextPayoutDate = new Date(group.payoutDate || now);
          switch (frequency) {
            case 'WEEKLY':
              nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
              break;
            case 'BIWEEKLY':
              nextPayoutDate.setDate(nextPayoutDate.getDate() + 14);
              break;
            case 'MONTHLY':
            default:
              nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
              break;
          }

          await prisma.stokvelGroup.update({
            where: { id: group.id },
            data: { payoutDate: nextPayoutDate },
          });

          console.log(`[PayoutJob] Next payout for "${group.name}" scheduled for ${nextPayoutDate.toISOString()}`);
        } else {
          console.error(`[PayoutJob] Payout failed for "${group.name}": ${result.message}`);
        }
      } catch (groupError: any) {
        console.error(`[PayoutJob] Error processing group "${group.name}":`, groupError.message);
        // Continue to next group
      }
    }

    console.log('[PayoutJob] Payout check complete.');
  } catch (error: any) {
    console.error('[PayoutJob] Fatal error:', error.message);
  }
}

/**
 * Start the payout scheduler (runs every 24 hours).
 */
export function startPayoutScheduler(): void {
  console.log('[PayoutJob] Starting automatic payout scheduler (24h interval)');

  // Run once on startup (after 30s delay to let server stabilize)
  setTimeout(() => {
    processPayouts().catch(err => console.error('[PayoutJob] Initial run error:', err));
  }, 30_000);

  // Then run every 24 hours
  intervalHandle = setInterval(() => {
    processPayouts().catch(err => console.error('[PayoutJob] Scheduled run error:', err));
  }, PAYOUT_CHECK_INTERVAL_MS);
}

/**
 * Stop the payout scheduler.
 */
export function stopPayoutScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[PayoutJob] Payout scheduler stopped.');
  }
}
