import { Command } from "commander";
import { getArea, getFromLog } from "./utils";
import { API } from "./types/api/module";
import { getFull, search, prepare } from "./core/index.js";
import { analyze } from "./core/analyze";

const getCLI = () => {
  const cli = new Command();

  cli.name("node-hh-parser").version("1.0.0");

  // инициализация полей (опций)
  cli
    .option(
      "-A, --all",
      "выполнить все остальные комманды автоматически",
      "Россия"
    )
    .option(
      "-a, --area <area-name>",
      "название территории поиска или индекс",
      "Россия"
    )
    .option("-S, --silent", "не выводить информацию в консоль");

  // инициализация команд (операций)
  cli
    .command("search <text>")
    .description("поиск вакансий по полю text")
    .action(async (text: string) => {
      const area = await getArea(cli.opts().area);

      const raw_query: API.Query = {
        text: text,
        area: area,
        clusters: true,
      };

      const data = search({ ...raw_query, text, area });

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
    .command("get-full")
    .description("получает полное представление вакансий")
    .action(() => {
      const vacancies: API.Vacancy[] = getFromLog("data", "vacancies.json");

      getFull(vacancies);
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
