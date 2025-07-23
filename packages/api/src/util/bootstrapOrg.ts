import Organisation from "../models/organisation";

export async function ensureOrg(claimOrgId?: string | null): Promise<string> {
  if (Organisation == null) {
    throw new Error("Organisation model import failed");
  }

  if (claimOrgId) {
    const found = await Organisation.findById(claimOrgId).lean();
    if (found) return found._id.toString();
    // You could throw instead of auto-creating if you prefer
  }

  const created = await Organisation.create({
    name: "My Organisation",
    planTier: "FREE",
  });
  return created._id.toString();
}

