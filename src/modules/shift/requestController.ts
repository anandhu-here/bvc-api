import { IShiftRequests } from "src/models/ShiftRequests";
import ShiftRequestServices from "src/services/ShiftRequestService";
import {
    IRequest,
    IResponse,
} from 'src/interfaces/core/new';



class ShiftRequestsController{
    private shiftReqSvc: ShiftRequestServices;
    constructor(){
        this.shiftReqSvc = new ShiftRequestServices();
    }
//     public  = async (
//         req: IRequest,
//         res: Response
//       ): Promise<void> => {
// }

    public getShiftRequestById = async (req: IRequest, res: IResponse): Promise<void> => {
        try {
            const shiftRequest: IShiftRequests = await this.shiftReqSvc.getShiftRequestById(req.params.id);
            res.status(200).json(shiftRequest);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    public getShiftRequestsByOrg = async (req: IRequest, res: IResponse): Promise<void> => {
        try {
            const shiftRequests: IShiftRequests[] = await this.shiftReqSvc.getShiftRequestsByOrg(req.params.orgId);
            res.status(200).json(shiftRequests);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    public createShiftRequest = async (req: IRequest, res: IResponse): Promise<void> => {
        try {
            const shiftRequest: IShiftRequests = await this.shiftReqSvc.createShiftRequest(req.body);
            res.status(201).json(shiftRequest);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    

}