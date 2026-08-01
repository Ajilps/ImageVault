export class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode, code = "REQUEST_ERROR") {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "AppError";
    }
}
