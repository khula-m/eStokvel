/**
 * Automatic Payout Scheduler
 *
 * Runs daily and checks for groups with due payouts.
 * Determines the next recipient via round-robin (nextPayoutOrder)
 * and initiates an Ozow payout.
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
  try {
    const now = new Date();
    logger.info(`[PayoutJob] Checking for due payouts at ${now.toISOString()}`);

    // Find active groups where payoutDate is due (today or past)
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
          },
        },
      },
    });

    if (dueGroups.length === 0) {
      logger.info('[PayoutJob] No groups with due payouts.');
      return;
    }

    for (const group of dueGroups) {
      try {
        logger.info(`[PayoutJob] Processing payout for group "${group.name}" (${group.id})`);

        // IDEMPOTENCY CHECK: Skip if there's already a PENDING payout for this group
        const existingPendingPayout = await prisma.transaction.findFirst({
          where: {
            stokvelGroupId: group.id,
            transactionType: 'PAYOUT',
            status: 'PENDING',
          }
        });

        if (existingPendingPayout) {
          logger.warn(`[PayoutJob] Group "${group.name}" already has a pending payout (${existingPendingPayout.id}). Skipping.`);
          continue;
        }

        // Find the next member in the payout order
        const nextRecipient = group.members.find((m: any) => m.nextPayoutOrder !== null && m.nextPayoutOrder !== undefined)
          || group.members[0];

        if (!nextRecipient) {
          logger.warn(`[PayoutJob] Group "${group.name}" has no members. Skipping.`);
          continue;
        }

        // Check if member has bank details
        if (!nextRecipient.payoutBankName || !nextRecipient.payoutAccountNumber) {
          logger.warn(`[PayoutJob] Member ${nextRecipient.user.fullName} has no payout bank details. Skipping.`);
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
              notes: `Automatic payout from ${group.name} (round ${nextRecipient.nextPayoutOrder || 1})`,
              referenceNumber: `PAYOUT-${group.id.slice(0, 8)}-${Date.now().toString(36)}`.toUpperCase(),
            }
          });

          return { skipped: false, payoutAmount, payoutTx } as const;
        }, {
          timeout: 15000,
        });

        if (payoutResult.skipped) {
          logger.info(`[PayoutJob] Group "${group.name}": ${payoutResult.reason}`);
          continue;
        }

        logger.info(`[PayoutJob] Initiating payout of R${payoutResult.payoutAmount.toFixed(2)} to ${nextRecipient.user.fullName}`);

        // Initiate payout via Ozow (outside transaction — external API call)
        const result = await ozowService.initiatePayout({
          memberId: nextRecipient.id,
          groupId: group.id,
          amount: payoutResult.payoutAmount,
          reason: `Stokvel payout from ${group.name} (round ${nextRecipient.nextPayoutOrder || 1})`,
        });

        if (result.success) {
          logger.info(`[PayoutJob] Payout initiated successfully: ${result.message}`);

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

            logger.info(`[PayoutJob] Next payout for "${group.name}" scheduled for ${nextPayoutDate.toISOString()}`);
          });
        } else {
          // Mark the payout transaction as FAILED
          if (payoutResult.payoutTx) {
            await prisma.transaction.update({
              where: { id: payoutResult.payoutTx.id },
              data: { status: 'FAILED', notes: `Ozow payout failed: ${result.message}` }
            });
          }
          logger.error(`[PayoutJob] Payout failed for "${group.name}": ${result.message}`);
        }
      } catch (groupError: any) {
        logger.error(`[PayoutJob] Error processing group "${group.name}": ${groupError.message}`);
        // Continue to next group
      }
    }

    logger.info('[PayoutJob] Payout check complete.');
  } catch (error: any) {
    logger.error(`[PayoutJob] Fatal error: ${error.message}`);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the payout scheduler (runs every 24 hours).
 */
export function startPayoutScheduler(): void {
  logger.info('[PayoutJob] Starting automatic payout scheduler (24h interval)');

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
    logger.info('[PayoutJob] Payout scheduler stopped.');
  }
}
