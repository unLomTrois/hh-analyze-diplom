import ora from "ora";
import { API } from "../../types/api/module";
import { saveToFile } from "../../utils";

const MINIMUM_WAGE = 15_279

export const analyzeClusters = (
  clusters: API.FormattedClusters,
  found: number
) => {
  return {
    salary_info: analyzeSalaryCluster(clusters.salary, found),
    experience_info: analyzeExperienceCluster(clusters.experience, found),
    employment_info: analyzeSimpleCluster(clusters.employment, found),
    schedule_info: analyzeSimpleCluster(clusters.schedule, found),
    industry_info: analyzeSimpleCluster(
      clusters?.industry ?? clusters.sub_industry,
      found
    ),
  };
};

const analyzeSimpleCluster = (simple_cluster: API.Cluster, found: number) => {
  const groups: any[] = simple_cluster.items.map((item) => {
    return {
      name: item.name,
      count: item.count,
      ratio: parseFloat((item.count / found).toFixed(2)),
    };
  });

  return groups;
};

export const analyzeSalaryCluster = (
  salary_cluster: API.Cluster,
  found: number
) => {
  // количество вакансий с указанной зп
  const specified: number =
    salary_cluster.items.find((item) => item.name === "Указан")?.count ?? 0;

  const borders: any[] = [];

  salary_cluster.items.forEach((item, idx) => {
    if (item.name !== "Указан") {
      const next_item = salary_cluster.items[idx + 1];

      const interval_count =
        next_item !== undefined ? item.count - next_item.count : item.count;

      borders.push({
        from: parseFloat(item.name.split(" ")[1]), //полчаем число из фразы "от *число* руб."
        count: item.count,
        interval_count,
        ratio: parseFloat((item.count / found).toFixed(2)),
        ratio_to_specified: parseFloat((item.count / specified).toFixed(2)),
        ratio_of_interval_count_to_specified: parseFloat(
          (interval_count / specified).toFixed(2)
        ),
      });
    }
  });

  (() => {
    const next_item = borders[0];

    const count = specified - next_item.count;

    const interval_count = count;

    borders.unshift({
      from: MINIMUM_WAGE, //полчаем число из фразы "от *число* руб."
      count: count,
      interval_count,
      ratio: parseFloat((count / found).toFixed(2)),
      ratio_to_specified: parseFloat((count / specified).toFixed(2)),
      ratio_of_interval_count_to_specified: parseFloat(
        (interval_count / specified).toFixed(2)
      ),
    });
  })();

  ora().info("found: " + found)
  saveToFile(borders, "analyzed_data", "salary_cluster.json")
  saveToFile(salary_cluster, "analyzed_data", "raw_salary_cluster.json")

  const mean_salary = borders.reduce((acc, d) => {
    return (acc += d.from * d.count);
  }, 0);

  // результат
  return {
    specified: specified,
    mean_salary: mean_salary / found,
    mean_salary_to_specified: mean_salary / specified,
    specified_ratio: specified / found, // отношение всех вакансий к количеству с указнной зп
    borders,
  };
};

const analyzeExperienceCluster = (
  cluster: API.Cluster,
  found: number
) => {
  const groups = [
    { from: 0, to: 1, count: cluster.items.find((item) => item.name === "Нет опыта")?.count ?? 0 },
    { from: 1, to: 3, count: cluster.items.find((item) => item.name === "От 1 года до 3 лет")?.count ?? 0 },
    { from: 3, to: 6, count: cluster.items.find((item) => item.name === "От 3 до 6 лет")?.count ?? 0, },
    { from: 6, to: null, count: cluster.items.find((item) => item.name === "Более 6 лет")?.count ?? 0 },
  ];
  return groups.map(group => {return {...group, ratio: parseFloat((group.count / found).toFixed(2))}});
};



