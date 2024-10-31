export interface IInvoiceCreate {
  homeId: string;
  agencyId: string;
  homeName: string;
  homeAddress: string;
  homeEmail: string;
  homePhone: string;
  dueDate: Date;
  totalAmount: number;
  shiftSummary: {
    [shiftType: string]: {
      count: number;
      totalHours: number;
      weekdayHours: number;
      weekendHours: number;
      weekdayRate: number;
      weekendRate: number;
      totalAmount: number;
    };
  };
  timesheets: string[];
}

export interface IInvoiceUpdate {
  status?: "pending" | "paid" | "overdue";
}
