import { chunk, compact } from "lodash-es";
import fetch from "node-fetch";
import { getConnection } from "typeorm";
import { countVacancies, insertVacancies } from "../db";
import { API } from "../types/api/module";
import { fetchCache } from "../utils";

import ora, { oraPromise } from "ora";

export const hh_headers = {
  "User-Agent": "labor-market-analyzer (vadim.kuz02@gmail.com)",
};

/**
 * получает информацию о вакансиях по запросу url
 * * обычно используется для получения информации о кластерах ответа
 * @param url ссылка запроса
 * @returns ответ содержит информацию о количестве найденных вакансий, их списки, кластера для разбивки поиска
 */
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

/**
 * скачивает и сохраняет вакансии по массиву ссылок
 * @param urls массив ссылок к спискам вакансий
 * @returns массив вакансий
 */
export const getVacancies = async (urls: string[]): Promise<API.Vacancy[]> => {
  const chunk_size = 50;
  const chunked_urls = chunk(urls, chunk_size);
  const spinner = ora("подготовка").start();
  const vacancies: API.Vacancy[] = [];

  spinner.info(`размер чанка: ${chunk_size}`);
  spinner.info(`количество чанков: ${chunked_urls.length}`);

  const connection = getConnection();
  spinner.info("установка соединения с базой данных");

  await oraPromise(async (spinner) => {
    let i = 1;
    for (const urls_chunk of chunked_urls) {
      spinner.text = `скачивание вакансий... ${i}/${chunked_urls.length}`;

      const vacs_from_chunk = await getVacanciesFromURLs(urls_chunk);

      vacancies.push(...vacs_from_chunk);

      i++;
    }
  }, "скачивание вакансий...");

  await oraPromise(async (spinner) => {
    let i = 1;

    const compacted_vacs = compact(vacancies);
    const chunked_vacancies = chunk(compacted_vacs, 100);
    for (const chunkItem of chunked_vacancies) {
      try {
        spinner.text = `сохранение вакансий в базу данных... ${i}/${chunked_vacancies.length}`;
        await insertVacancies(connection, chunkItem);
      } catch (e) {
        spinner.fail("произошла ошибка");
        console.error(e);
        console.error("чанк, приведший к ошибке:", chunkItem);
        break;
      }
      i++;
    }
  }, "сохранение вакансий в базу данных...");

  spinner.info(
    `поиск вакансий закончен, всего найдено: ${await countVacancies()}`
  );

  spinner.stop();

  return vacancies;
};

/**
 * скачивает по ссылкам отдельных вакансий их полную версию
 * * полная версия вакансий содержит расширенную информацию о вакансии, например, список тегов
 * @param urls массив ссылок к отдельным вакансиям
 * @returns массив полных вакансий
 */
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

/**
 * скачивает вакансии по массиву ссылок
 * TODO: переименовать, типа fetchVacancies
 * @param urls массив ссылок к спискам вакансий
 * @returns массив вакансий
 */
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

/**
 * скачивает полные вакансии по массиву ссылок
 * TODO: переименовать типа fetchFulLVacancies
 * @param urls массив к отдельным вакансиям
 * @returns массив полных вакансий
 */
export const getFullVacanciesFromURLs = async (
  urls: string[]
): Promise<API.FullVacancy[]> => {
  const data: Promise<API.FullVacancy>[] = urls.map((url) =>
    fetchCache(url, { headers: hh_headers })
  );

  const full_vacancies: API.FullVacancy[] = await Promise.all(data);

  return full_vacancies;
};
