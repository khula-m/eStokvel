/**
 * Immutability rule on completed transactions.
 *
 * A stokvel ledger is the book on the table — once a row is COMPLETED,
 * the money-shape of that row is frozen (amount, type, member, group,
 * paymentMethod, transactionDate, currency, referenceNumber). Corrections
 * must go through a new ADJUSTMENT row, not by silently rewriting history.
 *
 * These tests pin that behaviour at the service layer so it can't regress
 * even if someone wires a PUT /api/transactions/:id endpoint later.
 */
import './setup';
import { prismaMock, resetAllMocks } from './helpers/prisma-mock';
import { testMembers, testTransactions } from './helpers/test-utils';
import { TransactionService } from '../services/transaction.service';

const svc = new TransactionService();

beforeEach(() => {
  resetAllMocks();
  // Caller is admin of the group so the only reason any update should fail
  // is the immutability rule itself, not the auth check above it.
  prismaMock.member.findFirst.mockResolvedValue(testMembers.adminMember);
});

describe('Immutability of COMPLETED transactions', () => {
  const completed = testTransactions.contribution; // status: COMPLETED, amount: 500

  it('rejects amount change on a COMPLETED transaction', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(completed);

    const res = await svc.updateTransaction(
      completed.id,
      { amount: 999 } as any,
      testMembers.adminMember.userId
    );

    expect(res.success).toBe(false);
    expect(res.message).toMatch(/amount/);
    expect(res.message).toMatch(/ADJUSTMENT/);
    expect(prismaMock.transaction.update).not.toHaveBeenCalled();
  });

  it('rejects transactionType change on a COMPLETED transaction', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(completed);

    const res = await svc.updateTransaction(
      completed.id,
      { transactionType: 'PAYOUT' } as any,
      testMembers.adminMember.userId
    );

    expect(res.success).toBe(false);
    expect(res.message).toMatch(/transactionType/);
    expect(prismaMock.transaction.update).not.toHaveBeenCalled();
  });

  it('rejects memberId change on a COMPLETED transaction', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(completed);

    const res = await svc.updateTransaction(
      completed.id,
      { memberId: 'some-other-member' } as any,
      testMembers.adminMember.userId
    );

    expect(res.success).toBe(false);
    expect(res.message).toMatch(/memberId/);
    expect(prismaMock.transaction.update).not.toHaveBeenCalled();
  });

  it('rejects rewriting a COMPLETED transaction back to PENDING', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(completed);

    const res = await svc.updateTransaction(
      completed.id,
      { status: 'PENDING' } as any,
      testMembers.adminMember.userId
    );

    expect(res.success).toBe(false);
    expect(res.message).toMatch(/PENDING/);
    expect(prismaMock.transaction.update).not.toHaveBeenCalled();
  });

  it('allows reversing a COMPLETED transaction (REVERSED is auditable)', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(completed);
    prismaMock.transaction.update.mockResolvedValue({ ...completed, status: 'REVERSED' });

    const res = await svc.updateTransaction(
      completed.id,
      { status: 'REVERSED' } as any,
      testMembers.adminMember.userId
    );

    expect(res.success).toBe(true);
    expect(prismaMock.transaction.update).toHaveBeenCalled();
  });

  it('allows editing notes on a COMPLETED transaction (operational metadata)', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(completed);
    prismaMock.transaction.update.mockResolvedValue({ ...completed, notes: 'Updated note' });

    const res = await svc.updateTransaction(
      completed.id,
      { notes: 'Updated note' } as any,
      testMembers.adminMember.userId
    );

    expect(res.success).toBe(true);
    expect(prismaMock.transaction.update).toHaveBeenCalled();
  });

  it('allows full edits on a still-PENDING transaction', async () => {
    const pending = { ...completed, status: 'PENDING' as const };
    prismaMock.transaction.findUnique.mockResolvedValue(pending);
    prismaMock.transaction.update.mockResolvedValue({ ...pending, amount: 750 });

    const res = await svc.updateTransaction(
      pending.id,
      { amount: 750 } as any,
      testMembers.adminMember.userId
    );

    // PENDING rows have not yet been confirmed, so they remain editable.
    // The freeze only fires the moment a row becomes COMPLETED.
    expect(res.success).toBe(true);
    expect(prismaMock.transaction.update).toHaveBeenCalled();
  });
});
