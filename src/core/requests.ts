import { Spinner } from "cli-spinner";
import { chunk, compact } from "lodash-es";
import fetch from "node-fetch";
import { getConnection, getRepository } from "typeorm";
import { countVacancies, insertVacancies } from "../db";
import { API } from "../types/api/module";
import { fetchCache, formatClusters } from "../utils";

export const hh_headers = {
  "User-Agent": "labor-market-analyzer (vadim.kuz02@gmail.com)",
};

export const getVacanciesInfo = async (url: string): Promise<API.Response> => {
  const data: API.Response = await fetch(
    url.match(/[_\.!~*'()-]/) && url.match(/%[0-9a-f]{2}/i)
      ? url
      : encodeURI(url),
    {
      headers: hh_headers,
    }
  ).then((res) => res.json());

  return data;
};

export const getVacancies = async (urls: string[]) => {
  const chunk_size = 50;
  const chunked_urls = chunk(urls, chunk_size);

  console.log("количество чанков:", chunked_urls.length);
  console.log("размер чанка:", chunk_size);

  const vacancies: API.Vacancy[] = [];

  const spinner = new Spinner("подготовка... %s");
  spinner.setSpinnerString("|/-\\");
  spinner.start();

  const connection = getConnection();

  let i = 1;
  for (const urls_chunk of chunked_urls) {
    spinner.setSpinnerTitle(`${i}/${chunked_urls.length} %s`);

    const vacs_from_chunk = await getVacanciesFromURLs(urls_chunk);

    vacancies.push(...vacs_from_chunk);

    for (const chunkItem of chunk(compact(vacancies), 100)) {
      try {
        await insertVacancies(connection, chunkItem)
      } catch (e) {
        console.error("произошла ошибка:", e)
        console.error("чанк, приведший к ошибке:", chunkItem);
        break;
      }
    }

    i++;
  }
  console.log(
    "поиск вакансий закончен, всего найдено:",
    await countVacancies()
  );

  console.log("");
  spinner.stop();

  return vacancies;
};

export const getFullVacancies = async (
  urls: string[]
): Promise<API.FullVacancy[]> => {
  const chunked_urls = chunk(urls, 100);
  const full_vacancies: API.FullVacancy[] = [];

  console.log("количество чанков:", chunked_urls.length);

  let i = 1;
  for (const chunk of chunked_urls) {
    process.stdout.write(`${i}/${chunked_urls.length}\r`);
    i++;
    full_vacancies.push(...(await getFullVacanciesFromURLs(chunk)));
  }
  console.log("");

  return full_vacancies;
};

export const getVacanciesFromURLs = async (
  urls: string[]
): Promise<API.Vacancy[]> => {
  const data: Promise<API.Response>[] = urls.map((url) =>
    fetch(url, {
      headers: hh_headers,
    }).then((res) => res.json())
  );

  // дождаться резолва промисов, получить их поля items
  const vacancies: API.Vacancy[] = ([] as API.Vacancy[]).concat(
    ...(await Promise.all(data)).map((page) => {
      return page.items;
    })
  );

  return vacancies;
};

export const getFullVacanciesFromURLs = async (
  urls: string[]
): Promise<API.FullVacancy[]> => {
  const data: Promise<API.FullVacancy>[] = urls.map((url) =>
    fetchCache(url, { headers: hh_headers })
  );

  const full_vacancies: API.FullVacancy[] = await Promise.all(data);

  return full_vacancies;
};
