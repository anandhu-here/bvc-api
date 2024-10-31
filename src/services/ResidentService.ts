import mongoose, { Types } from "mongoose";
import Resident, { IResident } from "../models/Resident";
import TaskHistory, { type ITaskHistory } from "src/models/TaskHistory";
import dayjs from "dayjs";
import { Organization } from "src/models/new/Heirarchy";

interface ResidentTaskHistoryResponse {
  resident: {
    _id: string;
    firstName: string;
    lastName: string;
    roomNumber: string;
    groupName: string;
    homeName: string;
  };
  taskHistory: ITaskHistory[];
}

interface IDueTask {
  type: "personalCare" | "medication";
  key: string;
  minutesPastDue: number;
  taskTime?: string;
  residentId?: string;
}

class ResidentService {
  public async createResident(
    residentData: Partial<IResident>
  ): Promise<IResident> {
    try {
      if (residentData.personalCare) {
        Object.keys(residentData.personalCare).forEach((key) => {
          residentData.personalCare[key].statuses = Array.from(
            { length: residentData.personalCare[key].timings.length },
            () => ({
              isDue: false,
              lastDueTime: null,
              lastResolvedTime: null,
              lastResolvedDescription: null,
            })
          );
        });
      }
      // Add default status to medications
      if (residentData.medications) {
        residentData.medications = residentData.medications.map((med) => ({
          ...med,
          status: {
            isDue: false,
            lastDueTime: null,
            lastResolvedTime: null,
            lastResolvedDescription: null,
          },
        }));
      }
      // Set initial currentStatus to 100%
      residentData.currentStatus = 0;
      const resident = new Resident(residentData);
      await resident.save();
      return resident;
    } catch (error: any) {
      throw new Error(`Failed to create resident: ${error.message}`);
    }
  }
  public async updateResident(
    residentId: string,
    updateData: Partial<IResident>
  ): Promise<IResident | null> {
    try {
      console.log(updateData, "residentId");
      const updatedResident = await Resident.findByIdAndUpdate(
        residentId,
        updateData,
        { new: true, runValidators: true }
      );
      if (!updatedResident) {
        throw new Error("Resident not found");
      }
      return updatedResident;
    } catch (error: any) {
      throw new Error(`Failed to update resident: ${error.message}`);
    }
  }
  public async getResident(residentId: string): Promise<IResident | null> {
    try {
      const resident = await Resident.findById(residentId)
        .populate("groupId")
        .lean();
      if (!resident) {
        throw new Error("Resident not found");
      }
      return resident;
    } catch (error: any) {
      throw new Error(`Failed to get resident: ${error.message}`);
    }
  }
  public async getResidents(homeId: string): Promise<IResident[]> {
    try {
      const residents = await Resident.find({ homeId }).populate("groupId");
      return residents.map((resident) =>
        this.calculateResidentStatus(resident)
      );
    } catch (error: any) {
      console.log(error, "eror");
      throw new Error(`Failed to get residents: ${error.message}`);
    }
  }
  public async changeResidentGroup(
    residentId: string,
    newGroupId: string
  ): Promise<any> {
    const resident = await Resident.findById(residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }
    resident.groupId = new Types.ObjectId(newGroupId);
    await resident.save();
    return resident;
  }
  public async markTaskAsDue(
    residentId: string,
    taskType: string,
    taskKey: string
  ): Promise<IResident> {
    try {
      const updateQuery: any = {};
      updateQuery[`${taskType}.${taskKey}.status.isDue`] = true;
      updateQuery[`${taskType}.${taskKey}.status.lastDueTime`] = new Date();
      const updatedResident = await Resident.findByIdAndUpdate(
        residentId,
        { $set: updateQuery },
        { new: true }
      );
      if (!updatedResident) {
        throw new Error("Resident not found");
      }
      await this.recordTaskHistory(residentId, taskType, taskKey, "due");
      await this.updateCurrentStatus(updatedResident);
      return updatedResident;
    } catch (error: any) {
      throw new Error(`Failed to mark task as due: ${error.message}`);
    }
  }
  private calculateResidentStatus(resident: IResident): any {
    const now = dayjs();
    const currentDay = now.format("dddd");
    const currentTime = now.format("HH:mm");

    let dueTasksCount = 0;
    let totalTasksCount = 0;
    let dueTasks: any[] = [];

    // Check personal care tasks
    if (resident.personalCare) {
      Object.entries(resident.personalCare).forEach(([key, task]) => {
        totalTasksCount++;
        const taskStatus = this.isTaskDue(task, currentDay, currentTime, key);
        if (taskStatus.isDue) {
          dueTasksCount++;
          dueTasks.push({
            type: "personalCare",
            key: key,
            minutesPastDue: taskStatus.minutesPastDue,
            taskTime: taskStatus.taskTime,
          });
        }
      });
    }

    // Check medications
    if (Array.isArray(resident.medications)) {
      resident.medications.forEach((med) => {
        totalTasksCount++;
        const taskStatus = this.isTaskDue(med, currentDay, currentTime);
        if (taskStatus.isDue) {
          dueTasksCount++;
          dueTasks.push({
            type: "medication",
            key: med.medicineName,
            minutesPastDue: taskStatus.minutesPastDue,
            taskTime: taskStatus.taskTime,
          });
        }
      });
    }

    const status =
      totalTasksCount > 0 ? (dueTasksCount / totalTasksCount) * 100 : 0;

    console.log(dueTasks, "///");

    return {
      ...resident.toObject(),
      currentStatus: status,
      dueTasks: dueTasks,
    };
  }

