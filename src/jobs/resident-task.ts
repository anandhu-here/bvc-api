// // src/jobs/taskCleanupJob.ts

// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc";
// import timezone from "dayjs/plugin/timezone";
// import ResidentService from "src/services/ResidentService";
// import Resident, { IResident } from "src/models/Resident";
// import { TaskHistoryService } from "src/services/TaskHistoryService";

// dayjs.extend(utc);
// dayjs.extend(timezone);

// interface ScheduledTask {
//   taskType: string;
//   taskKey: string;
//   scheduledTime: Date;
// }

// export class TaskCleanupJob {
//   private residentService: ResidentService;
//   private taskSvc: TaskHistoryService;
//   private isRunning: boolean = false;
//   private lastRunTime: Date | null = null;

//   constructor() {
//     this.residentService = new ResidentService();
//     this.taskSvc = new TaskHistoryService();
//   }

//   public async runCleanup(): Promise<void> {
//     if (this.isRunning) {
//       console.log("Task cleanup job is already running. Skipping this run.");
//       return;
//     }

//     this.isRunning = true;
//     const now = dayjs().tz("GMT");
//     console.log(
//       `Running task cleanup job at ${now.format("YYYY-MM-DD HH:mm:ss")} GMT`
//     );

//     const yesterday = now.subtract(1, "day").startOf("day");
//     console.log(`Processing tasks for date: ${yesterday.format("YYYY-MM-DD")}`);

//     try {
//       const residents = await Resident.find().lean();
//       console.log(`Found ${residents.length} residents to process`);

//       for (const resident of residents) {
//         await this.processResidentTasks(resident, yesterday);
//       }
//       console.log(
//         `Task cleanup job completed at ${dayjs()
//           .tz("GMT")
//           .format("YYYY-MM-DD HH:mm:ss")} GMT`
//       );
//       this.lastRunTime = new Date();
//     } catch (error: any) {
//       console.error(`Error in task cleanup job: ${error}`);
//     } finally {
//       this.isRunning = false;
//     }
//   }

//   private async processResidentTasks(
//     resident: IResident,
//     date: dayjs.Dayjs
//   ): Promise<void> {
//     try {
//       const tasks = this.residentService.getScheduledTasksForDay(
//         resident,
//         date
//       );
//       console.log(
//         `Processing ${tasks.length} tasks for resident ${resident._id}`
//       );

//       for (const task of tasks) {
//         if (!this.isValidDate(task.scheduledTime)) {
//           console.error(
//             `Invalid scheduledTime for task: ${task.taskType} - ${task.taskKey}. Skipping.`
//           );
//           continue;
//         }

//         const isResolved = await this.taskSvc.isTaskResolved(
//           resident._id.toString(),
//           task.taskType,
//           task.taskKey,
//           task.scheduledTime
//         );

//         if (!isResolved) {
//           try {
//             await this.taskSvc.createMissedTask({
//               residentId: resident._id.toString(),
//               taskType: task.taskType,
//               taskKey: task.taskKey,
//               scheduledTime: dayjs(
//                 `${dayjs().format("YYYY-MM-DD")} ${task.scheduledTime}`,
//                 "YYYY-MM-DD HH:mm"
//               ).toDate(),
//             });
//             console.log(
//               `Created missed task for resident ${resident._id}: ${task.taskType} - ${task.taskKey}`
//             );
//           } catch (error: any) {
//             console.error(
//               `Error creating missed task for resident ${resident._id}: ${task.taskType} - ${task.taskKey}`,
//               error
//             );
//           }
//         }
//       }
//     } catch (error: any) {
//       console.error(
//         `Error processing tasks for resident ${resident._id}:`,
//         error
//       );
//     }
//   }

//   private isValidDate(date: any): boolean {
//     return date !== null || date !== undefined || date !== "";
//   }

//   public getStatus(): string {
//     if (this.isRunning) {
//       return "Running";
//     } else if (this.lastRunTime) {
//       return `Not running. Last run: ${dayjs(this.lastRunTime).format(
//         "YYYY-MM-DD HH:mm:ss"
//       )} GMT`;
//     } else {
//       return "Not run yet";
//     }
//   }
// }

export const a = () => {};
