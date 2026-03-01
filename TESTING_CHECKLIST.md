# eStokvel Testing Checklist

## Overview

This document provides a comprehensive testing checklist for the eStokvel mobile application. Use this to verify all features work correctly before release.

---

## 1. Authentication Tests

### 1.1 Registration

- [ ] New user can register with phone number and PIN
- [ ] Registration validates phone number format (10 digits)
- [ ] Registration validates PIN (4-6 digits)
- [ ] Registration validates name fields (not empty)
- [ ] Duplicate phone numbers are rejected
- [ ] Registration creates user in database correctly
- [ ] Success message displayed after registration

### 1.2 Login

- [ ] User can login with phone number and PIN
- [ ] Invalid phone number shows error
- [ ] Invalid PIN shows error
- [ ] Non-existent user shows appropriate error
- [ ] Successful login redirects to dashboard
- [ ] Auth token stored correctly
- [ ] User data loaded into store

### 1.3 Logout

- [ ] Logout button visible in settings/profile
- [ ] Logout clears auth token
- [ ] Logout clears user store
- [ ] Logout redirects to login screen
- [ ] Cannot access protected routes after logout

---

## 2. Group Management Tests

### 2.1 Create Group

- [ ] Treasurer can create new group
- [ ] Group name is required
- [ ] Contribution amount is required and valid
- [ ] Contribution frequency selection works
- [ ] Start date selection works
- [ ] Group created successfully
- [ ] Creator becomes treasurer automatically

### 2.2 View Groups

- [ ] All user groups displayed in list
- [ ] Group cards show name, members, contribution
- [ ] Tap on group navigates to group details
- [ ] Empty state shown when no groups
- [ ] Pull to refresh works

### 2.3 Group Details

- [ ] Group name displayed
- [ ] Member count displayed
- [ ] Total contributions shown
- [ ] Next payout date shown
- [ ] Member list visible
- [ ] Contribution history visible

### 2.4 Invite Members

- [ ] Treasurer can access invite flow
- [ ] Phone number entry works
- [ ] Invitation sent successfully
- [ ] SMS sent to invitee
- [ ] Pending invitations visible
- [ ] Cannot invite existing members

---

## 3. Transaction Tests

### 3.1 View Transactions

- [ ] Transaction history displays correctly
- [ ] Transactions sorted by date (newest first)
- [ ] Transaction status shown (Pending/Verified/Rejected)
- [ ] Transaction amounts formatted correctly
- [ ] Empty state when no transactions
- [ ] Pull to refresh works

### 3.2 Make Contribution (Member)

- [ ] Member can initiate contribution
- [ ] Bank details for payment visible
- [ ] Can upload payment proof image
- [ ] Camera/gallery picker works
- [ ] Submission creates pending transaction
- [ ] Success confirmation shown

### 3.3 Verify Payments (Treasurer)

- [ ] Treasurer sees pending verifications
- [ ] Can view payment proof image
- [ ] Can approve payment
- [ ] Can reject payment with reason
- [ ] Transaction status updates correctly
- [ ] Member notified of verification result

### 3.4 Payouts (Treasurer)

- [ ] Treasurer can initiate payout
- [ ] Recipient selection works
- [ ] Payout amount calculated correctly
- [ ] Payout recorded in transactions
- [ ] Payout rotation updated

---

## 4. Dashboard Tests

### 4.1 Member Dashboard

- [ ] Welcome message with user name
- [ ] Total savings displayed
- [ ] Active groups count shown
- [ ] Next contribution due date visible
- [ ] Recent activity preview
- [ ] Quick actions accessible

### 4.2 Treasurer Dashboard

- [ ] Pending verifications count
- [ ] Upcoming payouts shown
- [ ] Group statistics visible
- [ ] Quick action for verification
- [ ] Alerts for overdue contributions

---

## 5. UI/UX Tests

### 5.1 Navigation

- [ ] Bottom tabs work correctly
- [ ] Tab icons highlight active tab
- [ ] Back navigation works
- [ ] Deep linking works (if implemented)
- [ ] Gesture navigation works

### 5.2 Loading States

- [ ] LoadingSpinner shown during API calls
- [ ] Skeleton loaders on lists (if implemented)
- [ ] Button loading states work

