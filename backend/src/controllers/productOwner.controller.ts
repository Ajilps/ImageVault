import type { Request, Response } from "express";

import {
  createOrganisation,
  deleteOrganisation,
  listOrganisations,
  resetOrganisationAdminPassword,
  updateOrganisation,
} from "../services/productOwner.service.js";

export async function getOrganisations(_request: Request, response: Response) {
  response.json({ organisations: await listOrganisations() });
}

export async function postOrganisation(request: Request, response: Response) {
  const organisation = await createOrganisation(request.body);
  response.status(201).json({ organisation });
}

export async function patchOrganisation(request: Request, response: Response) {
  const { organisationId } = request.params as { organisationId: string };
  const organisation = await updateOrganisation(organisationId, request.body);
  response.json({ organisation });
}

export async function removeOrganisation(request: Request, response: Response) {
  const { organisationId } = request.params as { organisationId: string };
  await deleteOrganisation(organisationId);
  response.status(204).send();
}

export async function patchOrganisationAdminPassword(request: Request, response: Response) {
  const { organisationId } = request.params as { organisationId: string };
  const admin = await resetOrganisationAdminPassword(organisationId, request.body.newPassword);
  response.json({ admin });
}
