// CarerDoc.ts
import mongoose, { Schema } from 'mongoose';
import { ICarerDoc } from 'src/interfaces/entities/carer';

const DocumentSchema = new Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
});

const CarerDocSchema = new Schema({
    carerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documents: [DocumentSchema],
    shareCode: { type: String, required: true },
    niNumber: { type: String, required: true },
});

export default mongoose.model<ICarerDoc>('CarerDoc', CarerDocSchema);