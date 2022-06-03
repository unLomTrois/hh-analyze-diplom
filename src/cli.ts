import commander, { Command } from "commander";
import { getArea, getFromLog, saveToFile } from "./utils";
import { API } from "./types/api/module";
import { getFull, search, prepare, quick } from "./core/index.js";
import { analyze } from "./core/analyze";
import { selectKeySkills } from "./db";
import ora from "ora";
import { getConnection } from "typeorm";
import { search_full } from "./core/search_full";

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

      search({ ...raw_query, area });

      // if (cli.opts().all) {
      //   await data
      //     .then((vacancies) => getFull(vacancies))
      //     .then((full_vacancies) => prepare(full_vacancies))
      //     .then((prepared_vacancies) => {
      //       const clusters: API.FormattedClusters = getFromLog(
      //         "data",
      //         "clusters.json"
      //       );

      //       return analyze();
      //     });
      // }
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
      await search_full();
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
    .action(async () => {
      analyze();
    });

  return cli;
};

export default getCLI;
