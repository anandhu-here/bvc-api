import {
  Resident,
  CareRoutine,
  Task,
  IResident,
  ICareRoutine,
  ITask,
} from "src/models/ResidentManagement";
import { Types, ClientSession, startSession } from "mongoose";
import { HistoricalTask, IHistoricalTask } from "src/models/HIstoricalTasks";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export class ResidentService {
  async createResident(residentData: Partial<IResident>): Promise<IResident> {
    const resident = new Resident(residentData);
    return await resident.save();
  }

  async getResident(residentId: string): Promise<IResident | null> {
    return await Resident.findById(residentId);
  }

  async updateResident(
    residentId: string,
    updateData: Partial<IResident>
  ): Promise<IResident | null> {
    return await Resident.findByIdAndUpdate(residentId, updateData, {
      new: true,
    });
  }

  async getAllResidents(): Promise<IResident[]> {
    return await Resident.find();
  }
}

export class CareRoutineService {
  async createCareRoutine(
    careRoutineData: Partial<ICareRoutine>
  ): Promise<ICareRoutine> {
    const careRoutine = new CareRoutine(careRoutineData);
    return await careRoutine.save();
  }

  async getCareRoutinesForResident(
    residentId: string
  ): Promise<ICareRoutine[]> {
    return await CareRoutine.find({ resident: residentId, isActive: true });
  }

  async updateCareRoutine(
    routineId: string,
    updateData: Partial<ICareRoutine>
  ): Promise<ICareRoutine | null> {
    return await CareRoutine.findByIdAndUpdate(routineId, updateData, {
      new: true,
    });
  }

  async deactivateCareRoutine(routineId: string): Promise<ICareRoutine | null> {
    return await CareRoutine.findByIdAndUpdate(
      routineId,
      { isActive: false },
      { new: true }
    );
  }
}

