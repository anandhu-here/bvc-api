import { IRequest, IResponse } from "src/interfaces/core/new";
import FieldVisibilityService from "src/services/ApplicationVisibility";

class FieldVisibilityController {
  private readonly fieldVisibilitySvc: FieldVisibilityService;

  constructor(fieldVisibilitySvc: FieldVisibilityService) {
    this.fieldVisibilitySvc = fieldVisibilitySvc;

    // Bind methods to maintain the correct `this` context
    this.getFieldVisibility = this.getFieldVisibility.bind(this);
    this.updateFieldVisibility = this.updateFieldVisibility.bind(this);
    this.initializeFieldVisibility = this.initializeFieldVisibility.bind(this);
  }

  // Get the current field visibility
  async getFieldVisibility(req: IRequest, res: IResponse) {
    const orgId = req.currentOrganization.id;

    try {
      const visibility = await this.fieldVisibilitySvc.getFieldVisibility(
        orgId
      );
      res.json(visibility);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching field visibility", error });
    }
  }

  // Update the field visibility
  async updateFieldVisibility(req: IRequest, res: IResponse) {
    const orgId = req.currentOrganization.id;
    const fields = req.body;

    try {
      const updatedVisibility =
        await this.fieldVisibilitySvc.updateFieldVisibility(orgId, fields);
      res.json(updatedVisibility);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error updating field visibility", error });
    }
  }

  // Initialize field visibility for an organization (without passing any defaults)
  public async initializeFieldVisibility(req: IRequest, res: IResponse) {
    const orgId = req.currentOrganization.id;

    try {
      // Check if the visibility already exists
      const existingVisibility =
        await this.fieldVisibilitySvc.getFieldVisibility(orgId);

      // If visibility already exists, return it
      if (existingVisibility) {
        return res.status(200).json({
          message: "Visibility already initialized",
          visibility: existingVisibility,
        });
      }

      // Otherwise, create a new document for the organizationId with default values
      const newVisibility = await this.fieldVisibilitySvc.createFieldVisibility(
        orgId
      );
      res.status(201).json({
        message: "Visibility initialized with default values",
        visibility: newVisibility,
      });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "Error initializing field visibility", error });
    }
  }
}

export default FieldVisibilityController;
