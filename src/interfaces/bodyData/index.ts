import type { ICompany } from "../entities/company";

export interface IRegisterBodyData {
  fname: string;
  lname: string;
  email: string;
  password: string;
  confirmPassword?: string;
  company: ICompany;
  accountType?:
    | "carer"
    | "agency"
    | "home"
    | "admin"
    | "superadmin"
    | "user"
    | "guest"
    | "unknown";
}

export interface ILoginBodyData {
  email?: string;
  password?: string;
  otp?: string;
}
