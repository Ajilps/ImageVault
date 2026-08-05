import { AppError } from "../errors/appError.js";
import { allocateUserSlots, createUser, deleteUser, listUsers, updateUser } from "../services/admin.service.js";
import { listOrganisationImages } from "../services/user.service.js";
function authenticatedUser(request) {
    if (!request.auth) {
        throw new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED");
    }
    return request.auth;
}
export async function getUsers(request, response) {
    response.json({ users: await listUsers(authenticatedUser(request)) });
}
export async function postUser(request, response) {
    const result = await createUser(authenticatedUser(request), request.body);
    response.status(201).json(result);
}
export async function patchUser(request, response) {
    const { userId } = request.params;
    const user = await updateUser(authenticatedUser(request), userId, request.body);
    response.json({ user });
}
export async function removeUser(request, response) {
    const { userId } = request.params;
    await deleteUser(authenticatedUser(request), userId);
    response.status(204).send();
}
export async function postUserSlots(request, response) {
    const { userId } = request.params;
    const user = await allocateUserSlots(authenticatedUser(request), userId, request.body.additionalSlots);
    response.json({ user });
}
export async function getOrganisationImages(request, response) {
    const query = (request.validatedQuery ?? {});
    response.json({
        images: await listOrganisationImages(authenticatedUser(request), query.taggedUserId),
    });
}
