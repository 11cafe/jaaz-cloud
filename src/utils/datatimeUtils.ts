import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// 扩展 dayjs 插件
dayjs.extend(utc);

export function formatTimestamp(
  unixTimestamp: number | string,
  showHourMinue: boolean = true,
  showSec: boolean = false,
) {
  // Create a new Date object from the UNIX timestamp
  const date = new Date(unixTimestamp);

  // Get the day, month, year, hours, and minutes from the Date object
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  // Format the date and time string
  const res = `${month}-${day}-${year}`;
  if (showHourMinue) {
    return res + ` ${hours}:${minutes}`;
  }
  if (showSec) {
    return res + `:${seconds}`;
  }
  return res;
}

export function pgTimeToISO(pgTime: string) {
  pgTime = pgTime.replace(" ", "T");
  if (!pgTime.endsWith("Z")) {
    pgTime += "Z";
  }
  return pgTime;
}

/**
 * Format timestamp to local timezone using dayjs
 * 处理数据库中的UTC时间，转换为本地时间显示
 * @param timestamp - ISO string or timestamp
 * @returns formatted string in local time
 */
export function formatToLocalTime(timestamp: string | number): string {
  // 如果是字符串且不包含时区信息，假设它是UTC时间
  if (
    typeof timestamp === "string" &&
    !timestamp.includes("Z") &&
    !timestamp.includes("+")
  ) {
    // 将数据库时间字符串转换为UTC时间，然后转为本地时间
    return dayjs.utc(timestamp).local().format("YYYY-MM-DD HH:mm:ss");
  }

  // 其他情况直接格式化为本地时间
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss");
}
