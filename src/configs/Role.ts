import mongoose, { Schema, Document, Model, Types } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Enums

export enum Role {
  OWNER = "owner",
  ADMIN = "admin",
  MANAGER = "manager",
  CARER = "carer",
  SENIOR_CARER = "senior_carer",
  NURSE = "nurse",
  HR_MANAGER = "hr_manager",
  ACCOUNTING_MANAGER = "accounting_manager",
  STAFF = "staff",
}

export enum StaffType {
  CARE = "care",
  ADMIN = "admin",
  OTHER = "other",
}

export const RoleToStaffType: { [key in Role]: StaffType } = {
  [Role.OWNER]: StaffType.ADMIN,
  [Role.ADMIN]: StaffType.ADMIN,
  [Role.MANAGER]: StaffType.ADMIN,
  [Role.CARER]: StaffType.CARE,
  [Role.SENIOR_CARER]: StaffType.CARE,
  [Role.NURSE]: StaffType.CARE,
  [Role.HR_MANAGER]: StaffType.ADMIN,
  [Role.ACCOUNTING_MANAGER]: StaffType.ADMIN,
  [Role.STAFF]: StaffType.OTHER,
};
