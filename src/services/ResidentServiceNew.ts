import { Types } from "mongoose";
import { DateTime } from "luxon";
import { Resident, IResident } from "src/models/care/ResidentModel";
import {
  Task,
  ITask,
  ITaskData,
  ITaskFrequency,
} from "src/models/care/TaskModel";
import { HistoricalTask, IHistoricalTask } from "src/models/care/HistoricTasks";
import { CarePlan, ICarePlan } from "src/models/care/care-plan";
import { Organization } from "src/models/new/Heirarchy";
import PlanRestrictionService from "./PlanRestrictionService";
import dayjs from "dayjs";
import moment from "moment";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import TaskService from "./care/TaskServices";
import { TaskBakup } from "src/models/care/TaskBackup";
import { ResidentBackup } from "src/models/care/ResidentBackup";
import ShiftService from "./ShiftService";

dayjs.extend(utc);
dayjs.extend(timezone);

interface TaskSummary {
  upcoming: number;
  pending: number;
  overdue: number;
  total: number;
  urgency: "white" | "green" | "amber" | "red";
}

export class ResidentService {
  private readonly timezone: string = "Europe/London";
  private planRestrictionService: PlanRestrictionService;
  private taskSvc: TaskService;
  private shiftSvc: ShiftService;

  constructor() {
    this.planRestrictionService = new PlanRestrictionService();
    this.shiftSvc = new ShiftService();
    this.taskSvc = TaskService.getInstance();
  }

  // Resident Management
  async createResident(
    residentData: Partial<IResident>,
    orgId: Types.ObjectId
  ): Promise<IResident> {
    const resident = new Resident({
      ...residentData,
      orgId: orgId,
    });
    return await resident.save();
  }
  async deleteResident(residentId: string): Promise<IResident | null> {
    const residentTasks = await Task.find({
      resident: new Types.ObjectId(residentId),
    });
    await Task.deleteMany({ resident: new Types.ObjectId(residentId) });
    await ResidentBackup.create(await Resident.findById(residentId).lean());
    await TaskBakup.insertMany(residentTasks);

    return await Resident.findByIdAndDelete(residentId);
  }

  async getResident(residentId: string): Promise<IResident | null> {
    return await Resident.findById(residentId).lean();
  }

  async updateResident(
    residentId: string,
    updateData: Partial<IResident>
  ): Promise<IResident | null> {
    return await Resident.findByIdAndUpdate(residentId, updateData, {
      new: true,
      lean: true,
    });
  }

  async checkOverDueTasks(orgId: Types.ObjectId): Promise<void> {
    const now = dayjs().tz(this.timezone);
    const overdueTasks = await Task.find({
      orgId: orgId,
      status: { $in: ["upcoming", "pending"] },
      dueDate: { $lt: now.toDate() },
    }).lean();

    console.log("Overdue tasks:", overdueTasks);
  }

  async checkUpcomingTasks(orgId: Types.ObjectId): Promise<void> {
    const now = dayjs().tz(this.timezone);
    const upcomingTasks = await Task.find({
      orgId: orgId,
      status: "upcoming",
      dueDate: { $lte: now.add(10, "minute").toDate() },
    }).lean();

    console.log("Upcoming tasks:", upcomingTasks);
  }

  async handleUpcomingTasks(orgId: Types.ObjectId): Promise<void> {
    const now = dayjs().tz(this.timezone);
    await Task.updateMany(
      {
        orgId: orgId,
        status: "upcoming",
        dueDate: { $lte: now.add(1, "minute").toDate() },
      },
      { $set: { status: "pending" } }
    );
  }

  async getAllResidents(orgId: Types.ObjectId): Promise<any> {
    const residents = await Resident.find({ orgId }).lean();

    const residentIds = residents.map((resident) => resident._id) as string[];
    const taskSummaries =
      await this.taskSvc.processAndSummarizeTasksForOrganization(
        orgId.toString()
      );

    return residents.map((resident) => ({
      ...resident,
      taskSummary: taskSummaries[resident._id.toString()] || {
        upcoming: 0,
        pending: 0,
        overdue: 0,
        total: 0,
        urgency: "white",
      },
    }));
  }

