import { createOrganisation, deleteOrganisation, listOrganisations, updateOrganisation, } from "../services/productOwner.service.js";
export async function getOrganisations(_request, response) {
    response.json({ organisations: await listOrganisations() });
}
export async function postOrganisation(request, response) {
    const organisation = await createOrganisation(request.body);
    response.status(201).json({ organisation });
}
export async function patchOrganisation(request, response) {
    const { organisationId } = request.params;
    const organisation = await updateOrganisation(organisationId, request.body);
    response.json({ organisation });
}
export async function removeOrganisation(request, response) {
    const { organisationId } = request.params;
    await deleteOrganisation(organisationId);
    response.status(204).send();
}