export class TaskService {
  private async withTransaction<T>(
    operation: (session?: ClientSession) => Promise<T>
  ): Promise<T> {
    let session: ClientSession | undefined;
    try {
      session = await startSession();
      session.startTransaction();
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error: any) {
      if (session?.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      await session?.endSession();
    }
  }

  async createTask(taskData: Partial<ITask>): Promise<ITask> {
    try {
      return await this.withTransaction(async (session) => {
        const task = new Task(taskData);
        return await task.save({ session });
      });
    } catch (error: any) {
      if (
        error.message.includes(
          "Transaction numbers are only allowed on a replica set member or mongos"
        )
      ) {
        // Fallback to non-transactional operation
        const task = new Task(taskData);
        return await task.save();
      }
      throw error;
    }
  }

  async getUpcomingTasksForResident(residentId: string): Promise<ITask[]> {
    const now = dayjs().utc().toDate();
    const endOfDay = dayjs().utc().endOf("day").toDate();

    // Generate any missing tasks for today and upcoming days
    await this.generateMissingTasks(residentId, now, endOfDay);

    // Fetch upcoming tasks
    return await Task.find({
      resident: residentId,
      status: "upcoming",
      dueDate: { $gte: now, $lte: endOfDay },
    })
      .populate("careRoutine")
      .sort({ dueDate: 1 });
  }

  async getPendingTasksForResident(residentId: string): Promise<ITask[]> {
    const now = dayjs().utc(true).toDate();
    console.log(now);

    // Update status of overdue tasks
    await Task.updateMany(
      {
        resident: residentId,
        status: "upcoming",
        dueDate: { $lt: now },
      },
      { status: "pending" }
    );

    // Fetch pending tasks
    return await Task.find({
      resident: residentId,
      status: "pending",
    })
      .populate("careRoutine")
      .sort({ dueDate: 1 });
  }

  private async generateMissingTasks(
    residentId: string,
    start: Date,
    end: Date
  ): Promise<void> {
    const careRoutines = await CareRoutine.find({
      resident: residentId,
      isActive: true,
    });

    for (const routine of careRoutines) {
      const taskDates = this.getTaskDatesForRoutine(routine, start, end);

      for (const date of taskDates) {
        const existingTask = await Task.findOne({
          careRoutine: routine._id,
          resident: residentId,
          dueDate: date,
        });

        if (!existingTask) {
          await this.createTask({
            careRoutine: routine._id as Types.ObjectId,
            resident: new Types.ObjectId(residentId),
            dueDate: date,
            status: dayjs(date).isBefore(dayjs()) ? "pending" : "upcoming",
          });
        }
      }
    }
  }

  async completeTask(
    taskId: string,
    completedBy: string,
    notes?: string
  ): Promise<ITask | null> {
    try {
      return await this.withTransaction(async (session) => {
        const task = await Task.findById(taskId).session(session);
        if (!task) {
          return null;
        }

        task.status = "completed";
        task.completedDate = new Date();
        task.completedBy = completedBy as any;
        task.notes = notes;

        const completedTask = await task.save({ session });
        await this.createHistoricalTask(completedTask, session);
        await this.createNextUpcomingTask(completedTask, session);
        await Task.findByIdAndDelete(taskId).session(session);

        return completedTask;
      });
    } catch (error: any) {
      if (
        error.message.includes(
          "Transaction numbers are only allowed on a replica set member or mongos"
        )
      ) {
        // Fallback to non-transactional operation
        const task = await Task.findById(taskId);
        if (!task) {
          return null;
        }

        task.status = "completed";
        task.completedDate = new Date();
        task.completedBy = completedBy as any;
        task.notes = notes;

        const completedTask = await task.save();
        await this.createHistoricalTask(completedTask);
        await this.createNextUpcomingTask(completedTask);
        await Task.findByIdAndDelete(taskId);

        return completedTask;
      }
      throw error;
    }
  }

  private async createHistoricalTask(
    task: ITask,
    session?: ClientSession
  ): Promise<IHistoricalTask> {
    const historicalTask = new HistoricalTask({
      originalTask: task._id,
      careRoutine: task.careRoutine,
      resident: task.resident,
      dueDate: task.dueDate,
      completedDate: task.completedDate,
      completedBy: task.completedBy,
      status: task.status,
      notes: task.notes,
    });

    return await historicalTask.save({ session });
  }

  private async createNextUpcomingTask(
    completedTask: ITask,
    session?: ClientSession
  ): Promise<void> {
    const careRoutine = await CareRoutine.findById(
      completedTask.careRoutine
    ).session(session);
    if (!careRoutine) return;

    const nextDueDate = this.getNextDueDate(careRoutine, completedTask.dueDate);
    if (nextDueDate) {
      const existingNextTask = await Task.findOne({
        careRoutine: careRoutine._id,
        resident: completedTask.resident,
        dueDate: nextDueDate,
      }).session(session);

      if (!existingNextTask) {
        const newTask = new Task({
          careRoutine: careRoutine._id,
          resident: completedTask.resident,
          dueDate: nextDueDate,
          status: dayjs(nextDueDate).isBefore(dayjs()) ? "pending" : "upcoming",
        });
        await newTask.save({ session });
      }
    }
  }

  private getTaskDatesForRoutine(
    routine: ICareRoutine,
    start: Date,
    end: Date
  ): Date[] {
    const dates: Date[] = [];
    let current = dayjs(start).utc();
    const endDate = dayjs(end).utc();

    while (current.isBefore(endDate) || current.isSame(endDate)) {
      if (this.shouldCreateTaskForDate(routine, current.toDate())) {
        const taskTimes = this.getTaskTimes(routine, current.toDate());
        dates.push(
          ...taskTimes.filter((date) => {
            const dateJs = dayjs(date);
            return (
              (dateJs.isAfter(start) || dateJs.isSame(start)) &&
              (dateJs.isBefore(end) || dateJs.isSame(end))
            );
          })
        );
      }
      current = current.add(1, "day");
    }

    return dates;
  }

  private shouldCreateTaskForDate(routine: ICareRoutine, date: Date): boolean {
    const dayOfWeek = dayjs(date).utc().format("dddd");
    if (routine.frequency === "daily") return true;
    if (
      routine.frequency === "weekly" &&
      routine.daysOfWeek?.includes(dayOfWeek)
    )
      return true;
    if (
      routine.frequency === "monthly" &&
      dayjs(date).date() === parseInt(routine.daysOfWeek?.[0] || "1")
    )
      return true;
    return false;
  }

  private getTaskTimes(routine: ICareRoutine, date: Date): Date[] {
    return routine.timesOfDay.map((time) => {
      const [hours, minutes] = time.split(":");
      return dayjs(date)
        .utc()
        .hour(parseInt(hours))
        .minute(parseInt(minutes))
        .second(0)
        .millisecond(0)
        .toDate();
    });
  }

  private getNextDueDate(
    routine: ICareRoutine,
    currentDueDate: Date
  ): Date | null {
    let nextDate = dayjs(currentDueDate).utc().add(1, "day").startOf("day");

    for (let i = 0; i < 7; i++) {
      if (this.shouldCreateTaskForDate(routine, nextDate.toDate())) {
        const taskTimes = this.getTaskTimes(routine, nextDate.toDate());
        if (taskTimes.length > 0) {
          return taskTimes[0];
        }
      }
      nextDate = nextDate.add(1, "day");
    }

    return null; // Return null if no suitable date found within a week
  }

  async getTaskHistory(
    residentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IHistoricalTask[]> {
    return await HistoricalTask.find({
      resident: residentId,
      dueDate: { $gte: startDate, $lte: endDate },
    })
      .populate("careRoutine")
      .sort({ dueDate: -1 });
  }
}
