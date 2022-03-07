import { existsSync, readFileSync, writeFile } from "fs";
import { resolve } from "path";
import { md5 } from "./hash.js";

export const getFromCache = (path: string): any => {
  if (!existsSync(path)) {
    return undefined;
  }

  const file: string = readFileSync(path, { encoding: "utf-8" });

  if (file == "") {
    return undefined;
  }

  return JSON.parse(file);
};

export const addToCache = (path: string, data: any): void => {
  writeFile(path, JSON.stringify(data), (err) => {
    if (err) throw err;
  });
};

export const resolvePathForCache = (url: string, cache_dir_path: string) => {
  const cache_hash: string = md5(url);

  return resolve(process.cwd(), cache_dir_path, `${cache_hash}`);
};
