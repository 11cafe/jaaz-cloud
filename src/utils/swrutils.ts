import { defaultPageSize } from "./consts";

const apiKeysToCache = [
  "/api/workflow/listMyWorkflows?pageSize=20&pageNumber=1",
  "/api/workflow/listMyRunJob?pageSize=50&pageNumber=1",
  `/api/workflow/listMyWorkflows*`,
  "/api/workflow/listMyRunJob*",
  "/api/model/listModelByFolderName?folder=checkpoints",
  "/api/model/listModelByFolderName?folder=loras",
  "/api/model/listModelByFolderName?folder=vae",
  "/api/model/listModelByFolderName?folder=controlnet",
  "/api/model/listModelByFolderName?folder=animatediff_models",
  "/api/machine/listMyMachines",
  "/api/storage/listMyStorage",
  `/api/billing/listTransactions?pageSize=${defaultPageSize}&pageNumber=1`,
  "/api/billing/getBalance",
  "/api/machine/listMachineModels?machineID=*",
];

// Function to check if a URL matches any of the patterns in apiKeysToCache
function matchesAnyPattern(url: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(url);
    }
    return url === pattern;
  });
}

export function swrLocalStorageProvider() {
  if (typeof window === "undefined") {
    // Return a dummy storage for server-side rendering
    return new Map();
  }

  // When initializing, we restore the data from localStorage into a map.
  const map = new Map<string, any>(
    JSON.parse(localStorage.getItem("app-cache") || "[]"),
  );

  // Before unloading the app, we write back all the data into localStorage.
  window.addEventListener("beforeunload", () => {
    const cacheMap = new Map<string, any>();
    for (const [key, value] of map.entries()) {
      if (matchesAnyPattern(key, apiKeysToCache)) {
        cacheMap.set(key, value);
      }
    }
    const appCache = JSON.stringify(Array.from(cacheMap.entries()));
    localStorage.setItem("app-cache", appCache);
  });

  // We still use the map for write & read for performance.
  return map;
}
