import type { IRequest } from "../core/express";

export interface RequestShiftType extends IRequest {
  shiftTypeId?: string;
  userId?: string;
}
