import ShiftRequests, { IShiftRequests } from "src/models/ShiftRequests";
import ShiftService from "./ShiftService";
import Logger from "src/logger";
import PushNotification from "./PushNotificationService";
import { OrganizationRole } from "src/models/new/Heirarchy";
import { FCMToken } from "src/models/new/FCM";



class ShiftRequestServices {    
    private shiftSvc: ShiftService;
    private pushSvc: PushNotification;
    constructor(){
        this.shiftSvc = new ShiftService();
        this.pushSvc = PushNotification.getInstance();
    }


    private async sendShiftRequestNotifications(
        organizationId: string,
        requestingUser: any,
        organization: any
      ) {
        try {
          // Fetch all admin roles for the organization
          const adminRoles = await OrganizationRole.find({
            organization: organizationId,
            role: "admin",
          });
    
          if (adminRoles.length === 0) {
            Logger.warn(`No admin roles found for organization: ${organizationId}`);
            return;
          }
    
          const adminUserIds = adminRoles.map((role) => role.user.toString());
    
          // Fetch FCM tokens for all admin users
          const adminTokens = await FCMToken.find({
            user: { $in: adminUserIds },
          });
    
          if (adminTokens.length === 0) {
            Logger.warn(
              `No FCM tokens found for admins of organization: ${organizationId}`
            );
            return;
          }
    
          const notificationPayload = {

            notification: {
              title: "New Shift Request",
              body: `${requestingUser.firstName} ${requestingUser.lastName} has requested to swap a shift.`,
            },
            data: {
              organizationId: organization._id.toString(),
              requestingUserId: requestingUser._id.toString(),
              type: "NEW_SHIFT_REQUEST",
              url: `${process.env.FRONTEND_URL}`,
            },
          };
    
          const tokens = adminTokens.map((token) => token.token);
          await this.pushSvc.sendToMultipleDevices(tokens, notificationPayload);
          Logger.info(
            `Join request notification sent to ${tokens.length} admin devices for organization ${organizationId}`
          );
        } catch (error) {
          Logger.error(
            `Error sending join request notification for organization ${organizationId}:`,
            error
          );
        }
      }


    public async getShiftRequestById(id: string): Promise<IShiftRequests> {
        return await ShiftRequests.findById(id);
    }

    public async getShiftRequestsByOrg(orgId: string): Promise<IShiftRequests[]> {
        return await ShiftRequests.find({ org: orgId });
    }

    public async createShiftRequest(shiftRequest: IShiftRequests): Promise<IShiftRequests> {
        if(shiftRequest.requestType === "shiftSwap"){
            
            await this.sendShiftRequestNotifications
            (shiftRequest.org.toString(), shiftRequest.user, shiftRequest.org);
        }

        return await ShiftRequests.create(shiftRequest);
    }

    public async approveShiftRequest(id: string): Promise<IShiftRequests> {
        try {
            const shiftRequest = await ShiftRequests.findById(id).lean();
            if (shiftRequest.requestType === "shiftSwap") {
                const  otherUserId = shiftRequest.additionalData?.otherUserId;
                const shiftId = shiftRequest.shift;

                const shift = await this.shiftSvc.swapAssignedUsers(shiftId.toString(), shiftRequest.user.toString(), otherUserId);

                return await ShiftRequests.findByIdAndUpdate(id, { requestStatus: "approved" }, { new: true });
            }
            else{
                return await ShiftRequests.findByIdAndUpdate(id, { requestStatus: "approved" }, { new: true });
            }
        } catch (error) {
            throw error;
        }
    }

    public async rejectShiftRequest(id: string): Promise<IShiftRequests> {
        return await ShiftRequests.findByIdAndUpdate
        (id, { requestStatus: "rejected" }, { new: true });

    }

}


export default ShiftRequestServices;