  private isTaskDue(
    task: any,
    currentDay: string,
    currentTime: string,
    taskKey?: string
  ): { isDue: boolean; minutesPastDue: number; taskTime: string } {
    if (!task?.frequency) {
      return { isDue: false, minutesPastDue: 0, taskTime: "" };
    }

    const now = dayjs();
    const currentDateTime = now
      .hour(parseInt(currentTime.split(":")[0]))
      .minute(parseInt(currentTime.split(":")[1]));

    const checkTiming = (
      timing: string | null,
      status: any
    ): { isDue: boolean; minutesPastDue: number; taskTime: string } => {
      if (!timing) {
        // For tasks without specific timing (like nightCheck)
        if (
          !status ||
          !status.lastResolvedTime ||
          status.lastResolvedTime === ""
        ) {
          return { isDue: true, minutesPastDue: 0, taskTime: "Any time" };
        }
        const lastResolvedDateTime = dayjs(status.lastResolvedTime);
        if (lastResolvedDateTime.isBefore(now.startOf("day"))) {
          return { isDue: true, minutesPastDue: 0, taskTime: "Any time" };
        }
        return { isDue: false, minutesPastDue: 0, taskTime: "Any time" };
      }

      const [taskHour, taskMinute] = timing.split(":").map(Number);
      const taskDateTime = now.hour(taskHour).minute(taskMinute);
      const tenMinutesBefore = taskDateTime.subtract(10, "minute");

      if (currentDateTime.isBefore(tenMinutesBefore)) {
        return { isDue: false, minutesPastDue: 0, taskTime: timing };
      }

      if (
        !status ||
        !status.lastResolvedTime ||
        status.lastResolvedTime === ""
      ) {
        const minutesPastDue = Math.max(
          0,
          currentDateTime.diff(tenMinutesBefore, "minute")
        );
        return { isDue: true, minutesPastDue, taskTime: timing };
      }

      const lastResolvedDateTime = dayjs(status.lastResolvedTime);
      if (lastResolvedDateTime.isBefore(tenMinutesBefore)) {
        const minutesPastDue = Math.max(
          0,
          currentDateTime.diff(tenMinutesBefore, "minute")
        );
        return { isDue: true, minutesPastDue, taskTime: timing };
      }

      return { isDue: false, minutesPastDue: 0, taskTime: timing };
    };

    if (task.frequency.per === "day" || task.frequency.per === "night") {
      if (taskKey === "nightCheck") {
        // Special handling for nightCheck
        return checkTiming(null, task.statuses[0]);
      }
      if (task.defaultTime) {
        return checkTiming(task.defaultTime, task.statuses[0]);
      }
      if (Array.isArray(task.timings) && Array.isArray(task.statuses)) {
        for (let i = 0; i < task.timings.length; i++) {
          const result = checkTiming(task.timings[i], task.statuses[i]);
          if (result.isDue) {
            return result;
          }
        }
        return checkTiming(
          task.timings[task.timings.length - 1],
          task.statuses[task.statuses.length - 1]
        );
      }
    } else if (task.frequency.per === "week") {
      if (Array.isArray(task.timings) && Array.isArray(task.statuses)) {
        const todayTiming = task.timings.find((t: any) => t.day === currentDay);
        const todayIndex = task.timings.findIndex(
          (t: any) => t.day === currentDay
        );
        if (todayTiming && todayIndex !== -1) {
          return checkTiming(todayTiming.time, task.statuses[todayIndex]);
        }
      }
    }

    return { isDue: false, minutesPastDue: 0, taskTime: "" };
  }

