import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const dataDirectory = path.resolve(currentDirectory, "../../../data");

const cacheFilePath = path.join(dataDirectory, "mandi-cache.json");
const historyFilePath = path.join(dataDirectory, "mandi-history.json");

const CACHE_DURATION = 10 * 60 * 1000;

let memoryCache = null;
let memoryCacheTime = 0;

let cacheWriteQueue = Promise.resolve();

const ensureDataDirectory = async () => {
  await fs.mkdir(dataDirectory, { recursive: true });
};

const readJsonFile = async (filePath, fallback = null) => {
  try {
    const content = await fs.readFile(filePath, "utf-8");

    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
};

const writeJsonFile = async (filePath, data) => {
  const operation = async () => {
    await ensureDataDirectory();

    const temporaryPath = path.join(
      dataDirectory,
      `${path.basename(filePath)}.${randomUUID()}.tmp`
    );

    try {
      await fs.writeFile(
        temporaryPath,
        JSON.stringify(data, null, 2),
        {
          encoding: "utf-8",
          flag: "wx",
        }
      );

      await fs.rename(temporaryPath, filePath);
    } finally {
      await fs.rm(temporaryPath, { force: true });
    }
  };

  const writePromise = cacheWriteQueue.then(operation);

  cacheWriteQueue = writePromise.catch(() => {});

  return writePromise;
};

export const getMemoryCache = () => {
  if (!memoryCache) {
    return null;
  }

  return {
    data: memoryCache,
    cachedAt: memoryCacheTime,
    isFresh: Date.now() - memoryCacheTime < CACHE_DURATION,
  };
};

export const setMemoryCache = (data) => {
  memoryCache = data;
  memoryCacheTime = Date.now();
};

export const getFileCache = async () => {
  return readJsonFile(cacheFilePath);
};

export const setFileCache = async (data) => {
  await writeJsonFile(cacheFilePath, data);
};

export const getPriceHistory = async () => {
  const history = await readJsonFile(historyFilePath, {});

  if (
    !history ||
    typeof history !== "object" ||
    Array.isArray(history)
  ) {
    return {};
  }

  return history;
};

export const updatePriceHistory = async (records) => {
  const history = await getPriceHistory();

  for (const record of records) {
    const key = `${record.commodity}-${record.market}`.toLowerCase();

    const currentPrice = Number(record.modalPrice);

    if (!Number.isFinite(currentPrice)) {
      continue;
    }

    const previousEntry = history[key];

    const previousPrice = Number(previousEntry?.modalPrice || 0);

    const change =
      previousPrice > 0
        ? ((currentPrice - previousPrice) / previousPrice) * 100
        : null;

    record.previousModalPrice = previousPrice || null;
    record.change = change;

    record.type =
      change === null
        ? null
        : change > 0
          ? "up"
          : change < 0
            ? "down"
            : "same";

    history[key] = {
      modalPrice: currentPrice,
      updatedAt: new Date().toISOString(),
    };
  }

  await writeJsonFile(historyFilePath, history);

  return records;
};