  async handleOverdueTasks(orgId: Types.ObjectId): Promise<void> {
    const now = dayjs().tz(this.timezone);
    const overdueTasks = await Task.find({
      orgId: orgId,
      status: { $in: ["upcoming", "pending"] },
      dueDate: { $lt: now.subtract(15, "minute").toDate() },
    }).lean();

    const bulkOps = overdueTasks.map((task) => ({
      deleteOne: {
        filter: { _id: task._id },
      },
    }));

    const historicalTasks = overdueTasks.map((task) => ({
      orgId: task.orgId,
      originalTask: task._id,
      resident: task.resident,
      taskName: task.taskName,
      taskType: task.taskType,
      dueDate: task.dueDate,
      completedDate: now.toDate(),
      completedBy: new Types.ObjectId("000000000000000000000000"), // System user ID
      status: "missed",
      notes:
        "Task automatically marked as missed due to being overdue by more than 15 minutes",
    }));

    await Promise.all([
      Task.bulkWrite(bulkOps),
      HistoricalTask.insertMany(historicalTasks),
    ]);
  }

  private summarizeTasks(tasks: ITask[]): TaskSummary {
    const now = dayjs().tz(this.timezone);
    let upcoming = 0,
      pending = 0,
      overdue = 0;

    tasks.forEach((task) => {
      const dueDate = dayjs(task.dueDate).tz(this.timezone);
      const minutesDifference = dueDate.diff(now, "minute");

      if (task.status === "pending") {
        pending++;
      } else if (minutesDifference < -30) {
        overdue++;
      } else if (minutesDifference <= 15) {
        upcoming++;
      }
    });

    let urgency: "white" | "green" | "amber" | "red" = "white";
    if (overdue > 0) urgency = "red";
    else if (pending > 0) urgency = "amber";
    else if (upcoming > 0) urgency = "green";

    return { upcoming, pending, overdue, total: tasks.length, urgency };
  }

  async createMultipleTasks(
    tasksData: Partial<ITask>[],
    orgId: Types.ObjectId
  ): Promise<ITask[]> {
    const createdTasks: ITask[] = [];

    for (const taskData of tasksData) {
      try {
        const task = await this.createTask(
          {
            ...taskData,
          },
          orgId
        );
        createdTasks.push(task);
      } catch (error) {
        console.error(`Error creating task: ${error.message}`);
      }
    }

    return createdTasks;
  }

  async createTask(
    taskData: Partial<ITask>,
    orgId: Types.ObjectId | string
  ): Promise<ITask> {
    const { frequency, dueDate } = taskData;

    if (
      !frequency ||
      (["daily", "weekly", "monthly"].includes(frequency.type) &&
        !frequency.timeOfDay)
    ) {
      throw new Error("Invalid frequency data");
    }

    const now = dayjs().tz(this.timezone);

    // Parse the dueDate as UTC, then convert to the desired timezone
    let taskDueDate = dueDate ? dayjs(dueDate).tz(this.timezone) : now;

    console.log("Parsed taskDueDate:", taskDueDate.format());

    if (frequency.type !== "frequent" && frequency.type !== "one-time") {
      const [hours, minutes] = frequency.timeOfDay!.split(":").map(Number);

      // Set the time component while preserving the date and timezone
      taskDueDate = taskDueDate.hour(hours).minute(minutes).second(0);

      console.log("After setting time:", taskDueDate.format());

      // If the calculated due date is in the past, move it to the next day
      if (taskDueDate.isBefore(now)) {
        taskDueDate = taskDueDate.add(1, "day");
        console.log("Moved to next day:", taskDueDate.format());
      }
    }

    const nextOccurrence =
      frequency.type === "one-time"
        ? null
        : this.calculateNextOccurrence(taskDueDate, frequency);

    console.log("Final taskDueDate:", taskDueDate.format());
    console.log(
      "Next occurrence:",
      nextOccurrence ? nextOccurrence.format() : "N/A"
    );

    const task = new Task({
      ...taskData,
      status: "idle",
      orgId: orgId,
      dueDate: taskDueDate.toDate(),
      nextOccurrence: nextOccurrence ? nextOccurrence.toDate() : null,
    });

    await task.save();
    return task;
  }

