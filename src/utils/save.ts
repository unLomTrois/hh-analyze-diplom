import { existsSync, mkdirSync, readFileSync, writeFile } from "fs";
import { resolve } from "path";

export const getFromLog = (
  log_dir_path: string,
  log_file_name: string
): any => {
  const path = resolve(process.cwd(), log_dir_path, log_file_name);

  // short_vacancies
  const data = JSON.parse(readFileSync(path, { encoding: "utf-8" }));

  return data;
};

export const saveToFile = (
  something_to_save: any,
  log_dir_path: string,
  filename_to_log: string,
  space: number = 2,
  silent_mode: boolean = true
): void => {
  // если нет папки для сохранения логов, создать её
  if (!existsSync(log_dir_path)) {
    mkdirSync(log_dir_path, { recursive: true });
  }

  // получить путь для сохранения
  const log_path = resolve(process.cwd(), log_dir_path, filename_to_log);

  // сохранить в лог
  writeFile(
    log_path,
    JSON.stringify(something_to_save, undefined, space),
    (err) => {
      if (err) throw err;
      if (!silent_mode) {
        console.log("успешно сохранено в:", log_path);
        // const ctx = new chalk.Instance({ level: 1 });
        // console.log(ctx.yellow("успешно сохранено в:"), ctx.green(log_path));
      }
    }
  );
};
