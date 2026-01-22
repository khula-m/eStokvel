"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberStatus = exports.getMemberRoleLabel = exports.getTransactionTypeLabel = exports.TransactionStatus = exports.PaymentMethod = exports.TransactionType = exports.MemberRole = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["MEMBER"] = "MEMBER";
    UserRole["TREASURER"] = "TREASURER";
    UserRole["SECRETARY"] = "SECRETARY";
    UserRole["CHAIRPERSON"] = "CHAIRPERSON";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var MemberRole;
(function (MemberRole) {
    MemberRole["TREASURER"] = "TREASURER";
    MemberRole["SECRETARY"] = "SECRETARY";
    MemberRole["CHAIRPERSON"] = "CHAIRPERSON";
    MemberRole["MEMBER"] = "MEMBER";
})(MemberRole || (exports.MemberRole = MemberRole = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["CONTRIBUTION"] = "CONTRIBUTION";
    TransactionType["PAYOUT"] = "PAYOUT";
    TransactionType["FINE_PAYMENT"] = "FINE_PAYMENT";
    TransactionType["LOAN_DISBURSEMENT"] = "LOAN_DISBURSEMENT";
    TransactionType["LOAN_REPAYMENT"] = "LOAN_REPAYMENT";
    TransactionType["INTEREST"] = "INTEREST";
    TransactionType["EXPENSE"] = "EXPENSE";
    TransactionType["ADJUSTMENT"] = "ADJUSTMENT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["MOBILE_MONEY"] = "MOBILE_MONEY";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["VOUCHER"] = "VOUCHER";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["COMPLETED"] = "COMPLETED";
    TransactionStatus["FAILED"] = "FAILED";
    TransactionStatus["REVERSED"] = "REVERSED";
    TransactionStatus["CANCELLED"] = "CANCELLED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
const getTransactionTypeLabel = (type) => {
    const labels = {
        [TransactionType.CONTRIBUTION]: 'Contribution',
        [TransactionType.PAYOUT]: 'Payout',
        [TransactionType.FINE_PAYMENT]: 'Fine Payment',
        [TransactionType.LOAN_DISBURSEMENT]: 'Loan Disbursement',
        [TransactionType.LOAN_REPAYMENT]: 'Loan Repayment',
        [TransactionType.INTEREST]: 'Interest',
        [TransactionType.EXPENSE]: 'Expense',
        [TransactionType.ADJUSTMENT]: 'Adjustment'
    };
    return labels[type] || type;
};
exports.getTransactionTypeLabel = getTransactionTypeLabel;
const getMemberRoleLabel = (role) => {
    const labels = {
        [MemberRole.TREASURER]: 'Treasurer',
        [MemberRole.SECRETARY]: 'Secretary',
        [MemberRole.CHAIRPERSON]: 'Chairperson',
        [MemberRole.MEMBER]: 'Member'
    };
    return labels[role] || role;
};
exports.getMemberRoleLabel = getMemberRoleLabel;
var MemberStatus;
(function (MemberStatus) {
    MemberStatus["ACTIVE"] = "ACTIVE";
    MemberStatus["INACTIVE"] = "INACTIVE";
    MemberStatus["SUSPENDED"] = "SUSPENDED";
})(MemberStatus || (exports.MemberStatus = MemberStatus = {}));
//# sourceMappingURL=enums.js.map