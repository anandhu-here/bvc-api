import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import CustomError from "src/helpers/ErrorHelper";
import { IInvitation } from "src/interfaces/entities/invitation";
import Logger from "src/logger";
import Invitation from "src/models/invitation";
import User from "src/models/User";

class InvService {
  public getInvitations = async (
    userId: string,
    email?: string
  ): Promise<IInvitation[]> => {
    try {
      const invitations = await Invitation.find({
        receiverId: email,
        status: "pending",
      })
        .populate("senderId", "fname lname email company avatar")
        .sort({ createdAt: -1 })
        .populate("senderId", "fname lname email company avatar")
        .sort({ createdAt: -1 })
        .lean();

      let finalData = [];

      for (var invitation of invitations) {
        const user = await User.findById(invitation.senderId).lean().exec();
        if (user) {
          finalData.push({
            ...invitation,
            avatar: user.avatar?.url,
          });
        }
      }

      return finalData;
    } catch (error: any) {
      Logger.error("InvitationService: getInvitations", error);
      throw error;
    }
  };

  public acceptInvitation = async (
    invitationId: string,
    userId: string
  ): Promise<IInvitation> => {
    try {
      const invitation = await Invitation.findById(invitationId);
      if (!invitation) {
        throw new CustomError(
          StringValues.INVITATION_NOT_FOUND,
          StatusCodes.NOT_FOUND
        );
      }

      if (invitation.receiverId !== userId) {
        throw new CustomError(
          StringValues.UNAUTHORIZED_ACCESS,
          StatusCodes.UNAUTHORIZED
        );
      }

      if (invitation.status !== "pending") {
        throw new CustomError(
          StringValues.INVITATION_NO_LONGER_PENDING,
          StatusCodes.BAD_REQUEST
        );
      }

      invitation.status = "accepted";
      await invitation.save();

      return invitation;
    } catch (error: any) {
      Logger.error("InvitationService: acceptInvitation", error);
      throw error;
    }
  };

  public sendInvitation = async (
    senderId: string,
    receiverEmail: string,
    accountType: string,
    companyName: string,
    senderAccountType: string
  ): Promise<IInvitation> => {
    try {
      const sender = await User.findById(senderId);
      if (!sender) {
        throw new CustomError(
          StringValues.SENDER_NOT_FOUND,
          StatusCodes.NOT_FOUND
        );
      }

      const invitation = new Invitation({
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
      Logger.error("InvitationService: sendInvitation", error);
      throw error;
    }
  };

  public updateInvitationStatus = async (
    invitationId: string,
    status: "accepted" | "rejected"
  ): Promise<IInvitation> => {
    try {
      const invitation = await Invitation.findById(invitationId);
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
      Logger.error("InvitationService: updateInvitationStatus", error);
      throw error;
    }
  };

  public getInvitationByToken = async (
    token: string,
    currentUserId?: string
  ): Promise<IInvitation | null> => {
    try {
      console.log(token, "token");
      console.log(currentUserId, "currentUserId");
      const invitation = await Invitation.findOne({ invToken: token }).lean();
      console.log("invitation", invitation);
      if (!invitation) {
        throw new CustomError(
          StringValues.INVITATION_NOT_FOUND,
          StatusCodes.NOT_FOUND
        );
      }

      console.log("currentUserId");
      // Check if the current user is the sender
      if (
        currentUserId &&
        invitation?.senderId?._id.toString() === currentUserId?.toString()
      ) {
        throw new CustomError(
          "Sender cannot retrieve their own invitation",
          StatusCodes.FORBIDDEN
        );
      }

      return invitation;
    } catch (error: any) {
      console.log("error", error);
      Logger.error("InvitationService: getInvitationByToken", error);
      throw error;
    }
  };

  public deleteInvitation = async (
    invitationId: string,
    userId: string
  ): Promise<void> => {
    try {
      const invitation = await Invitation.findById(invitationId);
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

      await Invitation.findByIdAndDelete(invitationId);
    } catch (error: any) {
      Logger.error("InvitationService: deleteInvitation", error);
      throw error;
    }
  };
}

export default InvService;