  public async resolveTask(
    residentId: string,
    taskType: "personalCare" | "medications",
    taskKey: string,
    taskIndex: number,
    description: string,
    resolvedBy: string,
    additionalData?: any,
    taskData?: any,
    shouldAddToHistory: boolean = true
  ): Promise<IResident | null> {
    console.log(taskData, "andi", taskType, taskKey, taskIndex);
    try {
      const resident = await Resident.findById(residentId);
      if (!resident) {
        throw new Error("Resident not found");
      }

      let scheduledTime: Date | undefined;

      if (taskType === "personalCare") {
        const task = resident.personalCare[taskKey];
        if (!task) {
          throw new Error(`Task ${taskKey} not found in personalCare`);
        }

        if (taskIndex < 0 || taskIndex >= task.statuses.length) {
          throw new Error(`Invalid task index: ${taskIndex}`);
        }

        const timing = task.timings[taskIndex];
        console.log(timing, "timing");
        const currentTime = dayjs();
        let taskTime: dayjs.Dayjs;

        if (typeof timing === "string") {
          taskTime = dayjs(`${currentTime.format("YYYY-MM-DD")} ${timing}`);
        } else if (
          timing &&
          typeof timing === "object" &&
          timing.day &&
          timing.time
        ) {
          const dayIndex = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ].indexOf(timing.day);
          taskTime = currentTime
            .day(dayIndex)
            .set("hour", parseInt(timing.time.split(":")[0]))
            .set("minute", parseInt(timing.time.split(":")[1]));
        } else {
          // Handle case for nightCheck or other tasks without specific timing
          taskTime = currentTime;
        }

        // For nightCheck, we don't enforce the 10-minute rule
        if (taskKey !== "nightCheck") {
          const tenMinutesBefore = taskTime.subtract(10, "minute");
          if (currentTime.isBefore(tenMinutesBefore)) {
            throw new Error(
              "Task can only be completed within 10 minutes before and up to the scheduled time"
            );
          }
        }

        scheduledTime = taskTime.toDate();
        task.statuses[taskIndex] = {
          isDue: false,
          lastResolvedTime: currentTime.toDate(),
          lastResolvedDescription: description,
          additionalData,
          taskData,
        };

        resident.markModified(`personalCare.${taskKey}.statuses`);

        // Special handling for nightCheck
        if (taskKey === "nightCheck") {
          // Reset all other tasks to be due for the next day
          for (const [key, value] of Object.entries(resident.personalCare)) {
            if (key !== "nightCheck") {
              value.statuses?.forEach((status, idx) => {
                status.isDue = true;
                status.lastDueTime = currentTime
                  .add(1, "day")
                  .startOf("day")
                  .toDate();
              });
              resident.markModified(`personalCare.${key}.statuses`);
            }
          }
        }
      } else if (taskType === "medications") {
        // ... (existing medication handling code)
      } else {
        throw new Error(`Unsupported taskType: ${taskType}`);
      }

      // Save the resident first
      await resident.save();

      // Then add to history if needed
      if (shouldAddToHistory && scheduledTime) {
        const taskHistory = new TaskHistory({
          residentId,
          taskType,
          taskKey,
          scheduledTime,
          resolvedTime: new Date(),
          description,
          resolvedBy,
          additionalData,
        });
        await taskHistory.save();
      }

      // Finally, update the current status
      await this.updateCurrentStatus(resident);
      await resident.save();

      return resident;
    } catch (error: any) {
      console.error("Error in resolveTask:", error);
      throw new Error(`Failed to resolve task: ${error.message}`);
    }
  }

  private async updateCurrentStatus(resident: IResident): Promise<void> {
    let totalTasks = 0;
    let completedTasks = 0;

    // Handle personal care tasks
    for (const task of Object.values(resident.personalCare)) {
      totalTasks += task?.statuses?.length;
      completedTasks += task?.statuses?.filter(
        (status) => !status.isDue
      ).length;
    }

    // Handle medications
    for (const medication of resident.medications) {
      totalTasks++;
      if (!medication.status.isDue) completedTasks++;
    }

    // Calculate the current status percentage
    const currentStatus =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100; // If no tasks, consider it 100% complete

    resident.currentStatus = currentStatus;
  }

  public async getHandOverData(
    homeId: string,
    currentUserId: string
  ): Promise<{ dueTasks: IDueTask[] }> {
    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    let dueTasksCount = 0;
    let totalTasksCount = 0;
    let dueTasks: IDueTask[] = [];
    try {
      const residents = await Resident.find({ homeId }).lean();
      for (var resident of residents) {
        // Check personal care tasks
        if (resident.personalCare) {
          Object.entries(resident.personalCare).forEach(async ([key, task]) => {
            totalTasksCount++;
            const taskStatus = await this.isResidentTaskDue(
              task,
              currentDay,
              currentTime
            );
            if (taskStatus.isDue) {
              dueTasksCount++;
              dueTasks.push({
                type: "personalCare",
                key: key,
                minutesPastDue: taskStatus.minutesPastDue,
                taskTime: taskStatus.taskTime,
              });
              const scheduledTime = dayjs(
                `${dayjs().format("YYYY-MM-DD")} ${taskStatus.taskTime}`,
                "YYYY-MM-DD HH:mm"
              ).toDate();

              const existingTask = await TaskHistory.findOne({
                residentId: resident._id,
                taskType: "personalCare",
                taskKey: key,
                scheduledTime: scheduledTime,
                status: "missed",
              });

              if (!existingTask) {
                // If no existing 'missed' task is found, create and save a new one
                const taskHistory = new TaskHistory({
                  residentId: resident._id,
                  taskType: "personalCare",
                  taskKey: key,
                  scheduledTime: scheduledTime,
                  resolvedTime: dayjs().toDate(),
                  status: "missed",
                });

                this.resolveTask(
                  resident._id.toString(),
                  "personalCare",
                  key,
                  parseInt(taskStatus.taskIndex.toString()),
                  "",
                  currentUserId as string // Pass the current user's ID as resolved,
                );

                await taskHistory.save();
              }
            }
          });
        }
      }
      return { dueTasks };
    } catch (error: any) {
      throw new Error(`Failed to get residents: ${error.message}`);
    }
  }

  public async calculateCurrentResidentStatus(
    resident: IResident
  ): Promise<{ currentStatus: number; dueTasks: IDueTask[] }> {
    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    let dueTasksCount = 0;
    let totalTasksCount = 0;
    let dueTasks: IDueTask[] = [];

    // Check personal care tasks
    if (resident.personalCare) {
      Object.entries(resident.personalCare).forEach(async ([key, task]) => {
        totalTasksCount++;
        const taskStatus = await this.isResidentTaskDue(
          task,
          currentDay,
          currentTime
        );
        if (taskStatus.isDue) {
          dueTasksCount++;
          dueTasks.push({
            type: "personalCare",
            key: key,
            minutesPastDue: taskStatus.minutesPastDue,
            taskTime: taskStatus.taskTime,
          });
        }
      });
    }
    return { currentStatus: 100, dueTasks };
  }

  public async isResidentTaskDue(
    task: any,
    currentDay: string,
    currentTime: string
  ): Promise<{
    isDue: boolean;
    minutesPastDue: number;
    taskTime: string;
    taskIndex: number;
  }> {
    console.log(task?.frequency, "task?.frequency");
    if (!task?.frequency) {
      return { isDue: false, minutesPastDue: 0, taskTime: "", taskIndex: 0 };
    }

    const now = dayjs();
    const currentDateTime = now
      .hour(parseInt(currentTime.split(":")[0]))
      .minute(parseInt(currentTime.split(":")[1]));

    const checkTiming = (
      timing: string,
      status: any,
      index: number
    ): {
      isDue: boolean;
      minutesPastDue: number;
      taskTime: string;
      taskIndex: number;
    } => {
      if (!timing || timing.trim() === "") {
        return {
          isDue: false,
          minutesPastDue: 0,
          taskTime: "",
          taskIndex: index,
        };
      }

      const [taskHour, taskMinute] = timing.split(":").map(Number);
      const taskDateTime = now.hour(taskHour).minute(taskMinute);
      const tenMinutesBefore = taskDateTime.subtract(10, "minute");

      if (currentDateTime.isBefore(tenMinutesBefore)) {
        return {
          isDue: false,
          minutesPastDue: 0,
          taskTime: timing,
          taskIndex: index,
        };
      }

      if (
        !status ||
        !status.lastResolvedTime ||
        status.lastResolvedTime === ""
      ) {
        const minutesPastDue = Math.max(
          0,
          currentDateTime.diff(tenMinutesBefore, "minute")
        );
        return {
          isDue: true,
          minutesPastDue,
          taskTime: timing,
          taskIndex: index,
        };
      }

      const lastResolvedDateTime = dayjs(status.lastResolvedTime);
      if (lastResolvedDateTime.isBefore(tenMinutesBefore)) {
        const minutesPastDue = Math.max(
          0,
          currentDateTime.diff(tenMinutesBefore, "minute")
        );
        return {
          isDue: true,
          minutesPastDue,
          taskTime: timing,
          taskIndex: index,
        };
      }

      return {
        isDue: false,
        minutesPastDue: 0,
        taskTime: timing,
        taskIndex: index,
      };
    };

    if (task?.frequency?.per === "day") {
      if (task.defaultTime) {
        // return checkTiming(task.defaultTime, task.statuses[0]);
      }
      if (Array.isArray(task.timings) && Array.isArray(task.statuses)) {
        // Check all timings and return the first due task
        for (let i = 0; i < task.timings.length; i++) {
          const result = checkTiming(task.timings[i], task.statuses[i], i);
          if (result.isDue) {
            return result;
          }
        }

        // If we've checked all timings and none are due, return the last timing
        return checkTiming(
          task.timings[task.timings.length - 1],
          task.statuses[task.statuses.length - 1],
          task.statuses.length - 1
        );
      } else if (task.defaultTime) {
        // Handle tasks with default time
        let status = task.statuses;
        if (status) {
          return checkTiming(task.defaultTime, task.statuses[0], 0);
        } else {
          return checkTiming(task.defaultTime, null, 0);
        }
      }
    } else if (task?.frequency?.per === "week") {
      if (Array.isArray(task.timings) && Array.isArray(task.statuses)) {
        // Find the timing for the current day
        const todayTiming = task.timings.find((t: any) => t.day === currentDay);
        const todayIndex = task.timings.findIndex(
          (t: any) => t.day === currentDay
        );
        if (todayTiming && todayIndex !== -1) {
          return checkTiming(
            todayTiming.time,
            task.statuses[todayIndex],
            todayIndex
          );
        }
      }
    }

    return { isDue: false, minutesPastDue: 0, taskTime: "", taskIndex: 0 };
  }

  public async getCurrentCareStatus(residentId: string): Promise<any> {
    try {
      const resident = await this.getResident(residentId);
      if (!resident) {
        throw new Error("Resident not found");
      }
      const personalCareStatus = Object.entries(resident.personalCare).map(
        ([key, item]: [string, any]) => ({
          key,
          isDue: item?.status?.isDue,
          lastDueTime: item?.status?.lastDueTime,
          lastResolvedTime: item?.status?.lastResolvedTime,
          lastResolvedDescription: item?.status?.lastResolvedDescription,
          ...item,
        })
      );
      const medicationStatus = resident.medications.map((med: any) => ({
        ...med,
        isDue: med.status.isDue,
        lastDueTime: med.status.lastDueTime,
        lastResolvedTime: med.status.lastResolvedTime,
        lastResolvedDescription: med.status.lastResolvedDescription,
      }));
      return {
        personalCare: personalCareStatus,
        medications: medicationStatus,
        currentStatus: resident.currentStatus,
      };
    } catch (error: any) {
      throw new Error(`Failed to get current care status: ${error.message}`);
    }
  }

  public async getResidentTaskHistory(
    residentId: string,

    startDate?: Date | string,
    endDate?: Date | string
  ): Promise<{ resident: IResident; taskHistory: ITaskHistory[] }> {
    try {
      const resident = await Resident.findById(residentId)
        .populate("groupId", "name")
        .lean();

      if (!resident) {
        throw new Error("Resident not found");
      }

      const homeUser = await Organization.findOne({
        _id: resident.homeId,
        type: "home",
      }).lean();

      if (!homeUser) {
        throw new Error("Associated home not found");
      }

      // If no dates are provided, use current month
      let validStartDate: Date;
      let validEndDate: Date;

      if (!startDate || !endDate) {
        const now = new Date();
        validStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        validEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else {
        validStartDate = this.parseDate(startDate);
        validEndDate = this.parseDate(endDate);
      }

      if (!validStartDate || !validEndDate) {
        throw new Error("Invalid date format provided");
      }

      const taskHistory = await TaskHistory.find({
        residentId,

        resolvedTime: {
          $gte: validStartDate,
          $lte: validEndDate,
        },
      })
        .sort({ resolvedTime: "desc" })
        .lean();

      return {
        resident: {
          ...resident,
          homeName: homeUser.name ? homeUser?.name : "Unknown Home",
        },
        taskHistory,
      };
    } catch (error: any) {
      throw new Error(`Failed to get resident task history: ${error.message}`);
    }
  }

  private parseDate(date: Date | string): Date {
    if (date instanceof Date) {
      return date;
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date: ${date}`);
    }
    return parsedDate;
  }

  private async recordTaskHistory(
    residentId: string,
    taskType: string,
    taskKey: string,
    status: "due" | "resolved",
    description?: string
  ): Promise<void> {
    const taskHistory = new TaskHistory({
      residentId,
      taskType,
      taskKey,
      status,
      description,
    });
    await taskHistory.save();
  }
}
export default ResidentService;
