import { Router } from "express";
import { OrganisationModel } from "../models/organisation";

export const orgRouter = Router();

// Create a new organisation
orgRouter.post("/", async (req, res, next) => {
  try {
    const org = await OrganisationModel.create(req.body);
    res.status(201).json(org);
  } catch (err) {
    next(err);                             // bubbles to global error handler
  }
});


// Get one organisation
orgRouter.get("/:id", async (req, res) => {
  const org = await OrganisationModel.findById(req.params.id);
  if (!org) return res.status(404).json({ error: "Not found" });
  res.json(org);
});

// Update an organisation
orgRouter.patch("/:id", async (req, res) => {
  const org = await OrganisationModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(org);
});

// List all (optional, for admin UI)
orgRouter.get("/", async (_, res) => {
  const orgs = await OrganisationModel.find();
  res.json(orgs);
});
