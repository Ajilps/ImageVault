import { AppError } from "../errors/appError.js";
import { getCurrentUser, login, registerProductOwner } from "../services/auth.service.js";
export async function register(request, response) {
    const result = await registerProductOwner(request.body);
    response.status(201).json(result);
}
export async function loginUser(request, response) {
    const result = await login(request.body);
    response.json(result);
}
export async function getMe(request, response) {
    if (!request.auth) {
        throw new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED");
    }
    response.json({ user: await getCurrentUser(request.auth.id) });
}
