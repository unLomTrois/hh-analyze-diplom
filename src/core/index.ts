import { chunk, compact } from "lodash-es";
import ora, { oraPromise } from "ora";
import { getConnection } from "typeorm";
import { Vacancy } from "../entity/Vacancy.js";
import { API } from "../types/api/module.js";
import { buildRootURL, formatClusters, saveToFile } from "../utils";
import { getURLs } from "./branch.js";
import {
  getFullVacancies,
  getVacancies,
  getVacanciesInfo,
} from "./requests.js";

export const search = async (query: API.Query) => {
  const spinner = ora().start();

  const query_url = await oraPromise(async () => {
    return buildRootURL({
      ...query,
      per_page: 0,
      page: 0,
    });
  }, "формирование коренного запроса...");
  spinner.info(`Коренной запрос: ${query_url}`);

  const response: API.Response = await oraPromise(
    getVacanciesInfo(query_url),
    "получение данных по запросу..."
  );

  spinner.info(`всего по данному запросу найдено: ${response.found} вакансий`);

  const clusters: API.FormattedClusters = formatClusters(
    response.clusters,
    response.found
  );
  saveToFile(clusters, "data", "clusters.json");
  saveToFile(response.clusters, "data", "raw_clusters.json");

  let urls = await getURLs(query_url, response.found, clusters);
  saveToFile(urls, "data", "urls.json");

  spinner.info(
    `количество запросов для получения сокращённых вакансий: ${urls.length}`
  );

  const vacancies: API.Vacancy[] = await getVacancies(urls);

  saveToFile(compact(vacancies), "data", "vacancies.json");
  saveToFile(
    {
      date: new Date().toLocaleString("ru", { timeZone: "Europe/Moscow" }),
      count: vacancies.length,
      vacancies,
    },
    "data",
    "vacancies2.json"
  );

  spinner.stop();

  return vacancies;
};

export const quick = async () => {
  const raw_query: API.Query = {
    area: 113,
    clusters: true,
  };

  const root_query = buildRootURL(raw_query);
  console.log("Коренной запрос:", root_query);

  const response: API.Response = await getVacanciesInfo(root_query);

  const clusters: API.FormattedClusters = formatClusters(
    response.clusters,
    response.found
  );

  const nested_clusters = {
    count: response.found,
    ...clusters.professional_role,
    items: await Promise.all(
      clusters.professional_role.items.map(async (item) => {
        const response: API.Response = await getVacanciesInfo(item.url);
        const clusters: API.FormattedClusters = formatClusters(
          response.clusters,
          response.found
        );
        return { ...item, salary: clusters.salary };
      })
    ),
  };

  saveToFile(nested_clusters, "data", "nested.json", 2, false);
};

export const checkForUnique = async (vacancies: API.Vacancy[]) => {
  console.log(vacancies.length);
  const connection = getConnection();
  console.log("вставка в бд");

  let i = 0;
  for (const chunkItem of chunk(compact(vacancies), 100)) {
    console.log(i);
    try {
      await connection
        .createQueryBuilder()
        .insert()
        .into(Vacancy)
        .values(chunkItem)
        .orIgnore(true)
        .execute();
      i++;
    } catch (e) {
      console.log(chunkItem);
      break;
    }
  }
  console.log(
    "вставка закончена, число:",
    await connection.getRepository(Vacancy).count()
  );
};

export const getFull = async (vacancies: API.Vacancy[]) => {
  console.log("парсинг полных вакансий");

  const full_vacancies_urls = vacancies
    .filter((vacancy) => vacancy?.url != undefined)
    .map((vacancy) => {
      try {
        return vacancy.url;
      } catch (error) {
        console.log(vacancy);
      }
      return vacancy.url;
    });

  const full_vacancies = await getFullVacancies(full_vacancies_urls);

  console.log("спаршенно полных вакансий:", full_vacancies.length);

  return full_vacancies;
};

export const prepare = async (full_vacancies: API.FullVacancy[]) => {
  // нам важны поля key_skills
  const prepared_vacancies: API.PreparedVacancy[] = full_vacancies.map(
    (vac: API.FullVacancy) => {
      return {
        key_skills: vac.key_skills,
        response_letter_required: vac.response_letter_required,
        has_test: vac.has_test,
        test: vac.test,
        salary: vac.salary,
        allow_messages: vac.allow_messages,
        accept_incomplete_resumes: vac.accept_incomplete_resumes,
        accept_temporary: vac.accept_temporary,
      };
    }
  );

  saveToFile(prepared_vacancies, "data", "prepared_vacancies.json");

  return prepared_vacancies;
};
