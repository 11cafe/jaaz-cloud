import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// 扩展 dayjs 插件
dayjs.extend(utc);

/**
 * Convert timestamp string to milliseconds for comparison
 * 将时间戳字符串转换为毫秒数用于比较
 * 所有时间都按 UTC 处理
 * @param timestamp - ISO string or timestamp
 * @returns milliseconds since epoch
 */
export function toTimestamp(timestamp: string | number | Date): number {
  if (typeof timestamp === "number") {
    return timestamp;
  }
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  // 确保解析为 UTC 时间
  return dayjs.utc(timestamp).valueOf();
}

/**
 * Check if a timestamp has expired
 * 检查时间戳是否已过期（基于 UTC 时间）
 * @param expiresAt - expiration timestamp
 * @param currentTime - current time (optional, defaults to now)
 * @returns true if expired
 */
export function isExpired(
  expiresAt: string | number | Date,
  currentTime?: string | number | Date,
): boolean {
  const expiresTimestamp = toTimestamp(expiresAt);
  const currentTimestamp = currentTime
    ? toTimestamp(currentTime)
    : dayjs.utc().valueOf();

  // console.log("Time comparison (UTC):", {
  //   expires_at: expiresAt,
  //   expires_timestamp: expiresTimestamp,
  //   expires_utc: dayjs.utc(expiresTimestamp).format("YYYY-MM-DD HH:mm:ss"),
  //   current_timestamp: currentTimestamp,
  //   current_utc: dayjs.utc(currentTimestamp).format("YYYY-MM-DD HH:mm:ss"),
  //   is_expired: expiresTimestamp < currentTimestamp,
  //   diff_seconds: Math.floor((expiresTimestamp - currentTimestamp) / 1000),
  // });

  return expiresTimestamp < currentTimestamp;
}

/**
 * Create expiration time from current time plus seconds
 * 从当前 UTC 时间加上秒数创建过期时间
 * @param seconds - seconds to add
 * @returns ISO string for database storage (UTC)
 */
export function createExpirationTime(seconds: number): string {
  // 使用 UTC 时间创建过期时间
  const expiresAt = dayjs.utc().add(seconds, "second");
  return expiresAt.toISOString();
}

/**
 * Get current UTC time as ISO string
 * 获取当前 UTC 时间的 ISO 字符串
 * @returns ISO string in UTC
 */
export function getCurrentUTCTime(): string {
  return dayjs.utc().toISOString();
}

/**
 * Format UTC timestamp to Shanghai time for display
 * 将 UTC 时间戳格式化为上海时间显示
 * @param timestamp - UTC timestamp
 * @returns formatted string in Shanghai time
 */
export function formatToShanghaiTime(timestamp: string | number): string {
  return dayjs.utc(timestamp).utcOffset(8).format("YYYY-MM-DD HH:mm:ss");
}

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
