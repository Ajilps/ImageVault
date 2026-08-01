import { AppError } from "../errors/appError.js";
export function authorize(...roles) {
    return (request, _response, next) => {
        if (!request.auth) {
            next(new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED"));
            return;
        }
        if (!roles.includes(request.auth.role)) {
            next(new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN"));
            return;
        }
        next();
    };
}
