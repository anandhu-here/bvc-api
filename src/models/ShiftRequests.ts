import { request } from "http";
import mongoose, { Schema } from "mongoose";


export interface IShiftRequests extends Document {
    org: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    requestType: string;
    requestStatus: string;
    shift: mongoose.Types.ObjectId;
    message: string;
    additionalData: any;
}


const ShiftRequestsSchema = new Schema({
    org: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    requestType: {
        type: String,
        enum: ["shiftSwap", "shiftCover", "shiftChange", "ShiftCancel"],
        required: true,
    },
    requestStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    shift: {
        type: Schema.Types.ObjectId,
        ref: "Shift",
        required: true,
    },
    message: {
        type: String,
    },

    additionalData: {
        type: Schema.Types.Mixed,
    },

})




const ShiftRequests = mongoose.model<IShiftRequests>("ShiftRequests", ShiftRequestsSchema);
export default ShiftRequests;