import { Types } from "mongoose";
import dayjs from "dayjs";
import Logger from "src/logger";
import ShiftModel from "src/models/Shift";
import TimesheetModel from "src/models/Timesheet";
import ShiftAssignmentModel from "src/models/ShiftAssignment";
import CustomError from "src/helpers/ErrorHelper";
import StatusCodes from "src/constants/statusCodes";

interface StaffMetrics {
  totalStaff: number;
  activeStaff: number;
  utilization: number;
  specializations: Array<{
    name: string;
    count: number;
    utilization: number;
  }>;
}

interface ShiftMetrics {
  total: number;
  filled: number;
  pending: number;
  completed: number;
  fillRate: number;
  completionRate: number;
  byShiftType: Record<
    string,
    {
      total: number;
      filled: number;
      rate: number;
    }
  >;
}

interface RevenueMetrics {
  currentMonth: number;
  previousMonth: number;
  growth: number;
  byShiftType: Record<string, number>;
}

interface CareHomeMetrics {
  total: number;
  active: number;
  newThisMonth: number;
  shiftDistribution: Record<string, number>;
}

class AgencyAnalyticsService {
  private async getDateRange(period: "day" | "week" | "month" | "year") {
    const now = dayjs();
    let startDate, endDate;

    switch (period) {
      case "day":
        startDate = now.startOf("day");
        endDate = now.endOf("day");
        break;
      case "week":
        startDate = now.startOf("week");
        endDate = now.endOf("week");
        break;
      case "month":
        startDate = now.startOf("month");
        endDate = now.endOf("month");
        break;
      case "year":
        startDate = now.startOf("year");
        endDate = now.endOf("year");
        break;
    }

    return {
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
    };
  }

