import commander, { Command } from "commander";
import { getArea, getFromLog, saveToFile } from "./utils";
import { API } from "./types/api/module";
import {
  getFull,
  search,
  prepare,
  checkForUnique,
  quick,
} from "./core/index.js";
import { analyze } from "./core/analyze";
import {
  existsVacancy,
  insertFullVacancies,
  selectVacancies,
  selectVacanciesURLs,
} from "./db";
import ora, { oraPromise } from "ora";
import { Connection, getConnection, getRepository } from "typeorm";
import { Vacancy } from "./entity/Vacancy";
import { FullVacancy } from "./entity/FullVacancy";
import fetch from "node-fetch";
import { smart_fetch } from "./core/smartfetch";
import { chunk, compact } from "lodash-es";

/**
 * инициализация CLI
 * @returns cli instance
 */
const getCLI = (): commander.Command => {
  const cli = new Command();

  cli.name("node-hh-parser").version("1.0.0");

  // инициализация полей (опций)
  cli
    .option("-A, --all", "выполнить все остальные комманды автоматически")
    .option(
      "-a, --area <area-name>",
      "название территории поиска или индекс",
      "Россия"
    )
    .option("-S, --silent", "не выводить информацию в консоль")
    .option("-s, --save", "сохранить данные в файл")
    .option("-m, --magic", "использовать умный поиск");

  // инициализация команд (операций)
  cli
    .command("search <text>")
    .description("поиск вакансий по полю text")
    .action(async (text: string) => {
      const area = await getArea(cli.opts().area);

      const raw_query: API.Query = {
        // text: text,
        area: area,
        specialization: "1",
        clusters: true,
        industry: "7",
        // no_magic: cli.opts().magic ?? false
      };

      const data = search({ ...raw_query, area });

      if (cli.opts().all) {
        await data
          .then((vacancies) => getFull(vacancies))
          .then((full_vacancies) => prepare(full_vacancies))
          .then((prepared_vacancies) => {
            const clusters: API.FormattedClusters = getFromLog(
              "data",
              "clusters.json"
            );

            return analyze(prepared_vacancies, clusters);
          });
      }
    });

  cli
    .command("quick")
    .description("быстрый анализ рынка")
    .action(async () => {
      await quick();

      // let urls = await getURLs(root_query, response.found, clusters);
      // saveToFile(urls, "data", "urls1.json");
    });

  cli
    .command("full")
    .description("получает полное представление вакансий")
    .action(async () => {
      const connection = getConnection();
      const urls = await selectVacanciesURLs();

      const full_arr = [];

      const chunks = chunk(urls, 100);

      const asyncfetch = async (urls: string[]) => {
        const data = urls.map((url) => smart_fetch(connection, url));

        const full_vacancies: FullVacancy[] = await Promise.all(data);

        return full_vacancies;
      };

      await oraPromise(async (spinner) => {
        // let i = 1;
        for (const chunk of chunks) {
          spinner.text = `скачивание полных вакансий... ${full_arr.length}/${urls.length}`;

          const full_vacancies = await asyncfetch(chunk);

          full_arr.push(...full_vacancies);

          // i++;
        }
      }, "скачивание полных вакансий...");
    });

  cli
    .command("get-full")
    .description("получает полное представление вакансий")
    .action(async () => {
      const vacancies: API.Vacancy[] = getFromLog("data", "vacancies.json");
      const full_vacancies = await getFull(vacancies);
      if (cli.opts().save) {
        saveToFile(full_vacancies, "data", "full_vacancies.json");
      }
    });

  cli
    .command("prepare")
    .description("подготовить полные вакансии для выдачи")
    .action(async () => {
      const full_vacancies = await getFromLog("data", "full_vacancies.json");
      prepare(full_vacancies);
    });

  cli
    .command("analyze")
    .description("проанализировать полученные данные")
    .action(() => {
      const prepared_vacancies: API.FullVacancy[] = getFromLog(
        "data",
        "prepared_vacancies.json"
      );
      const clusters: API.FormattedClusters = getFromLog(
        "data",
        "clusters.json"
      );

      analyze(prepared_vacancies, clusters);
    });

  return cli;
};

export default getCLI;
