import StatusCodes from "src/constants/statusCodes";
import StringValues from "src/constants/strings";
import CustomError from "src/helpers/ErrorHelper";
import { IJoinInvitation } from "src/interfaces/entities/invitations";
import Logger from "src/logger";
import User from "src/models/User";
import Invitations from "src/models/invitations";

class InvitationService {
  /**
   * @name getInvitationsExc
   * @description Get all invitations for a user (sent and received).
   * @param userId string
   * @returns Promise<IJoinInvitation[]>
   */
  public getInvitationsExc = async (
    userId: string
  ): Promise<IJoinInvitation[]> => {
    try {
      const invitations = await Invitations.find({
        $and: [
          { $or: [{ senderId: userId }, { receiverId: userId }] },
          { status: "pending" },
        ],
      })
        .populate("senderId", "fname lname email companyName")
        .populate("receiverId", "fname lname email companyName")
        .sort({ createdAt: -1 });

      return invitations;
    } catch (error: any) {
      Logger.error(
        "InvitationService: getInvitationsExc",
        "errorInfo:" + JSON.stringify(error)
      );
      throw error;
    }
  };
  /**
   * @name sendInvitationExc
   * @description Send a join invitation to another user.
   * @param senderId string
   * @param receiverId string
   * @returns Promise<IJoinInvitation>
   */

  public sendInvitationExc = async (
    senderId: string,
    receiverId: string,
    senderAccountType: string
  ): Promise<IJoinInvitation> => {
    try {
      const sender = await User.findById(senderId);
      if (!sender) {
        throw new Error(StringValues.SENDER_NOT_FOUND);
      }

      const receiver = await User.findById(receiverId);
      if (!receiver) {
        throw new Error(StringValues.RECEIVER_NOT_FOUND);
      }

      const invitation = new Invitations({
        senderId,
        receiverId,
        senderAccountType,
        companyName: ["carer", "nurse"].includes(sender.accountType)
          ? `${sender.fname} ${sender.lname}`
          : sender.company?.name, // Assuming the user model has a companyName field
      });

      await invitation.save();

      return invitation;
    } catch (error: any) {
      Logger.error(
        "InvitationService: sendInvitationExc",
        "errorInfo:" + JSON.stringify(error)
      );
      throw error;
    }
  };

  /**
   * @name acceptInvitationExc
   * @description Accept a join invitation.
   * @param invitationId string
   * @param userId string
   * @returns Promise<IJoinInvitation>
   */
  public acceptInvitationExc = async (
    invitationId: string,
    userId: string
  ): Promise<IJoinInvitation> => {
    try {
      const invitation = await Invitations.findById(invitationId);
      console.log(invitation, "invitation");
      if (!invitation) {
        throw new CustomError(
          StringValues.INVITATION_NOT_FOUND,
          StatusCodes.NOT_FOUND
        );
      }
      console.log(userId, "userId");

      if (invitation.receiverId.toString() !== userId.toString()) {
        throw new CustomError(
          "Unauthorized to accept invitation",
          StatusCodes.UNAUTHORIZED
        );
      }

      if (invitation.status !== "pending") {
        throw new Error(StringValues.INVITATION_NO_LONGER_PENDING);
      }

      invitation.status = "accepted";
      await invitation.save();

      // Here you might want to add logic to update user roles or relationships

      return invitation;
    } catch (error: any) {
      console.log(error, "error andi");
      if (error instanceof CustomError) {
        throw error.message;
      }
      throw error;
    }
  };

  /**
   * @name rejectInvitationExc
   * @description Reject a join invitation.
   * @param invitationId string
   * @param userId string
   * @returns Promise<IJoinInvitation>
   */
  public rejectInvitationExc = async (
    invitationId: string,
    userId: string
  ): Promise<IJoinInvitation> => {
    try {
      const invitation = await Invitations.findById(invitationId);
      if (!invitation) {
        throw new CustomError(
          StringValues.INVITATION_NOT_FOUND,
          StatusCodes.NOT_FOUND
        );
      }

      if (invitation.receiverId.toString() !== userId.toString()) {
        throw new CustomError(
          "Unauthorized to reject invitation",
          StatusCodes.UNAUTHORIZED
        );
      }

      if (invitation.status !== "pending") {
        throw new Error(StringValues.INVITATION_NO_LONGER_PENDING);
      }

      invitation.status = "rejected";
      await invitation.save();

      return invitation;
    } catch (error: any) {
      Logger.error(
        "InvitationService: rejectInvitationExc",
        "errorInfo:" + JSON.stringify(error)
      );
      throw error;
    }
  };
  /**
   * @name cancelInvitationExc
   * @description Cancel a join invitation (sender only).
   * @param invitationId string
   * @param userId string
   * @returns Promise<void>
   */
  public cancelInvitationExc = async (
    invitationId: string,
    userId: string
  ): Promise<void> => {
    try {
      const invitation = await Invitations.findById(invitationId);
      if (!invitation) {
        throw new Error(StringValues.INVITATION_NOT_FOUND);
      }

      if (invitation.senderId.toString() !== userId.toString()) {
        if (invitation.status !== "rejected") {
          throw new Error(StringValues.UNAUTHORIZED_TO_CANCEL_INVITATION);
        }
      }

      await Invitations.findByIdAndDelete(invitationId);
    } catch (error: any) {
      Logger.error(
        "InvitationService: cancelInvitationExc",
        "errorInfo:" + JSON.stringify(error)
      );
      throw error;
    }
  };
}

export default InvitationService;
