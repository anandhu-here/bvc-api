import NodeCache from "node-cache";
import Logger from "src/logger";
import { ITask, Task } from "src/models/care/TaskModel";

class TaskService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 600, checkperiod: 60 }); // TTL: 10 minutes, check every 1 minute
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    const tasks = await Task.find({}).lean();
    this.cache.set("all_tasks", tasks);
    Logger.info("Task cache initialized");
  }

  private processTasksDueSoon(): void {
    const tasks = this.cache.get<ITask[]>("all_tasks") || [];
    const now = new Date();

    tasks.forEach((task) => {
      const timeDiff =
        (new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60); // Difference in minutes

      if (timeDiff <= -5) {
        Logger.warn(
          `Task ${task._id} is overdue by ${Math.abs(timeDiff)} minutes`
        );
        this.updateTaskStatus(task._id.toString(), "overdue");
      } else if (timeDiff === 0) {
        Logger.info(`Task ${task._id} is due now`);
        this.updateTaskStatus(task._id.toString(), "pending");
      } else if (timeDiff <= 3) {
        Logger.info(`Task ${task._id} is due in ${timeDiff} minutes`);
      } else if (timeDiff <= 6) {
        Logger.info(`Task ${task._id} is due in ${timeDiff} minutes`);
      }
    });
  }

  private async updateTaskStatus(
    taskId: string,
    status: string
  ): Promise<void> {
    await Task.findByIdAndUpdate(taskId, { status });
    await this.invalidateCache();
  }

  public async createTask(taskData: Partial<ITask>): Promise<ITask> {
    const newTask = await Task.create(taskData);
    await this.invalidateCache();
    return newTask;
  }

  public async completeTask(
    taskId: string,
    completedBy: string
  ): Promise<ITask | null> {
    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        status: "completed",
        completedDate: new Date(),
        completedBy,
      },
      { new: true }
    );

    if (task) {
      await this.invalidateCache();
    }

    return task;
  }

  private async invalidateCache(): Promise<void> {
    const tasks = await Task.find({}).lean();
    this.cache.set("all_tasks", tasks);
  }

  // Additional helper methods

  public getTasksByOrg(orgId: string): ITask[] {
    const cachedTasks = this.cache.get<ITask[]>("all_tasks") || [];
    return cachedTasks.filter((task) => task.orgId.toString() === orgId);
  }

  public getTasksByStatus(status: string): ITask[] {
    const cachedTasks = this.cache.get<ITask[]>("all_tasks") || [];
    return cachedTasks.filter((task) => task.status === status);
  }

  public async refreshCache(): Promise<void> {
    await this.initializeCache();
  }

  // New method to get cache statistics
  public getCacheStats(): NodeCache.Stats {
    return this.cache.getStats();
  }
}

export default TaskService;