  private calculateNextOccurrence(
    fromDate: dayjs.Dayjs,
    frequency: ITaskFrequency
  ): dayjs.Dayjs | null {
    switch (frequency.type) {
      case "frequent":
        return fromDate.add(frequency.interval!, "minute");
      case "daily":
        return fromDate.add(1, "day");
      case "weekly":
        return fromDate.add(1, "week");
      case "monthly":
        return fromDate.add(1, "month");
      case "one-time":
        return null;
      default:
        throw new Error("Invalid frequency type");
    }
  }

  async completeTask(
    taskId: string,
    userId: string,
    taskData: ITaskData,
    status?: string,
    notes?: string
  ): Promise<ITask | null> {
    try {
      const task = await Task.findById(taskId);
      if (!task) throw new Error("Task not found");

      const now = dayjs().tz(this.timezone);
      console.log(taskData, "...");

      await HistoricalTask.create({
        orgId: task.orgId,
        originalTask: task._id,
        resident: task.resident,
        taskName: task.taskName,
        taskType: task.taskType,
        dueDate: task.dueDate,
        completedDate: now.toDate(),
        completedBy: new Types.ObjectId(userId),
        notes: notes,
        taskData: taskData,
        status: status || "completed",
      });

      if (task.frequency.type !== "one-time") {
        await this.createNextOccurrence(task);
      }

      await Task.findByIdAndDelete(taskId);

      return task;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  private async createNextOccurrence(completedTask: ITask): Promise<void> {
    if (completedTask.frequency.type === "one-time") {
      return; // Don't create a next occurrence for one-time tasks
    }

    const now = dayjs().tz(this.timezone);
    const taskDueDate = dayjs(completedTask.dueDate).tz(this.timezone);
    let nextDueDate: dayjs.Dayjs;

    if (completedTask.frequency.type === "daily") {
      // For daily tasks, always set the next occurrence to the next day
      nextDueDate = now
        .add(1, "day")
        .hour(taskDueDate.hour())
        .minute(taskDueDate.minute())
        .second(0);
    } else {
      // For weekly and monthly tasks, calculate based on the original due date
      nextDueDate = this.calculateNextDueDate(
        taskDueDate,
        completedTask.frequency
      );
    }

    // Ensure the next due date is in the future
    while (nextDueDate.isBefore(now)) {
      nextDueDate = this.calculateNextDueDate(
        nextDueDate,
        completedTask.frequency
      );
    }

    await this.createTask(
      {
        resident: completedTask.resident,
        taskName: completedTask.taskName,
        description: completedTask.description,
        taskType: completedTask.taskType,
        frequency: completedTask.frequency,
        dueDate: nextDueDate.toDate(),
        status: "upcoming",
      },
      completedTask.orgId
    );
  }

  private calculateNextDueDate(
    fromDate: dayjs.Dayjs,
    frequency: ITaskFrequency
  ): dayjs.Dayjs {
    const [hours, minutes] = frequency.timeOfDay!.split(":").map(Number);

    switch (frequency.type) {
      case "frequent":
        return fromDate.add(frequency.interval!, "minute");
      case "daily":
        return fromDate.add(1, "day").hour(hours).minute(minutes).second(0);
      case "weekly":
        return fromDate.add(1, "week").hour(hours).minute(minutes).second(0);
      case "monthly":
        return fromDate.add(1, "month").hour(hours).minute(minutes).second(0);
      case "one-time":
        throw new Error("One-time tasks do not have a next due date");
      default:
        throw new Error("Invalid frequency type");
    }
  }

  private calculateInitialDueDate(
    now: dayjs.Dayjs,
    frequency: ITaskFrequency
  ): dayjs.Dayjs {
    if (frequency.type === "frequent") {
      return now.add(frequency.interval!, "minute");
    }

    const [hour, minute] = frequency.timeOfDay!.split(":").map(Number);
    let dueDate = now.hour(hour).minute(minute).second(0);

    if (dueDate.isBefore(now)) {
      dueDate = dueDate.add(1, "day");
    }

    return dueDate;
  }

  async getResidentTasks(residentId: string): Promise<ITask[]> {
    return await Task.find({
      resident: new Types.ObjectId(residentId),
      status: { $in: ["upcoming", "pending", "idle", "overdue"] },
    })
      .sort({ dueDate: 1 })
      .lean();
  }

  private setTimeOfDay(date: DateTime, timeOfDay: string): DateTime {
    const [hour, minute] = timeOfDay.split(":").map(Number);
    return date.set({ hour, minute, second: 0, millisecond: 0 });
  }
  public async updatePersonalInfo(
    id: string,
    updateData: Partial<IResident>
  ): Promise<IResident> {
    const resident = await Resident.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!resident) {
      throw new Error("Resident not found");
    }
    return resident;
  }

  public async getCarePlanByResidentId(
    residentId: string,
    orgId: Types.ObjectId
  ): Promise<ICarePlan> {
    const carePlan = await CarePlan.findOne({
      resident: residentId,
      orgId: orgId,
    }).lean();
    if (!carePlan) {
      throw new Error("Care plan not found");
    }
    return carePlan;
  }

  public async updateCarePlan(
    residentId: string,
    updateData: Partial<ICarePlan>,
    orgId: Types.ObjectId
  ): Promise<ICarePlan> {
    const carePlan = await CarePlan.findOneAndUpdate(
      { resident: residentId, orgId },
      updateData,
      { new: true, upsert: true }
    );
    return carePlan;
  }
  public async createCarePlan(
    residentId: string,
    carePlanData: Partial<ICarePlan>,
    orgId: Types.ObjectId
  ): Promise<ICarePlan> {
    const newCarePlan = new CarePlan({
      resident: residentId,
      ...carePlanData,
      orgId,
    });
    await newCarePlan.save();
    return newCarePlan;
  }

  // Historical Task Management
  async getResidentHistoricalTasks(
    residentId: string,
    startDate: Date,
    endDate: Date,
    page: number,
    limit: number
  ): Promise<{
    tasks: IHistoricalTask[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [tasks, totalCount] = await Promise.all([
      HistoricalTask.find({
        resident: new Types.ObjectId(residentId),
        completedDate: { $gte: startDate, $lte: endDate },
      })
        .sort({ completedDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HistoricalTask.countDocuments({
        resident: new Types.ObjectId(residentId),
        completedDate: { $gte: startDate, $lte: endDate },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      tasks,
      totalCount,
      currentPage: page,
      totalPages,
    };
  }
  // Additional utility methods
  async getCompletionRate(
    residentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const totalTasks = await HistoricalTask.countDocuments({
      resident: new Types.ObjectId(residentId),
      dueDate: { $gte: startDate, $lte: endDate },
    });

    const completedTasks = await HistoricalTask.countDocuments({
      resident: new Types.ObjectId(residentId),
      completedDate: { $ne: null, $gte: startDate, $lte: endDate },
    });

    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  }

  async getTaskDataSummary(
    residentId: string,
    taskType: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ totalTasks: number; completedTasks: number }> {
    const tasks = await HistoricalTask.find({
      resident: new Types.ObjectId(residentId),
      taskType,
      completedDate: { $gte: startDate, $lte: endDate },
    });

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.completedDate !== null)
        .length,
    };
  }
}
