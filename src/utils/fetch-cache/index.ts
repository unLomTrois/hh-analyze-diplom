import { existsSync, mkdirSync } from "fs";
import fetch, { RequestInit } from "node-fetch";
import { addToCache, getFromCache, resolvePathForCache } from "./cache.js";

export const fetchCache = async (
  url: string,
  init?: RequestInit
): Promise<any> => {
  const cache_dir_path = "./data/cache";
  if (!existsSync(cache_dir_path)) {
    mkdirSync(cache_dir_path, { recursive: true });
  }

  const cache_file_path: string = resolvePathForCache(url, cache_dir_path);

  if (existsSync(cache_file_path)) {
    // read from cache
    const data: any = getFromCache(cache_file_path);

    if (data === undefined) {
      const data: any = await fetch(url, init).then((res) => res.json());

      // add data to cache
      addToCache(cache_file_path, data);

      return data;
    }

    return data;
  } else {
    // make new fetch and get json
    const data: any = await fetch(url, init).then((res) => res.json());

    // add data to cache
    addToCache(cache_file_path, data);

    return data;
  }
};
