import { connectToDatabase } from "./db";
import { OrganisationModel } from "./models/organisation";

await connectToDatabase(process.env.MONGODB_URI!);
await OrganisationModel.create({ name: "Demo Org", planTier: "FREE" });
console.log("Seeded Demo Org");
process.exit(0);
