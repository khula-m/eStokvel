/**
 * Automatic Payout Scheduler
 *
 * Runs daily and checks for groups with due payouts.
 *
 * ROTATING model:  Round-robin — one member gets the full pool each cycle.
 * END_OF_TERM model: Savings — all members get back their contributions at end of term.
 *
 * HARDENED: Uses prisma.$transaction for atomic payout processing,
 * idempotency locks to prevent duplicate payouts, and structured logging.
 *
 * Usage: Import and call startPayoutScheduler() from server.ts
 */

import { prisma } from '../utils/prisma';
import { ozowService } from '../services/ozow.service';
import logger from '../utils/logger';

const PAYOUT_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let isProcessing = false; // In-process lock to prevent overlapping runs

// ── Scheduler status tracking ──
interface SchedulerStatus {
  running: boolean;
  lastRunAt: string | null;
  lastRunResult: 'success' | 'error' | null;
  lastError: string | null;
  rotatingGroupsProcessed: number;
  endOfTermGroupsProcessed: number;
  totalPayoutsCreated: number;
  startedAt: string | null;
}

const schedulerStatus: SchedulerStatus = {
  running: false,
  lastRunAt: null,
  lastRunResult: null,
  lastError: null,
  rotatingGroupsProcessed: 0,
  endOfTermGroupsProcessed: 0,
  totalPayoutsCreated: 0,
  startedAt: null,
};

export function getSchedulerStatus(): SchedulerStatus & { isProcessing: boolean; intervalMs: number } {
  return {
    ...schedulerStatus,
    isProcessing,
    intervalMs: PAYOUT_CHECK_INTERVAL_MS,
  };
}

/**
 * Check all active groups and process any due payouts.
 * Idempotent: Uses an in-process lock and checks for existing PENDING payouts
 * before creating new ones.
 */
export async function processPayouts(): Promise<void> {
  // Prevent overlapping runs (e.g., if previous run is still executing)
  if (isProcessing) {
    logger.warn('[PayoutJob] Previous run still in progress, skipping this cycle.');
    return;
  }

  isProcessing = true;
  schedulerStatus.rotatingGroupsProcessed = 0;
  schedulerStatus.endOfTermGroupsProcessed = 0;
  schedulerStatus.totalPayoutsCreated = 0;
  try {
    const now = new Date();
    logger.info(`[PayoutJob] Checking for due payouts at ${now.toISOString()}`);

    // ──────────────────────────────────────────────
    //  1. ROTATING MODEL — round-robin payouts
    // ──────────────────────────────────────────────
    await processRotatingPayouts(now);

    // ──────────────────────────────────────────────
    //  2. END_OF_TERM MODEL — savings payouts
    // ──────────────────────────────────────────────
    await processEndOfTermPayouts(now);

    schedulerStatus.lastRunAt = now.toISOString();
    schedulerStatus.lastRunResult = 'success';
    schedulerStatus.lastError = null;
    logger.info('[PayoutJob] Payout check complete.');
  } catch (error: any) {
    schedulerStatus.lastRunAt = new Date().toISOString();
    schedulerStatus.lastRunResult = 'error';
    schedulerStatus.lastError = error.message;
    logger.error(`[PayoutJob] Fatal error: ${error.message}`);
  } finally {
    isProcessing = false;
  }
}

