import { AppError } from "../errors/appError.js";
import { completeImageUpload, createPublicImageShare, getQuota, listOrganisationMembers, listNotifications, listOrganisationImages, requestImageUpload, revokePublicImageShare, } from "../services/user.service.js";
function authenticatedUser(request) {
    if (!request.auth) {
        throw new AppError("Authentication is required.", 401, "AUTHENTICATION_REQUIRED");
    }
    return request.auth;
}
export async function getUserQuota(request, response) {
    response.json({ quota: await getQuota(authenticatedUser(request)) });
}
export async function postUploadUrl(request, response) {
    const upload = await requestImageUpload(authenticatedUser(request), request.body);
    response.status(201).json({ upload });
}
export async function postCompleteUpload(request, response) {
    const image = await completeImageUpload(authenticatedUser(request), request.body);
    response.status(201).json({ image });
}
export async function getImages(request, response) {
    const query = (request.validatedQuery ?? {});
    response.json({
        images: await listOrganisationImages(authenticatedUser(request), query.taggedUserId),
    });
}
export async function getOrganisationMembers(request, response) {
    response.json({ users: await listOrganisationMembers(authenticatedUser(request)) });
}
export async function getNotifications(request, response) {
    response.json({ notifications: await listNotifications(authenticatedUser(request)) });
}
export async function postImageShare(request, response) {
    const { imageId } = request.params;
    const share = await createPublicImageShare(authenticatedUser(request), imageId);
    response.status(201).json({ share });
}
export async function deleteImageShare(request, response) {
    const { imageId } = request.params;
    await revokePublicImageShare(authenticatedUser(request), imageId);
    response.status(204).send();
}
