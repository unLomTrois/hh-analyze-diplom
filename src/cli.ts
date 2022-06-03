import commander, { Command } from "commander";
import { getArea, getFromLog, saveToFile } from "./utils";
import { API } from "./types/api/module";
import {
  getFull,
  search,
  prepare,
  quick,
} from "./core/index.js";
import { analyze } from "./core/analyze";
import {
  selectKeySkills,
} from "./db";
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
      const connection = getConnection();
      const keyskills = await selectKeySkills(connection);

      ora().info(`${keyskills.length}`);

      const lol = kek(
        keyskills.map((skill) => skill.name),
        19745
      );

      saveToFile(lol, "data", "lol.json");

      // const prepared_vacancies: API.FullVacancy[] = getFromLog(
      //   "data",
      //   "prepared_vacancies.json"
      // );
      // const clusters: API.FormattedClusters = getFromLog(
      //   "data",
      //   "clusters.json"
      // );

      // analyze(prepared_vacancies, clusters);
    });

  return cli;
};

const kek = (key_skills: string[], vacancies_with_keyskills) => {
  const result: any = {};
  key_skills.forEach((skill) => {
    result[skill] = (result[skill] || 0) + 1;
  });

  const result_ents = Object.entries<number>(result);
  saveToFile(result, "data", "result.json");

  console.log("уникальные навыки:", result_ents.length);

  const rated_skills = result_ents
    .map((arr) => {
      return {
        name: arr[0],
        count: arr[1],
        ratio_to_vacancies: parseFloat(
          (arr[1] / vacancies_with_keyskills).toFixed(3)
        ),
        ratio_to_key_skills: parseFloat(
          (arr[1] / key_skills.length).toFixed(3)
        ),
      };
    })
    .filter((skill) => skill.ratio_to_vacancies >= 0.001)
    .sort((skill_1, skill_2) =>
      skill_1.count < skill_2.count ? 1 : skill_2.count < skill_1.count ? -1 : 0
    );

  return {
    vacancies_with_keyskills,
    key_skills: rated_skills,
    key_skills_count: key_skills.length,
  };
};

export default getCLI;
