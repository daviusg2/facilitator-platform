import User from "../models/user";
import Organisation from "../models/organisation";

/**
 * Ensures we have a User doc for this Cognito sub.
 * Also ensures an Organisation exists (if claim missing/invalid).
 */
export async function getOrCreateUser(opts: {
  sub: string;
  email?: string;
  name?: string;
  role?: string;
  claimOrgId?: string;
}) {
  const { sub, email, name, role, claimOrgId } = opts;

  // try find existing
  let user = await User.findOne({ cognitoSub: sub }).lean();
  if (user) return user;

  // ensure org
  let orgId = claimOrgId;
  if (!orgId) {
    const createdOrg = await Organisation.create({
      name: "My Organisation",
      planTier: "FREE",
    });
    orgId = createdOrg._id.toString();
  } else {
    const exists = await Organisation.exists({ _id: claimOrgId });
    if (!exists) {
      const createdOrg = await Organisation.create({
        name: "My Organisation",
        planTier: "FREE",
      });
      orgId = createdOrg._id.toString();
    }
  }

  // create user
  user = await User.create({
    orgId,
    cognitoSub: sub,
    email,
    name,
    role: role || "facilitator",
  });

  // .lean() returns plain object; either return user.toObject() or user directly
  return user.toObject ? user.toObject() : user;
}