  public async getAgencyDashboardMetrics(agencyId: string) {
    try {
      const [staffMetrics, shiftMetrics, revenueMetrics, careHomeMetrics] =
        await Promise.all([
          this.getStaffMetrics(agencyId),
          this.getShiftMetrics(agencyId),
          this.getRevenueMetrics(agencyId),
          this.getCareHomeMetrics(agencyId),
        ]);

      return {
        staffMetrics,
        shiftMetrics,
        revenueMetrics,
        careHomeMetrics,
      };
    } catch (error) {
      Logger.error("Error fetching agency dashboard metrics:", error);
      throw new CustomError(
        "Failed to fetch dashboard metrics",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getStaffMetrics(agencyId: string): Promise<StaffMetrics> {
    const monthStart = dayjs().startOf("month").toDate();

    try {
      // Get staff assignments for current month
      const staffAssignments = await ShiftAssignmentModel.aggregate([
        {
          $lookup: {
            from: "shifts",
            localField: "shift",
            foreignField: "_id",
            as: "shift",
          },
        },
        {
          $unwind: "$shift",
        },
        {
          $match: {
            "shift.agentId": new Types.ObjectId(agencyId),
            "shift.date": { $gte: monthStart.toISOString() },
          },
        },
        {
          $group: {
            _id: "$user",
            shiftsCompleted: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            totalShifts: { $sum: 1 },
          },
        },
      ]);

      // Consider staff active if they've completed at least one shift
      const activeStaff = staffAssignments.filter(
        (staff) => staff.shiftsCompleted > 0
      );

      return {
        totalStaff: staffAssignments.length,
        activeStaff: activeStaff.length,
        utilization: staffAssignments.length
          ? (activeStaff.length / staffAssignments.length) * 100
          : 0,
        specializations: await this.getSpecializationBreakdown(agencyId),
      };
    } catch (error) {
      Logger.error("Error getting staff metrics:", error);
      throw new CustomError(
        "Failed to get staff metrics",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getShiftMetrics(agencyId: string): Promise<ShiftMetrics> {
    const { startDate, endDate } = await this.getDateRange("month");

    try {
      const shifts = await ShiftModel.aggregate([
        {
          $match: {
            agentId: new Types.ObjectId(agencyId),
            date: {
              $gte: startDate.toISOString(),
              $lte: endDate.toISOString(),
            },
          },
        },
        {
          $lookup: {
            from: "shiftpatterns",
            localField: "shiftPattern",
            foreignField: "_id",
            as: "patternData",
          },
        },
        {
          $unwind: "$patternData",
        },
        {
          $group: {
            _id: "$patternData.name",
            total: { $sum: 1 },
            filled: {
              $sum: { $cond: [{ $eq: ["$isAccepted", true] }, 1, 0] },
            },
            completed: {
              $sum: { $cond: [{ $eq: ["$isCompleted", true] }, 1, 0] },
            },
          },
        },
      ]);

      const totals = shifts.reduce(
        (acc, curr) => ({
          total: acc.total + curr.total,
          filled: acc.filled + curr.filled,
          completed: acc.completed + curr.completed,
        }),
        { total: 0, filled: 0, completed: 0 }
      );

      const byShiftType = shifts.reduce((acc, curr) => {
        acc[curr._id] = {
          total: curr.total,
          filled: curr.filled,
          rate: (curr.filled / curr.total) * 100,
        };
        return acc;
      }, {});

      return {
        total: totals.total,
        filled: totals.filled,
        pending: totals.total - totals.filled,
        completed: totals.completed,
        fillRate: totals.total ? (totals.filled / totals.total) * 100 : 0,
        completionRate: totals.filled
          ? (totals.completed / totals.filled) * 100
          : 0,
        byShiftType,
      };
    } catch (error) {
      Logger.error("Error getting shift metrics:", error);
      throw new CustomError(
        "Failed to get shift metrics",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getRevenueMetrics(agencyId: string): Promise<RevenueMetrics> {
    try {
      const currentMonth = dayjs().startOf("month");
      const previousMonth = currentMonth.subtract(1, "month");

      const [currentRevenue, previousRevenue] = await Promise.all([
        this.calculateMonthlyRevenue(agencyId, currentMonth.toDate()),
        this.calculateMonthlyRevenue(agencyId, previousMonth.toDate()),
      ]);

      const growth = previousRevenue
        ? ((currentRevenue.total - previousRevenue.total) /
            previousRevenue.total) *
          100
        : 0;

      return {
        currentMonth: currentRevenue.total,
        previousMonth: previousRevenue.total,
        growth,
        byShiftType: currentRevenue.byShiftType,
      };
    } catch (error) {
      Logger.error("Error getting revenue metrics:", error);
      throw new CustomError(
        "Failed to get revenue metrics",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getCareHomeMetrics(agencyId: string): Promise<CareHomeMetrics> {
    const monthStart = dayjs().startOf("month").toDate();

    try {
      const homes = await ShiftModel.aggregate([
        {
          $match: {
            agentId: new Types.ObjectId(agencyId),
          },
        },
        {
          $group: {
            _id: "$homeId",
            totalShifts: { $sum: 1 },
            recentShifts: {
              $sum: {
                $cond: [{ $gte: ["$date", monthStart.toISOString()] }, 1, 0],
              },
            },
          },
        },
      ]);

      const activeHomes = homes.filter((home) => home.recentShifts > 0);

      return {
        total: homes.length,
        active: activeHomes.length,
        newThisMonth: homes.filter(
          (home) => home.totalShifts === home.recentShifts
        ).length,
        shiftDistribution: homes.reduce((acc, home) => {
          acc[home._id.toString()] = home.totalShifts;
          return acc;
        }, {}),
      };
    } catch (error) {
      Logger.error("Error getting care home metrics:", error);
      throw new CustomError(
        "Failed to get care home metrics",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async getSpecializationBreakdown(agencyId: string) {
    // Implementation would depend on your user/staff model structure
    // This is a placeholder that returns dummy data
    return [
      { name: "Registered Nurses", count: 45, utilization: 85 },
      { name: "Healthcare Assistants", count: 78, utilization: 72 },
      { name: "Mental Health Nurses", count: 32, utilization: 64 },
    ];
  }

  private async calculateMonthlyRevenue(agencyId: string, date: Date) {
    const startOfMonth = dayjs(date).startOf("month").toDate();
    const endOfMonth = dayjs(date).endOf("month").toDate();

    const timesheets = await TimesheetModel.aggregate([
      {
        $match: {
          agency: new Types.ObjectId(agencyId),
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
          status: "approved",
        },
      },
      {
        $lookup: {
          from: "shifts",
          localField: "shift_",
          foreignField: "_id",
          as: "shift",
        },
      },
      {
        $unwind: "$shift",
      },
      {
        $group: {
          _id: "$shift.shiftPattern",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const total = timesheets.reduce((sum, t) => sum + t.total, 0);
    const byShiftType = timesheets.reduce((acc, t) => {
      acc[t._id.toString()] = t.total;
      return acc;
    }, {});

    return { total, byShiftType };
  }

  public async getStaffingDemandTrends(
    agencyId: string,
    period: "week" | "month" = "week"
  ) {
    const { startDate, endDate } = await this.getDateRange(period);

    try {
      return await ShiftModel.aggregate([
        {
          $match: {
            agentId: new Types.ObjectId(agencyId),
            date: {
              $gte: startDate.toISOString(),
              $lte: endDate.toISOString(),
            },
          },
        },
        {
          $group: {
            _id: "$date",
            totalDemand: { $sum: "$count" },
            filled: {
              $sum: { $size: "$assignedUsers" },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
    } catch (error) {
      Logger.error("Error getting staffing demand trends:", error);
      throw new CustomError(
        "Failed to get staffing trends",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async getUpcomingRequirements(agencyId: string) {
    const startDate = dayjs().toDate();
    const endDate = dayjs().add(7, "days").toDate();

    try {
      return await ShiftModel.aggregate([
        {
          $match: {
            agentId: new Types.ObjectId(agencyId),
            date: {
              $gte: startDate.toISOString(),
              $lte: endDate.toISOString(),
            },
            isCompleted: false,
          },
        },
        {
          $lookup: {
            from: "shiftpatterns",
            localField: "shiftPattern",
            foreignField: "_id",
            as: "pattern",
          },
        },
        {
          $unwind: "$pattern",
        },
        {
          $group: {
            _id: "$pattern.name",
            required: { $sum: "$count" },
            filled: { $sum: { $size: "$assignedUsers" } },
            urgent: {
              $sum: {
                $cond: [
                  {
                    $lte: [
                      "$date",
                      dayjs().add(2, "days").toDate().toISOString(),
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);
    } catch (error) {
      Logger.error("Error getting upcoming requirements:", error);
      throw new CustomError(
        "Failed to get upcoming requirements",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export default AgencyAnalyticsService;
