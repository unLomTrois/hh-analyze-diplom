import { chunk } from "lodash-es";
import { oraPromise } from "ora";
import { Connection, getConnection } from "typeorm";
import { selectVacanciesURLs } from "../db";
import { FullVacancy } from "../entity/FullVacancy";
import { smart_fetch } from "./smartfetch";

export const search_full = async () => {
  const connection = getConnection();
  const urls = await selectVacanciesURLs();
  const full_arr = [];
  const chunks = chunk(urls, 100);
  await oraPromise(async (spinner) => {
    for (const chunk of chunks) {
      spinner.text = `скачивание полных вакансий... ${full_arr.length}/${urls.length}`;

      const full_vacancies = await asyncfetch(connection, chunk);

      full_arr.push(...full_vacancies);
    }
  }, "скачивание полных вакансий...");
};

const asyncfetch = async (connection: Connection, urls: string[]) => {
  const data = urls.map((url) => smart_fetch(connection, url));

  const full_vacancies: FullVacancy[] = await Promise.all(data);

  return full_vacancies;
};




