import TimelineModel from "../models/Timeline";
import { Types, Schema } from "mongoose";
import { ITimeline, ITimelineItem } from "../interfaces/entities/timeline";
import { IUser, IUserModel } from "src/interfaces/entities/user";

class TimelineService {
  /**
   * Retrieves the current agency details for the given carer, including the start and end dates.
   * @param {Types.ObjectId} carerId - The ID of the carer.
   * @returns {Promise<(Partial<IUser> & { startDate: Date; endDate: Date }) | null>} - The current agency details with start and end dates, or null if not found.
   */
  public getCurrentCompany = async (
    carerId: Types.ObjectId
  ): Promise<
    | (Partial<IUser> & {
        startDate: Date;
        endDate: Date;
        currentDesignation: string;
      })
    | null
  > => {
    const timeline = await TimelineModel.findOne({ carerId })
      .populate({
        path: "timeline",
        model: "TimelineItem",
        match: { companyId: { $eq: "$currentCompany" } },
        select: "dateStarted dateEnded companyId",
        options: { limit: 1 },
      })
      .populate({
        path: "currentCompany",
        model: "User",
        select: "fname lname company",
      })
      .exec();

    if (!timeline || !timeline.currentCompany) {
      return null;
    }

    const [currentAgencyItem] = timeline.timeline;
    const { fname, lname, company, _id } = timeline.currentCompany as any;

    return {
      fname,
      lname,
      company,
      startDate: currentAgencyItem?.dateStarted || null,
      endDate: currentAgencyItem?.dateEnded || null,
      currentDesignation: timeline.currentDesignation,
    };
  };

  /**
   * Retrieves the previous agencies for the given carer, including the start and end dates.
   * @param {Types.ObjectId} carerId - The ID of the carer.
   * @returns {Promise<(Partial<IUser> & { startDate: Date; endDate: Date })[]>} - The array of previous agency details with start and end dates.
   */
  public getPreviousCompanies = async (
    carerId: Types.ObjectId
  ): Promise<(Partial<IUser> & { startDate: Date; endDate: Date })[]> => {
    console.log("carerId", carerId);
    const timeline = await TimelineModel.findOne({ carerId })
      .populate({
        path: "carerId",
        model: "User",
        select: "fname lname company accountType",
      })
      .populate({
        path: "timeline",
        model: "TimelineItem",
        select: "dateStarted dateEnded companyId",
      })
      .populate({
        path: "timeline.companyId",
        model: "User",
        select: "fname lname company",
      })
      .exec();

    if (!timeline) {
      return [];
    }

    let carer = timeline.carerId as any;

    return timeline.timeline
      .filter(
        (item: any) =>
          item.companyId._id?.toString() !== timeline.currentCompany?.toString()
      )
      .map((item: any) => ({
        _id: item.companyId._id,
        fname: item.companyId.fname,
        lname: item.companyId.lname,
        company: item.companyId.company,
        designation: item.designation,
        startDate: item.dateStarted,
        endDate: item.dateEnded,
        carerId: item.carerId,
      }));
  };

  /**
   * Adds a new agency to the carer's timeline.
   * @param {Types.ObjectId} carerId - The ID of the carer.
   * @param {Schema.Types.ObjectId} newCompanyId - The ID of the new agency.
   * @param {Date} newAgencyStartDate - The start date of the new agency.
   * @param {string} newAgencyDescription - The description of the new agency.
   * @returns {Promise<ITimeline>} - The updated timeline.
   */
  public addCompanyToTimeline = async (
    carerId: Types.ObjectId,
    newCompanyId: Schema.Types.ObjectId,
    newAgencyStartDate: Date,
    newAgencyDescription: string,
    designation: string
  ): Promise<ITimeline> => {
    let timeline = await TimelineModel.findOne({ carerId });

    if (!timeline) {
      // Create a new timeline if it doesn't exist
      timeline = await TimelineModel.create({
        carerId,
        currentCompany: newCompanyId,
        currentDesignation: designation,
        timeline: [
          {
            dateStarted: newAgencyStartDate,
            dateEnded: null,
            companyId: newCompanyId,
            description: newAgencyDescription,
            currentDesignation: designation,
          },
        ],
      });
      return timeline;
    }

    // Check if there's an existing current agency
    if (timeline.currentCompany?.toString() !== newCompanyId.toString()) {
      // Move the current agency to the previous agencies
      timeline.timeline.unshift({
        dateStarted: timeline.timeline[0]?.dateStarted || new Date(),
        dateEnded: null,
        companyId: timeline.currentCompany,
        description: timeline.timeline[0]?.description || "",
        designation: timeline.currentDesignation,
      });

      // Update the current agency
      timeline.currentCompany = newCompanyId;
      timeline.timeline[0] = {
        dateStarted: newAgencyStartDate,
        dateEnded: null,
        companyId: newCompanyId,
        description: newAgencyDescription,
        designation: designation,
      };
    }

    await timeline.save();
    return timeline;
  };

  /**
   * Removes the current agency from the carer's timeline.
   * @param {Types.ObjectId} carerId - The ID of the carer.
   * @returns {Promise<ITimeline | null>} - The updated timeline or null if not found.
   */
  public removeCurrentCompany = async (
    carerId: Types.ObjectId,
    rating?: number,
    review?: string
  ): Promise<ITimeline | null> => {
    const timeline = await TimelineModel.findOne({ carerId });

    if (!timeline) {
      return null;
    }

    // Move the current agency to the previous agencies
    timeline.timeline.unshift({
      dateStarted: timeline.timeline[0]?.dateStarted || new Date(),
      dateEnded: new Date(),
      companyId: timeline.currentCompany,
      description: timeline.timeline[0]?.description || "",
      designation: timeline.currentDesignation,
      finalRating: rating,
      finalReview: review,
    });

    // Set the current agency to null
    timeline.currentCompany = null;

    await timeline.save();
    return timeline;
  };
}

export default TimelineService;
