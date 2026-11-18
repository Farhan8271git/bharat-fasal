import {
  getMemoryCache,
  setMemoryCache,
  getFileCache,
  setFileCache,
  updatePriceHistory,
} from "./mandi.cache.js";

const MANDI_API_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

const REQUEST_TIMEOUT = 15000;

const inFlightRequests = new Map();

const normalizeMandiRecord = (record) => ({
  ...record,
  commodity: record.commodity ?? record.Commodity ?? "",
  market: record.market ?? record.Market ?? "",
  variety: record.variety ?? record.Variety ?? "",
  grade: record.grade ?? record.Grade ?? "",
  district: record.district ?? record.District ?? "",
  state: record.state ?? record.State ?? "",
  minPrice:
    record.minPrice ??
    record.min_price ??
    record.Min_Price ??
    null,
  maxPrice:
    record.maxPrice ??
    record.max_price ??
    record.Max_Price ??
    null,
  modalPrice:
    record.modalPrice ??
    record.modal_price ??
    record.Modal_Price ??
    null,
  arrivalDate:
    record.arrivalDate ??
    record.arrival_date ??
    record.arrival_date_time ??
    record.Arrival_Date ??
    "",
});

const normalizeMandiResponse = (response) => {
  if (
    !response ||
    typeof response !== "object" ||
    !Array.isArray(response.records)
  ) {
    throw new Error("Invalid response received from Government Mandi API");
  }

  return {
    ...response,
    records: response.records.map((record) => {
      if (
        !record ||
        typeof record !== "object" ||
        Array.isArray(record)
      ) {
        throw new Error("Invalid mandi record received from Government API");
      }

      return normalizeMandiRecord(record);
    }),
  };
};

const getCachedRecords = (cachedData, limit, source) => {
  if (!cachedData || !Array.isArray(cachedData.records)) {
    return null;
  }

  const records = cachedData.records.slice(0, limit);

  return {
    ...cachedData,
    records,
    count: records.length,
    limit,
    cacheSource: source,
  };
};

const fetchGovernmentData = async (limit) => {
  const apiKey = process.env.DATA_GOV_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Government Mandi API credentials are not configured");
  }

  const url = new URL(MANDI_API_URL);

  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    throw new Error(
      `Government Mandi API returned HTTP ${response.status}`
    );
  }

  const responseData = await response.json();

  return normalizeMandiResponse(responseData);
};

const persistMandiData = async (data) => {
  try {
    await updatePriceHistory(data.records);
  } catch (error) {
    console.error("Mandi price history update failed:", error.message);
  }

  try {
    await setFileCache(data);
  } catch (error) {
    console.error("Mandi file cache update failed:", error.message);
  }
};

const fetchAndCacheMandiData = async (limit) => {
  const governmentData = await fetchGovernmentData(limit);

  setMemoryCache(governmentData);

  await persistMandiData(governmentData);

  return {
    ...governmentData,
    cacheSource: "government-api",
  };
};

const getFileCacheFallback = async (limit) => {
  try {
    const fileCache = await getFileCache();

    return getCachedRecords(fileCache, limit, "file");
  } catch (error) {
    console.error("Mandi file cache read failed:", error.message);

    return null;
  }
};

const createServiceUnavailableError = (cause) => {
  const error = new Error(
    "Mandi price service is temporarily unavailable"
  );

  error.statusCode = 503;
  error.isOperational = true;
  error.cause = cause;

  return error;
};

const loadMandiPrices = async (limit, memoryCache) => {
  try {
    return await fetchAndCacheMandiData(limit);
  } catch (error) {
    console.error("Mandi government API request failed:", error.message);

    const memoryFallback = getCachedRecords(
      memoryCache?.data,
      limit,
      "memory-stale"
    );

    if (memoryFallback?.records.length > 0) {
      return memoryFallback;
    }

    const fileFallback = await getFileCacheFallback(limit);

    if (fileFallback?.records.length > 0) {
      return fileFallback;
    }

    throw createServiceUnavailableError(error);
  }
};

export const getMandiPrices = async (limit) => {
  const memoryCache = getMemoryCache();

  if (
    memoryCache?.isFresh &&
    memoryCache.data.records?.length >= limit
  ) {
    return getCachedRecords(memoryCache.data, limit, "memory");
  }

  const existingRequest = inFlightRequests.get(limit);

  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = loadMandiPrices(limit, memoryCache);

  inFlightRequests.set(limit, requestPromise);

  try {
    return await requestPromise;
  } finally {
    if (inFlightRequests.get(limit) === requestPromise) {
      inFlightRequests.delete(limit);
    }
  }
};