import mongoose from "mongoose";
import { HistoricalTask, IHistoricalTask } from "src/models/care/HistoricTasks";
import { Task } from "src/models/care/TaskModel";

interface SleepAnalysis {
  totalSleepHours: number;
  longestSleepPeriod: number;
  shortestSleepPeriod: number;
  averageSleepPeriod: number;
  sleepPeriods: number[];
  statusCounts: { [key: string]: number };
}

interface OverallSleepAnalysis {
  totalSleepHours: number;
  averageDailySleepHours: number;
  longestSleepPeriod: number;
  shortestSleepPeriod: number;
  averageSleepPeriod: number;
  daytimeSleepPercentage: number;
  nighttimeSleepPercentage: number;
}

export class ProgressService {
  public async getProgressData(
    residentId: string,
    startDate: string,
    endDate: string,
    taskType?: string
  ): Promise<{ date: string; value: number; details: any }[]> {
    const query: any = {
      resident: new mongoose.Types.ObjectId(residentId),
      completedDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    if (taskType) {
      query.taskType = taskType;
    }

    const tasks = await HistoricalTask.find(query)
      .sort({ completedDate: 1 })
      .lean();

    return tasks.map((task) => ({
      date: task.completedDate.toISOString().split("T")[0],
      ...this.getTaskValue(task),
    }));
  }

  public async getTaskCompletionRate(
    residentId: string,
    startDate: string,
    endDate: string,
    taskType?: string
  ): Promise<number> {
    const query: any = {
      resident: new mongoose.Types.ObjectId(residentId),
      dueDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    if (taskType) {
      query.taskType = taskType;
    }

    const totalTasks = await Task.countDocuments(query);
    const completedTasks = await Task.countDocuments({
      ...query,
      status: "completed",
    });

    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  }

  private getTaskValue(task: IHistoricalTask): { value: number; details: any } {
    switch (task.taskType) {
      case "pad check":
        return this.getPadCheckValue(task.taskData);
      case "fluid intake":
        return {
          value: task.taskData.drinkAmount || 0,
          details: { drinkAmount: task.taskData.drinkAmount },
        };
      case "turn":
        return {
          value: this.getMobilityScore(task.taskData),
          details: { assistanceRequired: task.taskData.assistanceRequired },
        };
      default:
        return { value: 1, details: {} };
    }
  }

  private getPadCheckValue(taskData: any): { value: number; details: any } {
    if (taskData) {
      const { stoolType, urineType, clothingCondition } = taskData;
      let value = 0;

      // Stool type evaluation (assuming higher numbers are worse)
      value += Math.min(parseInt(stoolType) - 1, 3);

      // Urine type evaluation
      value += this.getSaturationValue(urineType);

      // Clothing condition evaluation
      if (clothingCondition === "Soiled") value += 2;

      return {
        value: Math.min(value, 5), // Cap the value at 5
        details: { stoolType, urineType, clothingCondition },
      };
    } else {
      return { value: 0, details: {} };
    }
  }

  public async getPadCheckAnalysis(
    residentId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    stoolTypeAnalysis: { [key: string]: number };
    clothingConditionAnalysis: { [key: string]: number };
    healthInsights: string[];
  }> {
    const query = {
      resident: new mongoose.Types.ObjectId(residentId),
      taskType: "pad check",
      completedDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    const padChecks = await HistoricalTask.find(query).lean();

    const stoolTypeAnalysis: { [key: string]: number } = {};
    const clothingConditionAnalysis: { [key: string]: number } = {};

    padChecks.forEach((check) => {
      if (check.taskData) {
        const { stoolType, clothingCondition } = check.taskData;
        stoolTypeAnalysis[stoolType] = (stoolTypeAnalysis[stoolType] || 0) + 1;
        clothingConditionAnalysis[clothingCondition] =
          (clothingConditionAnalysis[clothingCondition] || 0) + 1;
      }
    });

    const healthInsights = this.generateHealthInsights(
      stoolTypeAnalysis,
      clothingConditionAnalysis,
      padChecks.length
    );

    return {
      stoolTypeAnalysis,
      clothingConditionAnalysis,
      healthInsights,
    };
  }

  private generateHealthInsights(
    stoolTypeAnalysis: { [key: string]: number },
    clothingConditionAnalysis: { [key: string]: number },
    totalChecks: number
  ): string[] {
    const insights: string[] = [];

    if (totalChecks === 0) {
      insights.push("No pad check data available for the selected period.");
      return insights;
    }

    // Analyze stool type
    const mostFrequentStoolType = this.getMostFrequent(stoolTypeAnalysis);
    if (mostFrequentStoolType !== "No data available") {
      insights.push(this.getStoolTypeInsight(mostFrequentStoolType));
    } else {
      insights.push("No stool type data available for analysis.");
    }

    // Analyze constipation
    const constipationRate =
      ((stoolTypeAnalysis["1"] || 0) + (stoolTypeAnalysis["2"] || 0)) /
      totalChecks;
    if (constipationRate > 0.3) {
      insights.push(
        "There are signs of constipation. Consider increasing fiber intake and hydration."
      );
    }

    // Analyze diarrhea
    const diarrheaRate =
      ((stoolTypeAnalysis["6"] || 0) + (stoolTypeAnalysis["7"] || 0)) /
      totalChecks;
    if (diarrheaRate > 0.3) {
      insights.push(
        "There are signs of diarrhea or inflammation. Monitor hydration and consider dietary adjustments."
      );
    }

    // Analyze clothing condition
    const soilingRate =
      (clothingConditionAnalysis["Soiled"] || 0) / totalChecks;
    if (soilingRate > 0.2) {
      insights.push(
        "Frequent soiling observed. This may indicate issues with bowel control or pad changing frequency."
      );
    }

    if (
      insights.length === 1 &&
      insights[0].includes("No pad check data available")
    ) {
      insights.push(
        "Consider reviewing the data collection process or the selected date range."
      );
    }

    return insights;
  }

  public async getMealAnalysis(
    residentId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    mealTypeDistribution: { [key: string]: number };
    averageAmountEaten: number;
    averageFluidIntake: number;
    mealData: Array<{
      date: string;
      mealType: string;
      amountEaten: number;
      drinkAmount: number;
    }>;
  }> {
    const query = {
      resident: new mongoose.Types.ObjectId(residentId),
      taskType: "meal",
      completedDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    const mealTasks = await HistoricalTask.find(query)
      .sort({
        completedDate: 1,
      })
      .lean();

    const mealTypeDistribution: { [key: string]: number } = {};
    let totalAmountEaten = 0;
    let totalFluidIntake = 0;
    const mealData = [];

    mealTasks.forEach((task) => {
      const { mealType, amountEaten, drinkAmount } = task.taskData;

      mealTypeDistribution[mealType] =
        (mealTypeDistribution[mealType] || 0) + 1;
      totalAmountEaten += amountEaten;
      totalFluidIntake += drinkAmount;

      mealData.push({
        date: task.completedDate.toISOString().split("T")[0],
        mealType,
        amountEaten,
        drinkAmount,
      });
    });

    const averageAmountEaten =
      mealTasks.length > 0 ? totalAmountEaten / mealTasks.length : 0;
    const averageFluidIntake =
      mealTasks.length > 0 ? totalFluidIntake / mealTasks.length : 0;

    return {
      mealTypeDistribution,
      averageAmountEaten,
      averageFluidIntake,
      mealData,
    };
  }

  public async getMealProgressData(
    residentId: string,
    startDate: string,
    endDate: string
  ): Promise<
    Array<{
      date: string;
      amountEaten: number;
      drinkAmount: number;
    }>
  > {
    const query = {
      resident: new mongoose.Types.ObjectId(residentId),
      taskType: "meal",
      completedDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    const mealTasks = await HistoricalTask.find(query)
      .sort({
        completedDate: 1,
      })
      .lean();

    return mealTasks.map((task) => ({
      date: task.completedDate.toISOString().split("T")[0],
      amountEaten: task.taskData.amountEaten,
      drinkAmount: task.taskData.drinkAmount,
    }));
  }

  private getStoolTypeInsight(stoolType: string): string {
    switch (stoolType) {
      case "1":
      case "2":
        return "Stool is often hard and dry, indicating possible constipation.";
      case "3":
      case "4":
        return "Stool consistency is generally normal.";
      case "5":
        return "Stool is often soft, which may indicate lack of fiber in diet.";
      case "6":
      case "7":
        return "Stool is frequently loose or liquid, which may indicate diarrhea or inflammation.";
      default:
        return "Stool type varies significantly.";
    }
  }

  private getMostFrequent(analysis: { [key: string]: number }): string {
    if (Object.keys(analysis).length === 0) {
      return "No data available";
    }
    return Object.entries(analysis).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  }

  private getMobilityScore(taskData: any): number {
    const assistanceLevel = taskData.assistanceRequired;
    switch (assistanceLevel) {
      case "none":
        return 5;
      case "minimal":
        return 4;
      case "moderate":
        return 3;
      case "full":
        return 2;
      default:
        return 1;
    }
  }

  private getSaturationValue(saturation: string): number {
    switch (saturation.toLowerCase()) {
      case "dry":
        return 0;
      case "damp":
        return 1;
      case "wet":
        return 2;
      default:
        return 0;
    }
  }

  //sleep
  public async getSleepAnalysis(
    residentId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    dayAnalysis: SleepAnalysis;
    nightAnalysis: SleepAnalysis;
    overallAnalysis: OverallSleepAnalysis;
  }> {
    const query = {
      resident: new mongoose.Types.ObjectId(residentId),
      taskType: { $in: ["day check", "night check"] },
      completedDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $ne: "missed" },
    };

    const checks = await HistoricalTask.find(query)
      .sort({ completedDate: 1 })
      .lean();

    const dayChecks = checks.filter((check) => check.taskType === "day check");
    const nightChecks = checks.filter(
      (check) => check.taskType === "night check"
    );

    const dayAnalysis = this.analyzeSleepData(dayChecks, "day");
    const nightAnalysis = this.analyzeSleepData(nightChecks, "night");
    const overallAnalysis = this.calculateOverallSleepAnalysis(
      dayAnalysis,
      nightAnalysis
    );

    return {
      dayAnalysis,
      nightAnalysis,
      overallAnalysis,
    };
  }

  private analyzeSleepData(
    checks: IHistoricalTask[],
    period: "day" | "night"
  ): SleepAnalysis {
    let totalSleepHours = 0;
    let longestSleepPeriod = 0;
    let shortestSleepPeriod = Infinity;
    let currentSleepPeriod = 0;
    let sleepPeriods: number[] = [];
    let previousStatus = "";
    let previousDate: Date | null = null;

    const statusCounts: { [key: string]: number } = {
      awake: 0,
      asleep: 0,
      restless: 0,
      agitated: 0,
    };

    checks.forEach((check, index) => {
      const status = check.taskData.status.toLowerCase();
      const currentDate = new Date(check.completedDate);
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (status === "asleep") {
        if (previousStatus === "asleep" && previousDate) {
          const hoursDiff =
            (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60);
          totalSleepHours += hoursDiff;
          currentSleepPeriod += hoursDiff;
        } else {
          if (currentSleepPeriod > 0) {
            sleepPeriods.push(currentSleepPeriod);
            longestSleepPeriod = Math.max(
              longestSleepPeriod,
              currentSleepPeriod
            );
            shortestSleepPeriod = Math.min(
              shortestSleepPeriod,
              currentSleepPeriod
            );
          }
          currentSleepPeriod = 0;
        }
      } else {
        if (currentSleepPeriod > 0) {
          sleepPeriods.push(currentSleepPeriod);
          longestSleepPeriod = Math.max(longestSleepPeriod, currentSleepPeriod);
          shortestSleepPeriod = Math.min(
            shortestSleepPeriod,
            currentSleepPeriod
          );
          currentSleepPeriod = 0;
        }
      }

      previousStatus = status;
      previousDate = currentDate;

      if (index === checks.length - 1 && currentSleepPeriod > 0) {
        sleepPeriods.push(currentSleepPeriod);
        longestSleepPeriod = Math.max(longestSleepPeriod, currentSleepPeriod);
        shortestSleepPeriod = Math.min(shortestSleepPeriod, currentSleepPeriod);
      }
    });

    const averageSleepPeriod =
      sleepPeriods.length > 0
        ? sleepPeriods.reduce((a, b) => a + b, 0) / sleepPeriods.length
        : 0;

    return {
      totalSleepHours,
      longestSleepPeriod,
      shortestSleepPeriod:
        shortestSleepPeriod === Infinity ? 0 : shortestSleepPeriod,
      averageSleepPeriod,
      sleepPeriods,
      statusCounts,
    };
  }

  private calculateOverallSleepAnalysis(
    dayAnalysis: SleepAnalysis,
    nightAnalysis: SleepAnalysis
  ): OverallSleepAnalysis {
    const totalSleepHours =
      dayAnalysis.totalSleepHours + nightAnalysis.totalSleepHours;
    const allSleepPeriods = [
      ...dayAnalysis.sleepPeriods,
      ...nightAnalysis.sleepPeriods,
    ];

    return {
      totalSleepHours,
      averageDailySleepHours: totalSleepHours / 24, // Assuming the analysis is for a 24-hour period
      longestSleepPeriod: Math.max(
        dayAnalysis.longestSleepPeriod,
        nightAnalysis.longestSleepPeriod
      ),
      shortestSleepPeriod: Math.min(
        dayAnalysis.shortestSleepPeriod > 0
          ? dayAnalysis.shortestSleepPeriod
          : Infinity,
        nightAnalysis.shortestSleepPeriod > 0
          ? nightAnalysis.shortestSleepPeriod
          : Infinity
      ),
      averageSleepPeriod:
        allSleepPeriods.length > 0
          ? allSleepPeriods.reduce((a, b) => a + b, 0) / allSleepPeriods.length
          : 0,
      daytimeSleepPercentage:
        (dayAnalysis.totalSleepHours / totalSleepHours) * 100,
      nighttimeSleepPercentage:
        (nightAnalysis.totalSleepHours / totalSleepHours) * 100,
    };
  }

  public async getDayNightCheckAnalysis(
    residentId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    dayStatusAnalysis: { [key: string]: number };
    nightStatusAnalysis: { [key: string]: number };
    healthInsights: string[];
  }> {
    const sleepAnalysis = await this.getSleepAnalysis(
      residentId,
      startDate,
      endDate
    );
    const { dayAnalysis, nightAnalysis, overallAnalysis } = sleepAnalysis;

    const healthInsights = this.generateSleepHealthInsights(
      overallAnalysis,
      dayAnalysis,
      nightAnalysis
    );

    return {
      dayStatusAnalysis: dayAnalysis.statusCounts,
      nightStatusAnalysis: nightAnalysis.statusCounts,
      healthInsights,
    };
  }

  private generateSleepHealthInsights(
    overallAnalysis: OverallSleepAnalysis,
    dayAnalysis: SleepAnalysis,
    nightAnalysis: SleepAnalysis
  ): string[] {
    const insights: string[] = [];

    if (overallAnalysis.averageDailySleepHours < 6) {
      insights.push(
        "Resident is getting less than the recommended amount of sleep. Consider reviewing sleep environment and routines."
      );
    } else if (overallAnalysis.averageDailySleepHours > 10) {
      insights.push(
        "Resident is sleeping more than average. This could be normal for some individuals, but may warrant a health check if it's a recent change."
      );
    }

    if (overallAnalysis.daytimeSleepPercentage > 30) {
      insights.push(
        "Significant daytime sleeping observed. Consider increasing daytime activities and exposure to natural light."
      );
    }

    if (
      nightAnalysis.statusCounts.restless &&
      nightAnalysis.statusCounts.restless /
        (nightAnalysis.statusCounts.asleep +
          nightAnalysis.statusCounts.restless) >
        0.3
    ) {
      insights.push(
        "Frequent restlessness during night checks. Consider reviewing sleep environment for potential disturbances."
      );
    }

    if (
      dayAnalysis.statusCounts.asleep &&
      dayAnalysis.statusCounts.asleep /
        (dayAnalysis.statusCounts.awake + dayAnalysis.statusCounts.asleep) >
        0.4
    ) {
      insights.push(
        "High rate of daytime sleeping. Consider reviewing daily activities and circadian rhythm management."
      );
    }

    if (overallAnalysis.longestSleepPeriod < 3) {
      insights.push(
        "Longest continuous sleep period is shorter than ideal. Consider strategies to promote longer, uninterrupted sleep."
      );
    }

    if (insights.length === 0) {
      insights.push(
        "Sleep patterns appear to be within normal ranges. Continue monitoring for any changes."
      );
    }

    return insights;
  }
}