// ──────────────────────────────────────────────────────
//  ROTATING PAYOUT LOGIC (existing round-robin)
// ──────────────────────────────────────────────────────
async function processRotatingPayouts(now: Date): Promise<void> {
  const dueGroups = await prisma.stokvelGroup.findMany({
    where: {
      isActive: true,
      payoutModel: 'ROTATING',
      payoutDate: { lte: now },
    },
    include: {
      members: {
        orderBy: { nextPayoutOrder: 'asc' },
        include: {
          user: { select: { id: true, fullName: true, phoneNumber: true } },
        },
      },
    },
  });

  if (dueGroups.length === 0) {
    logger.info('[PayoutJob] No ROTATING groups with due payouts.');
  }

  for (const group of dueGroups) {
    try {
      logger.info(`[PayoutJob][ROTATING] Processing payout for group "${group.name}" (${group.id})`);

      // IDEMPOTENCY CHECK: Skip if there's already a PENDING payout for this group
      const existingPendingPayout = await prisma.transaction.findFirst({
        where: {
          stokvelGroupId: group.id,
          transactionType: 'PAYOUT',
          status: 'PENDING',
        }
      });

      if (existingPendingPayout) {
        logger.warn(`[PayoutJob][ROTATING] Group "${group.name}" already has a pending payout (${existingPendingPayout.id}). Skipping.`);
        continue;
      }

      // Find the next member in the payout order
      const nextRecipient = group.members.find((m: any) => m.nextPayoutOrder !== null && m.nextPayoutOrder !== undefined)
        || group.members[0];

      if (!nextRecipient) {
        logger.warn(`[PayoutJob][ROTATING] Group "${group.name}" has no members. Skipping.`);
        continue;
      }

      // Check if member has bank details
      if (!nextRecipient.payoutBankName || !nextRecipient.payoutAccountNumber) {
        logger.warn(`[PayoutJob][ROTATING] Member ${nextRecipient.user.fullName} has no payout bank details. Skipping.`);
        continue;
      }

      // ATOMIC: Calculate pool and create payout within a transaction
      const payoutResult = await prisma.$transaction(async (tx: any) => {
        // Calculate pool: sum of all completed contributions for this group
        const totalPoolAgg = await tx.transaction.aggregate({
          where: {
            stokvelGroupId: group.id,
            transactionType: 'CONTRIBUTION',
            status: 'COMPLETED',
          },
          _sum: { amount: true },
        });
        const totalPool = Number(totalPoolAgg._sum.amount || 0);

        // Calculate existing payouts already made
        const existingPayoutsAgg = await tx.transaction.aggregate({
          where: {
            stokvelGroupId: group.id,
            transactionType: 'PAYOUT',
            status: { in: ['COMPLETED', 'PENDING'] },
          },
          _sum: { amount: true },
        });

        const totalPaidOut = Number(existingPayoutsAgg._sum.amount || 0);
        const availableForPayout = totalPool - totalPaidOut;

        // Determine payout amount
        const memberCount = group.members.length;
        const standardPayout = Number(group.contributionAmount) * memberCount;
        const payoutAmount = Math.min(standardPayout, availableForPayout);

        if (payoutAmount <= 0) {
          return { skipped: true, reason: `Insufficient funds. Pool: R${totalPool.toFixed(2)}, Already paid: R${totalPaidOut.toFixed(2)}` } as const;
        }

        // Create the payout transaction record atomically
        const payoutTx = await tx.transaction.create({
          data: {
            stokvelGroupId: group.id,
            memberId: nextRecipient.id,
            transactionType: 'PAYOUT',
            amount: payoutAmount,
            currency: group.currency,
            paymentMethod: 'EFT',
            transactionDate: new Date(),
            recordedById: nextRecipient.user.id,
            status: 'PENDING',
            notes: `Automatic rotating payout from ${group.name} (round ${nextRecipient.nextPayoutOrder || 1})`,
            referenceNumber: `PAYOUT-${group.id.slice(0, 8)}-${Date.now().toString(36)}`.toUpperCase(),
          }
        });

        return { skipped: false, payoutAmount, payoutTx } as const;
      }, {
        timeout: 15000,
      });

      if (payoutResult.skipped) {
        logger.info(`[PayoutJob][ROTATING] Group "${group.name}": ${payoutResult.reason}`);
        continue;
      }

      logger.info(`[PayoutJob][ROTATING] Initiating payout of R${payoutResult.payoutAmount.toFixed(2)} to ${nextRecipient.user.fullName}`);

      // Initiate payout via Ozow (outside transaction — external API call)
      const result = await ozowService.initiatePayout({
        memberId: nextRecipient.id,
        groupId: group.id,
        amount: payoutResult.payoutAmount,
        reason: `Stokvel payout from ${group.name} (round ${nextRecipient.nextPayoutOrder || 1})`,
      });

      if (result.success) {
        logger.info(`[PayoutJob][ROTATING] Payout initiated successfully: ${result.message}`);
        schedulerStatus.rotatingGroupsProcessed++;
        schedulerStatus.totalPayoutsCreated++;

        // Rotate payout order and advance date atomically
        await prisma.$transaction(async (tx: any) => {
          const sortedMembers = [...group.members].sort(
            (a, b) => (a.nextPayoutOrder || 999) - (b.nextPayoutOrder || 999)
          );

          for (let i = 0; i < sortedMembers.length; i++) {
            const newOrder = i === 0 ? sortedMembers.length : i;
            await tx.member.update({
              where: { id: sortedMembers[i].id },
              data: { nextPayoutOrder: newOrder },
            });
          }

          // Detect cycle completion: the member who just got paid was order 1,
          // and they're being moved to position N (last). If the NEW order 1 was
          // originally order 2, and they were the last member, this is the end of a cycle.
          const paidMemberOriginalOrder = nextRecipient.nextPayoutOrder || 1;
          if (paidMemberOriginalOrder === sortedMembers.length) {
            logger.info(`[PayoutJob][ROTATING] ★ CYCLE COMPLETE for group "${group.name}" — all ${sortedMembers.length} members have been paid. Starting new cycle.`);
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

          await tx.stokvelGroup.update({
            where: { id: group.id },
            data: { payoutDate: nextPayoutDate },
          });

          logger.info(`[PayoutJob][ROTATING] Next payout for "${group.name}" scheduled for ${nextPayoutDate.toISOString()}`);
        });
      } else {
        // Mark the payout transaction as FAILED
        if (payoutResult.payoutTx) {
          await prisma.transaction.update({
            where: { id: payoutResult.payoutTx.id },
            data: { status: 'FAILED', notes: `Ozow payout failed: ${result.message}` }
          });
        }
        logger.error(`[PayoutJob][ROTATING] Payout failed for "${group.name}": ${result.message}`);
      }
    } catch (groupError: any) {
      logger.error(`[PayoutJob][ROTATING] Error processing group "${group.name}": ${groupError.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────
//  END_OF_TERM PAYOUT LOGIC (savings — pay everyone)
// ──────────────────────────────────────────────────────
async function processEndOfTermPayouts(now: Date): Promise<void> {
  // Find END_OF_TERM groups whose term has ended and haven't been paid out yet
  const dueGroups = await prisma.stokvelGroup.findMany({
    where: {
      isActive: true,
      payoutModel: 'END_OF_TERM',
      termPayoutProcessed: false,
      endDate: { lte: now },
    },
    include: {
      members: {
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
    logger.info('[PayoutJob] No END_OF_TERM groups due for final payout.');
    return;
  }

  for (const group of dueGroups) {
    try {
      logger.info(`[PayoutJob][END_OF_TERM] Processing final payout for group "${group.name}" (${group.id})`);

      // IDEMPOTENCY: Already checked via termPayoutProcessed flag in query

      // ── PRO-RATA DISTRIBUTION ──
      // Calculate actual available pool (contributions - expenses - existing payouts)
      const [contributionAgg, expenseAgg, existingPayoutAgg] = await Promise.all([
        prisma.transaction.aggregate({
          where: { stokvelGroupId: group.id, transactionType: 'CONTRIBUTION', status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { stokvelGroupId: group.id, transactionType: 'EXPENSE', status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { stokvelGroupId: group.id, transactionType: 'PAYOUT', status: { in: ['COMPLETED', 'PENDING'] } },
          _sum: { amount: true },
        }),
      ]);

      const totalContributions = Number(contributionAgg._sum.amount || 0);
      const totalExpenses = Number(expenseAgg._sum.amount || 0);
      const totalExistingPayouts = Number(existingPayoutAgg._sum.amount || 0);
      const availablePool = totalContributions - totalExpenses - totalExistingPayouts;

      if (availablePool <= 0) {
        logger.warn(`[PayoutJob][END_OF_TERM] Group "${group.name}" has no available funds. Pool: R${totalContributions.toFixed(2)}, Expenses: R${totalExpenses.toFixed(2)}, Already paid: R${totalExistingPayouts.toFixed(2)}`);
        await prisma.stokvelGroup.update({ where: { id: group.id }, data: { termPayoutProcessed: true } });
        continue;
      }

      // Calculate each member's contributions and their pro-rata share
      const memberPayouts: Array<{ member: any; amount: number; contributed: number }> = [];
      let memberContributionTotal = 0;

      for (const member of group.members) {
        const totalContributed = member.transactions.reduce(
          (sum: number, t: any) => sum + Number(t.amount), 0
        );

        if (totalContributed <= 0) {
          logger.info(`[PayoutJob][END_OF_TERM] Member ${member.user.fullName} has no contributions. Skipping.`);
          continue;
        }

        if (!member.payoutBankName || !member.payoutAccountNumber) {
          logger.warn(`[PayoutJob][END_OF_TERM] Member ${member.user.fullName} has no payout bank details. Recording as PENDING.`);
        }

        memberContributionTotal += totalContributed;
        memberPayouts.push({ member, amount: 0, contributed: totalContributed });
      }

      // Pro-rata: each member gets (their contribution / total contributions) × available pool
      // Ensures cents balance correctly by rounding to 2 decimal places
      let distributedTotal = 0;
      for (let i = 0; i < memberPayouts.length; i++) {
        const share = (memberPayouts[i].contributed / memberContributionTotal) * availablePool;
        memberPayouts[i].amount = Math.round(share * 100) / 100;
        distributedTotal += memberPayouts[i].amount;
      }
      // Assign any rounding remainder to the last member
      const remainder = Math.round((availablePool - distributedTotal) * 100) / 100;
      if (remainder !== 0 && memberPayouts.length > 0) {
        memberPayouts[memberPayouts.length - 1].amount += remainder;
      }

      logger.info(`[PayoutJob][END_OF_TERM] Group "${group.name}" pro-rata distribution: Pool R${availablePool.toFixed(2)} across ${memberPayouts.length} members (total contributed: R${memberContributionTotal.toFixed(2)})`);

      if (memberPayouts.length === 0) {
        logger.info(`[PayoutJob][END_OF_TERM] Group "${group.name}" has no member contributions to pay out.`);
        // Still mark as processed to prevent re-processing
        await prisma.stokvelGroup.update({
          where: { id: group.id },
          data: { termPayoutProcessed: true },
        });
        continue;
      }

      // Create payout transaction records for ALL members atomically
      await prisma.$transaction(async (tx: any) => {
        for (const { member, amount, contributed } of memberPayouts) {
          await tx.transaction.create({
            data: {
              stokvelGroupId: group.id,
              memberId: member.id,
              transactionType: 'PAYOUT',
              amount,
              currency: group.currency,
              paymentMethod: 'EFT',
              transactionDate: new Date(),
              recordedById: member.user.id,
              status: 'PENDING',
              notes: `End-of-term pro-rata payout from ${group.name} — contributed R${contributed.toFixed(2)}, receiving R${amount.toFixed(2)}`,
              referenceNumber: `PAYOUT-EOT-${group.id.slice(0, 6)}-${member.id.slice(0, 6)}-${Date.now().toString(36)}`.toUpperCase(),
            },
          });
        }

        // Mark group as processed
        await tx.stokvelGroup.update({
          where: { id: group.id },
          data: { termPayoutProcessed: true },
        });
      }, { timeout: 30000 });

      logger.info(`[PayoutJob][END_OF_TERM] Created ${memberPayouts.length} payout records for group "${group.name}".`);
      schedulerStatus.endOfTermGroupsProcessed++;
      schedulerStatus.totalPayoutsCreated += memberPayouts.length;

      // Initiate Ozow payouts for each member (outside DB transaction)
      for (const { member, amount } of memberPayouts) {
        if (!member.payoutBankName || !member.payoutAccountNumber) {
          logger.warn(`[PayoutJob][END_OF_TERM] Skipping Ozow payout for ${member.user.fullName} — no bank details.`);
          continue;
        }

        try {
          const result = await ozowService.initiatePayout({
            memberId: member.id,
            groupId: group.id,
            amount,
            reason: `End-of-term savings payout from ${group.name}`,
          });

          if (result.success) {
            logger.info(`[PayoutJob][END_OF_TERM] Payout of R${amount.toFixed(2)} initiated for ${member.user.fullName}`);
          } else {
            logger.error(`[PayoutJob][END_OF_TERM] Payout failed for ${member.user.fullName}: ${result.message}`);
          }
        } catch (payoutErr: any) {
          logger.error(`[PayoutJob][END_OF_TERM] Ozow error for ${member.user.fullName}: ${payoutErr.message}`);
        }
      }
    } catch (groupError: any) {
      logger.error(`[PayoutJob][END_OF_TERM] Error processing group "${group.name}": ${groupError.message}`);
    }
  }
}

/**
 * Start the payout scheduler (runs every 24 hours).
 */
export function startPayoutScheduler(): void {
  logger.info('[PayoutJob] Starting automatic payout scheduler (24h interval)');
  schedulerStatus.running = true;
  schedulerStatus.startedAt = new Date().toISOString();

  // Run once on startup (after 30s delay to let server stabilize)
  setTimeout(() => {
    processPayouts().catch(err => logger.error('[PayoutJob] Initial run error:', err));
  }, 30_000);

  // Then run every 24 hours
  intervalHandle = setInterval(() => {
    processPayouts().catch(err => logger.error('[PayoutJob] Scheduled run error:', err));
  }, PAYOUT_CHECK_INTERVAL_MS);
}

/**
 * Stop the payout scheduler.
 */
export function stopPayoutScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    schedulerStatus.running = false;
    logger.info('[PayoutJob] Payout scheduler stopped.');
  }
}
