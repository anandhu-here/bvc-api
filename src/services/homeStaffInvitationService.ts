import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import CustomError from "src/helpers/ErrorHelper";
import { IHomeStaffINvitiation } from "src/interfaces/entities/home-staff-invitation";
import Logger from "src/logger";
import HomeStaffInvitation from "src/models/homeStaffInvitation";
import User from "src/models/User";

class HomeStaffInvitationService {
  public getInvitations = async (
    userId: string
  ): Promise<IHomeStaffINvitiation[]> => {
    try {
      const invitations = await HomeStaffInvitation.find({
        $or: [{ senderId: userId }, { receiverId: userId }],
      })
        .populate("senderId", "fname lname email company")
        .sort({ createdAt: -1 });

      return invitations;
    } catch (error: any) {
      Logger.error("HomeStaffInvitationService: getInvitations", error);
      throw error;
    }
  };

  public sendInvitation = async (
    senderId: string,
    receiverEmail: string,
    accountType: string,
    companyName: string,
    senderAccountType: string
  ): Promise<IHomeStaffINvitiation> => {
    try {
      const sender = await User.findById(senderId);
      if (!sender) {
        throw new CustomError(
          StringValues.SENDER_NOT_FOUND,
          StatusCodes.NOT_FOUND
        );
      }

      const invitation = new HomeStaffInvitation({
        senderId,
        receiverId: receiverEmail,
        accountType,
        companyName,
        senderAccountType,
        status: "pending",
      });

      const token = await invitation.generateToken();
      await invitation.save();

      return invitation;
    } catch (error: any) {
      Logger.error("HomeStaffInvitationService: sendInvitation", error);
      throw error;
    }
  };

  public updateInvitationStatus = async (
    invitationId: string,
    status: "accepted" | "rejected"
  ): Promise<IHomeStaffINvitiation> => {
    try {
      const invitation = await HomeStaffInvitation.findById(invitationId);
      if (!invitation) {
        throw new CustomError(
          StringValues.INVITATION_NOT_FOUND,
          StatusCodes.NOT_FOUND
        );
      }

      if (invitation.status !== "pending") {
        throw new CustomError(
          StringValues.INVITATION_NO_LONGER_PENDING,
          StatusCodes.BAD_REQUEST
        );
      }

      invitation.status = status;
      await invitation.save();

      return invitation;
    } catch (error: any) {
      Logger.error("HomeStaffInvitationService: updateInvitationStatus", error);
      throw error;
    }
  };

  public getInvitationByToken = async (
    token: string
  ): Promise<IHomeStaffINvitiation | null> => {
    try {
      const invitation = await HomeStaffInvitation.findOne({ invToken: token });
      if (!invitation) {
        throw new CustomError(
          StringValues.INVITATION_NOT_FOUND,
          StatusCodes.NOT_FOUND
        );
      }

      return invitation;
    } catch (error: any) {
      Logger.error("HomeStaffInvitationService: getInvitationByToken", error);
      throw error;
    }
  };

  public deleteInvitation = async (
    invitationId: string,
    userId: string
  ): Promise<void> => {
    try {
      const invitation = await HomeStaffInvitation.findById(invitationId);
      if (!invitation) {
        throw new CustomError(
          StringValues.INVITATION_NOT_FOUND,
          StatusCodes.NOT_FOUND
        );
      }

      if (invitation.senderId.toString() !== userId) {
        throw new CustomError(
          "Unauthorized to delete invitation",
          StatusCodes.UNAUTHORIZED
        );
      }

      await HomeStaffInvitation.findByIdAndDelete(invitationId);
    } catch (error: any) {
      Logger.error("HomeStaffInvitationService: deleteInvitation", error);
      throw error;
    }
  };
}

export default HomeStaffInvitationService;
