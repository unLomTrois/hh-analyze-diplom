import { createHash } from "crypto";

export const md5 = (str: string): string => {
  return createHash("md5").update(str, "utf8").digest("hex");
};
