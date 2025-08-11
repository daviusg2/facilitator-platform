// packages/api/src/routes/responseManagement.ts
import { Router, Response } from "express";
import { DiscussionResponseModel } from "../models/discussionResponse"; // Named export
import DiscussionQuestion from "../models/discussionQuestion"; // Default export

const router = Router();

/**
 * PATCH /api/responses/:id
 * Update a response (for moderation actions)
 * body: { isHidden?: boolean, isFlagged?: boolean, isPinned?: boolean }
 */
router.patch("/:id", async (req, res: Response) => {
  try {
    const { id } = req.params;
    const { isHidden, isFlagged, isPinned } = req.body;

    console.log(`🔍 Updating response ${id}:`, req.body);

    // Build update object - only include fields that are provided
    const updateFields: any = {};
    if (typeof isHidden === 'boolean') updateFields.isHidden = isHidden;
    if (typeof isFlagged === 'boolean') updateFields.isFlagged = isFlagged;
    if (typeof isPinned === 'boolean') updateFields.isPinned = isPinned;

    // Add moderation metadata
    if (Object.keys(updateFields).length > 0) {
      updateFields.moderatedAt = new Date();
    }

    const updatedResponse = await DiscussionResponseModel.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    ).lean();

    if (!updatedResponse) {
      console.log(`❌ Response ${id} not found`);
      return res.status(404).json({ error: "Response not found" });
    }

    console.log(`✅ Response ${id} updated:`, updatedResponse);

    // TODO: Add Socket.IO broadcasting when it's properly set up
    // For now, just return the updated response

    res.json(updatedResponse);
  } catch (err) {
    console.error("❌ Update response error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/responses/:id
 * Delete a response
 */
router.delete("/:id", async (req, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Deleting response ${id}`);

    // Find and delete the response
    const deletedResponse = await DiscussionResponseModel.findByIdAndDelete(id);
    
    if (!deletedResponse) {
      console.log(`❌ Response ${id} not found`);
      return res.status(404).json({ error: "Response not found" });
    }

    console.log(`✅ Response ${id} deleted`);

    // TODO: Add Socket.IO broadcasting when it's properly set up

    res.status(204).send(); // No content response for successful deletion
  } catch (err) {
    console.error("❌ Delete response error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/responses/bulk
 * Bulk update responses
 * body: { responseIds: string[], updates: { isHidden?: boolean, isFlagged?: boolean, isPinned?: boolean } }
 */
router.patch("/bulk", async (req, res: Response) => {
  try {
    const { responseIds, updates } = req.body;

    console.log(`🔍 Bulk updating ${responseIds?.length} responses:`, updates);

    if (!Array.isArray(responseIds) || responseIds.length === 0) {
      return res.status(400).json({ error: "responseIds array is required" });
    }

    // Validate updates object
    const allowedFields = ['isHidden', 'isFlagged', 'isPinned'];
    const updateFields: any = {};
    
    for (const field of allowedFields) {
      if (typeof updates[field] === 'boolean') {
        updateFields[field] = updates[field];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No valid update fields provided" });
    }

    // Add moderation metadata
    updateFields.moderatedAt = new Date();

    // Update all specified responses
    const result = await DiscussionResponseModel.updateMany(
      { _id: { $in: responseIds } },
      { $set: updateFields }
    );

    console.log(`✅ Bulk updated ${result.modifiedCount} responses`);

    // Get the updated responses for the response
    const updatedResponses = await DiscussionResponseModel.find({
      _id: { $in: responseIds }
    }).lean();

    // TODO: Add Socket.IO broadcasting when it's properly set up

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      responses: updatedResponses
    });
  } catch (err) {
    console.error("❌ Bulk update responses error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/responses/bulk
 * Bulk delete responses
 * body: { responseIds: string[] }
 */
router.delete("/bulk", async (req, res: Response) => {
  try {
    const { responseIds } = req.body;

    console.log(`🔍 Bulk deleting ${responseIds?.length} responses`);

    if (!Array.isArray(responseIds) || responseIds.length === 0) {
      return res.status(400).json({ error: "responseIds array is required" });
    }

    // Delete the responses
    const result = await DiscussionResponseModel.deleteMany({
      _id: { $in: responseIds }
    });

    console.log(`✅ Bulk deleted ${result.deletedCount} responses`);

    // TODO: Add Socket.IO broadcasting when it's properly set up

    res.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("❌ Bulk delete responses error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;