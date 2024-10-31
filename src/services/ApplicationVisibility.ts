import { Types } from "mongoose";
import FieldVisibility, {
  IFieldVisibility,
} from "src/models/ApplicationVisibility";

class FieldVisibilityService {
  // Get field visibility for an organization
  async getFieldVisibility(
    organizationId: string
  ): Promise<IFieldVisibility | null> {
    return FieldVisibility.findOne({
      organizationId: new Types.ObjectId(organizationId),
    });
  }

  // Update field visibility for an organization
  async updateFieldVisibility(
    organizationId: string,
    fields: Partial<IFieldVisibility["fields"]>
  ): Promise<IFieldVisibility> {
    try {
      const update = this.flattenObject(fields);

      console.log(update, "update");

      return FieldVisibility.findOneAndUpdate(
        { organizationId: new Types.ObjectId(organizationId) },
        { $set: update },
        { new: true, upsert: true }
      );
    } catch (error) {
      console.error("Error in updateFieldVisibility:", error);
      throw error;
    }
  }

  // Create field visibility with default values
  async createFieldVisibility(
    organizationId: string
  ): Promise<IFieldVisibility> {
    const fieldVisibility = new FieldVisibility({
      organizationId: new Types.ObjectId(organizationId),
      fields: {}, // No need to pass fields, defaults from schema will be used
    });

    return fieldVisibility.save();
  }

  // Helper method to flatten the fields object (unchanged)
  private flattenObject(
    obj: any,
    prefix = "fields"
  ): { [key: string]: boolean } {
    return Object.keys(obj).reduce((acc: { [key: string]: boolean }, k) => {
      const pre = prefix.length ? prefix + "." : "";
      if (
        typeof obj[k] === "object" &&
        obj[k] !== null &&
        !Array.isArray(obj[k])
      ) {
        Object.assign(acc, this.flattenObject(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  }

  // Generate projection stage (unchanged)
  generateProjectionStage(fields: IFieldVisibility["fields"]): {
    [key: string]: 0 | 1;
  } {
    const flatFields = this.flattenObject(fields);

    // Start with a default projection including _id to ensure it's always present
    const projection: { [key: string]: 0 | 1 } = { _id: 1 };

    // Only include fields marked as `true` in the visibility settings
    Object.entries(flatFields).forEach(([key, value]) => {
      const cleanedKey = key.replace("fields.", ""); // Remove the "fields." prefix
      if (value === true) {
        projection[cleanedKey] = 1; // Only include fields that are true
      }
    });

    return projection;
  }
}

export default FieldVisibilityService;
