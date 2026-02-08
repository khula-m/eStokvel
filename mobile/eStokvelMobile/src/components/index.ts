/**
 * eStokvel Mobile Components Index
 * Quick reference for all presentation-ready components
 */

// ============================================
// DASHBOARDS (Role-Based)
// ============================================

export { TreasurerDashboard } from './dashboards/TreasurerDashboard';
// - Full control dashboard for treasurers
// - 4 quick actions, financial overview, activity feed
// - Has FAB (Floating Action Button)

export { MemberDashboard } from './dashboards/MemberDashboard';
// - Simplified dashboard for members
// - 3 quick actions, personal status, group updates
// - NO FAB (limited permissions)

// ============================================
// LEDGERS (Security-Separated)
// ============================================

export { TreasurerLedger } from './ledger/TreasurerLedger';
// - See ALL members' transactions
// - Filter, search, export functionality
// - Full transaction history per member

export { MemberLedger } from './ledger/MemberLedger';
// - See ONLY own transactions
// - Personal history, progress stats
// - No access to other members

// ============================================
// PRESENTATION COMPONENTS
// ============================================

export { InvitationFlow } from './presentation/InvitationFlow';
// - Step-by-step invitation visualization
// - Shows SMS process, member joining
// - For presentation demos only

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Role-based dashboard rendering
/*
import { TreasurerDashboard, MemberDashboard } from './components';

const isTreasurer = user?.role === 'TREASURER';
return isTreasurer 
  ? <TreasurerDashboard user={user} groupName="Ubuntu Savings" groupCode="ABC123" />
  : <MemberDashboard user={user} groupName="Ubuntu Savings" />;
*/

// Example 2: Ledger views
/*
import { TreasurerLedger, MemberLedger } from './components';

const isTreasurer = user?.role === 'TREASURER';
return isTreasurer 
  ? <TreasurerLedger />
  : <MemberLedger />;
*/

// Example 3: Presentation mode
/*
import { InvitationFlow } from './components';

return <InvitationFlow />;
*/

// ============================================
// ICONS USED (Material Icons)
// ============================================

/*
Dashboard Icons:
- person: User profile
- dashboard: Dashboard view
- payments: Transactions
- group/groups: Members
- assessment: Analytics/Reports
- event/calendar-today: Meetings
- flash-on: Quick actions
- trending-up: Statistics
- campaign: Announcements

Status Icons:
- check-circle: Completed/Paid
- cancel: Missed/Failed
- warning: Late/Pending
- info: Information
- local-fire-department: Streak

Action Icons:
- add: Create new
- group-add: Add member
- person-add: Invite
- file-download: Export
- send: Send message
- login: Join/Sign in

Navigation Icons:
- home: Home screen
- settings: Settings
- notifications: Alerts
- smartphone: Phone/App
- how-to-reg: Invitation/Registration
*/

// ============================================
// COLOR SCHEME
// ============================================

/*
Primary Roles:
- Treasurer: Deep Green (#2E7D32) - Authority, Trust
- Member: Blue (#2196F3) - Community, Member

Status Colors:
- Success: Green (#4CAF50) - Paid, Completed
- Warning: Orange (#FF9800) - Late, Pending
- Error: Red (#F44336) - Missed, Failed
- Info: Blue (#2196F3) - Information

Secondary:
- Gold: (#FFA000) - Value, Savings
*/

// ============================================
// KEY DIFFERENTIATORS
// ============================================

/*
Treasurer vs Member:

Feature                 | Treasurer | Member
------------------------|-----------|--------
Dashboard Actions       | 4         | 3
View All Members        | ✅        | ❌
View Own Data           | ✅        | ✅
Record Transactions     | ✅        | ❌
Add Members             | ✅        | ❌
Export Ledger           | ✅        | ❌
Schedule Meetings       | ✅        | View Only
Floating Action Button  | ✅        | ❌
Full Ledger Access      | ✅        | ❌
Personal Stats          | ✅        | ✅
*/
