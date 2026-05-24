import { User, UserMembership } from '../types';

export type GroupRole = 'ADMIN' | 'MEMBER';

// Returns the user's role for a specific group. Always per-group — never derive
// admin status from a global flag. A user is ADMIN only of the groups where
// their Membership.role is ADMIN.
export const getGroupRole = (
  user: User | null | undefined,
  groupId: string | null | undefined
): GroupRole => {
  if (!user || !groupId) return 'MEMBER';
  const m = user.memberships?.find(mm => mm.groupId === groupId);
  return m?.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
};

export const isSuperAdmin = (user: User | null | undefined): boolean =>
  user?.role === 'SUPERADMIN';

// True if the user holds ADMIN in ANY group. Use only for top-level decisions
// (e.g. "should the create-group CTA highlight differently"), never to gate a
// group-specific action — for that, call getGroupRole(user, groupId).
export const isAdminOfAnyGroup = (user: User | null | undefined): boolean =>
  !!user?.memberships?.some(m => m.role === 'ADMIN');

export const getMembership = (
  user: User | null | undefined,
  groupId: string | null | undefined
): UserMembership | undefined => {
  if (!user || !groupId) return undefined;
  return user.memberships?.find(m => m.groupId === groupId);
};
