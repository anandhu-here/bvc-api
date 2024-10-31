import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const getCurrentTimestamp = (): number => {
  return dayjs().valueOf(); // This returns milliseconds
};

export const createUTCDate = (date: string | number | Date): dayjs.Dayjs => {
  return dayjs(date).utc();
};

export const convertToLocalTime = (
  timestamp: number,
  tz: string = "Europe/London"
): dayjs.Dayjs => {
  return dayjs(timestamp).tz(tz); // dayjs can handle milliseconds directly
};

export const formatForDisplay = (
  timestamp: number,
  format: string = "YYYY-MM-DD HH:mm:ss",
  tz: string = "Europe/London"
): string => {
  return convertToLocalTime(timestamp, tz).format(format);
};

export const getStartOfDay = (date: dayjs.Dayjs = dayjs()): number => {
  return date.utc().startOf("day").valueOf();
};

export const getEndOfDay = (date: dayjs.Dayjs = dayjs()): number => {
  return date.utc().endOf("day").valueOf();
};