### 5.3 Error Handling

- [ ] ErrorState component displays for failures
- [ ] Retry button triggers new request
- [ ] Network error handled gracefully
- [ ] Validation errors shown inline
- [ ] Toast/alert messages work

### 5.4 Responsive Design

- [ ] Layouts work on small screens
- [ ] Layouts work on large screens
- [ ] Keyboard doesn't obscure inputs
- [ ] Scrolling works smoothly

---

## 6. USSD Service Tests

### 6.1 Session Management

- [ ] New session created on first dial
- [ ] Session state maintained across requests
- [ ] Session timeout handled

### 6.2 Menu Navigation

- [ ] Main menu displays correctly
- [ ] Check Balance option works
- [ ] Make Contribution option works
- [ ] View History option works
- [ ] Exit option ends session

### 6.3 Transactions via USSD

- [ ] Balance inquiry returns correct amount
- [ ] Contribution initiation works
- [ ] Confirmation prompts work
- [ ] Success messages displayed
- [ ] Error messages clear and helpful

---

## 7. API Integration Tests

### 7.1 Backend Endpoints

- [ ] POST /api/auth/register - Returns 201 on success
- [ ] POST /api/auth/login - Returns token on success
- [ ] GET /api/groups - Returns user groups
- [ ] POST /api/groups - Creates new group
- [ ] GET /api/transactions - Returns transactions
- [ ] POST /api/transactions - Creates transaction
- [ ] PUT /api/transactions/:id/verify - Updates status

### 7.2 Error Responses

- [ ] 400 returned for validation errors
- [ ] 401 returned for unauthorized requests
- [ ] 403 returned for forbidden actions
- [ ] 404 returned for not found
- [ ] 500 handled gracefully

---

## 8. Security Tests

### 8.1 Authentication

- [ ] Tokens expire correctly
- [ ] Invalid tokens rejected
- [ ] Protected routes require auth
- [ ] PIN not stored in plain text

### 8.2 Authorization

- [ ] Members cannot access treasurer features
- [ ] Users can only see their groups
- [ ] Users can only see their transactions
- [ ] Group admins can manage members

### 8.3 Data Validation

- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] Input sanitization works
- [ ] File upload validation works

---

## 9. Performance Tests

### 9.1 Load Times

- [ ] App launch < 3 seconds
- [ ] Screen transitions < 300ms
- [ ] API responses < 2 seconds
- [ ] Image loading optimized

### 9.2 Memory

- [ ] No memory leaks on navigation
- [ ] Large lists virtualized
- [ ] Images properly cached/released

---

## 10. End-to-End Test Scenarios

### Scenario 1: New User Journey

1. [ ] Open app → See login screen
2. [ ] Tap "Register" → See registration form
3. [ ] Fill form → Submit → See success
4. [ ] Login → See dashboard
5. [ ] Create group → See group created
6. [ ] Invite member → See invitation sent

### Scenario 2: Contribution Flow

1. [ ] Login as member
2. [ ] Navigate to group
3. [ ] Tap "Make Contribution"
4. [ ] View bank details
5. [ ] Upload payment proof
6. [ ] Submit → See pending status
7. [ ] Login as treasurer
8. [ ] View pending verification
9. [ ] Approve payment
10. [ ] Member sees verified status

### Scenario 3: Payout Flow

1. [ ] Login as treasurer
2. [ ] Navigate to group
3. [ ] Check payout due
4. [ ] Initiate payout
5. [ ] Select recipient
6. [ ] Confirm payout
7. [ ] See transaction recorded
8. [ ] Member receives notification

---

## Test Execution Log

| Date | Tester | Section | Pass/Fail | Notes |
| ---- | ------ | ------- | --------- | ----- |
|      |        |         |           |       |

---

## Known Issues

| Issue | Severity | Status | Notes |
| ----- | -------- | ------ | ----- |
|       |          |        |       |

---

## Sign-Off

- [ ] All critical tests passed
- [ ] All high-priority bugs fixed
- [ ] Performance acceptable
- [ ] Security review complete

**Approved by:** ******\_\_\_******  
**Date:** ******\_\_\_******
