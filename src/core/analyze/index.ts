import { resolve } from "node:path";
import ora from "ora";
import {
  countVacancies,
  selectFullVacancies,
  selectFullVacancy,
} from "../../db";
import { API } from "../../types/api/module";
import { saveToFile, buildRootURL, formatClusters } from "../../utils";
import { getVacanciesInfo } from "../requests";
import { analyzeClusters } from "./clusters";
import { analyzeVacancies } from "./vacancies";

export const analyze = async () => {

  // обработка кластеров
  ora().info("обработка кластеров...")
  const clusters = await getclusters();

  // всего вакансий
  const found: number = clusters?.found ?? (await countVacancies());

  const analyzed_clusters = analyzeClusters(clusters, found);
  saveToFile(analyzed_clusters, "analyzed_data", "analyzed_clusters.json");

  // обработка вакансий
  ora().info("обработка вакансий...")
  const vacancies = await selectFullVacancies();
  const analyzed_vacancies = await analyzeVacancies(
    vacancies as API.PreparedVacancy[],
    found
  );
  saveToFile(analyzed_vacancies, "analyzed_data", "analyzed_vacancies.json");

  const analyzed_data = {
    vacancy_count: found,
    analyzed_clusters,
    analyzed_vacancies,
  };

  saveToFile(analyzed_data, "analyzed_data", "analyzed_data.json");
  console.log(
    "Результаты анализа доступны в файле:",
    resolve(process.cwd(), "analyzed_data", "analyzed_data.json")
  );

  return analyzed_data;
};

const getclusters = async () => {
  const raw_query: API.Query = {
    area: 113,
    specialization: "1",
    clusters: true,
    // industry: "7",
  };

  const root_query = buildRootURL(raw_query);
  console.log("Коренной запрос:", root_query);

  const response: API.Response = await getVacanciesInfo(root_query);

  const clusters: API.FormattedClusters = formatClusters(
    response.clusters,
    response.found
  );

  return clusters;
};
