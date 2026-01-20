"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePhoneNumber = validatePhoneNumber;
exports.validatePassword = validatePassword;
exports.validateFullName = validateFullName;
exports.validateRequest = validateRequest;
function validatePhoneNumber(phone) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
}
function validatePassword(password) {
    if (password.length < 6) {
        return { isValid: false, message: "Password must be at least 6 characters" };
    }
    return { isValid: true };
}
function validateFullName(name) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
        return { isValid: false, message: "Full name must be at least 2 characters" };
    }
    if (trimmed.length > 100) {
        return { isValid: false, message: "Full name must be less than 100 characters" };
    }
    return { isValid: true };
}
function validateRequest(validations) {
    return (req, res, next) => {
        const errors = [];
        for (const validation of validations) {
            const result = validation(req.body);
            if (!result.isValid && result.message) {
                errors.push({ field: "body", message: result.message });
            }
        }
        if (errors.length > 0) {
            res.status(400).json({
                success: false,
                errors
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=validation.js.map