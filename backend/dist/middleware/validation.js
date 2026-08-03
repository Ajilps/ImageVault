import { AppError } from "../errors/appError.js";
function validate(schema, read, write) {
    return (request, _response, next) => {
        const result = schema.safeParse(read(request));
        if (!result.success) {
            next(new AppError(`Request validation failed: ${result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join(", ")}`, 400, "VALIDATION_ERROR"));
            return;
        }
        write(request, result.data);
        next();
    };
}
export function validateBody(schema) {
    return validate(schema, (request) => request.body, (request, value) => {
        request.body = value;
    });
}
export function validateParams(schema) {
    return validate(schema, (request) => request.params, (request, value) => {
        request.params = value;
    });
}
export function validateQuery(schema) {
    return validate(schema, (request) => request.query, (request, value) => {
        // Express 5 exposes request.query through a getter-only property. Keep
        // Zod's parsed/coerced result separately instead of assigning to it.
        request.validatedQuery = value;
    });
}
