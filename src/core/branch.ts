import { partition } from "lodash-es";
import fetch from "node-fetch";
import ora, { oraPromise } from "ora";
import { API } from "../types/api/module";
import {
  formatClusters,
  paginateClusters,
  paginateLink,
  saveToFile,
} from "../utils";
import { hh_headers } from "./requests";

/**
 * "разбивает" коренной запрос на массив ссылок
 * * чтобы покрыть как можно больше вакансий, а скачивать больше 2000 с одного запроса,
 * * запрос "разбивается" до тех пор, пока максимально не приблизится к лимиту в 2000 вакансий
 * * если же найдено меньше 2000, разбивать по кластерам не требуется, и запрос просто пагинируется
 * @param url коренной запрос
 * @param found количество найденных вакансий по данному коренному запросу
 * @param clusters кластера для разбития запроса
 * @returns массив ссылок на списки вакансий
 */
export const getURLs = async (
  url: string,
  found: number,
  clusters: API.FormattedClusters
): Promise<string[]> => {
  if (found <= 2000) {
    const pages: number = Math.ceil(found / 100);

    return paginateLink(url, pages);
  }

  ora().info("парсинг кластеров...");
  return await getURLsFromClusters(clusters);
};

/**
 * разделяет список кластеров на те, где count меньше 2000 и где больше
 *
 * @param {API.ClusterItem[]} items кластера
 * @returns 2 списка, в первом все кластера со значением count меньшим 2000, во втором с большим
 */
const splitItemsBy2000 = (
  items: API.ClusterItem[]
): [API.ClusterItem[], API.ClusterItem[]] =>
  partition(items, (item) => item.count <= 2000);

/**
 * разбиение кластеров для получения массива ссылок
 * * если поиск идёт по целой стране, региону, то в кластерах будет кластер "area"
 * * если же его нет, то делить запрос на регионы не требуется
 * TODO: переписать, иметь две функции для этого избыточно
 * @param clusters форматированные кластера
 * @returns массив ссылок
 */
export const getURLsFromClusters = async (
  clusters: API.FormattedClusters
): Promise<string[]> => {
  if (clusters.area === undefined) {
    return paginateClusters(await deepBranch(clusters.employment.items));
  }

  // поделить кластера по регионам, где больше 2000 и где меньше
  const final_items: API.ClusterItem[] = [];
  let [less_2000_clusters, more_2000_clusters] = splitItemsBy2000(
    clusters.area.items
  );
  final_items.push(...less_2000_clusters);
  console.log(
    "Со всей России, где меньше 2000 вакансий",
    final_items.reduce((acc, cur) => {
      return (acc += cur.count);
    }, 0)
  );

  const branched_clusters = (
    await Promise.all(
      more_2000_clusters.map(async (cluster) => {
        return deepBranch([cluster]);
      })
    )
  ).flat();

  final_items.push(...branched_clusters);

  const final_count = final_items.reduce((acc, cur) => {
    return (acc += cur.count);
  }, 0);
  console.log(clusters.found, final_count, clusters.found - final_count);

  return paginateClusters(final_items);
};

/**
 * глубокое ветвление кластеров, ветвит их до тех пор, пока не окажется кластеров с количеством вакансий больше 2000
 * @param cluster_items массив кластеров
 * @returns массив разбитых кластеров
 */
const deepBranch = async (
  cluster_items: API.ClusterItem[]
): Promise<API.ClusterItem[]> => {
  ora().info("начало ветвления...");

  const final_items: API.ClusterItem[] = [];

  let [less_2000_clusters, more_2000_clusters] = [[], []];

  await oraPromise(async () => {
    const branched_by_employment = await branchByEmployment(cluster_items);
    [less_2000_clusters, more_2000_clusters] = splitItemsBy2000(
      branched_by_employment
    );
    final_items.push(...less_2000_clusters);
  }, "ветвление по типу занятости...");

  await oraPromise(async () => {
    const branched_by_schedule = await branchBySchedule(more_2000_clusters);
    [less_2000_clusters, more_2000_clusters] =
      splitItemsBy2000(branched_by_schedule);
    final_items.push(...less_2000_clusters);
  }, "ветвление графику работы...");

  await oraPromise(async () => {
    const branched_by_professional_role = await branchByProfessionalRole(
      more_2000_clusters
    );
    [less_2000_clusters, more_2000_clusters] = splitItemsBy2000(
      branched_by_professional_role
    );
    final_items.push(...less_2000_clusters);
  }, "ветвление по проф.роли...");

  await oraPromise(async () => {
    const branched_by_industry = await branchByIndustry(more_2000_clusters);
    [less_2000_clusters, more_2000_clusters] =
      splitItemsBy2000(branched_by_industry);
    final_items.push(...less_2000_clusters);
  }, "ветвление по отрасли компаний...");

  return final_items;
};

const branchByEmployment = async (
  cluster_items: API.ClusterItem[]
): Promise<API.ClusterItem[]> => {
  const [less_2000_clusters, more_2000_clusters] =
    splitItemsBy2000(cluster_items);

  // branching more_2000_clusters
  const urls = more_2000_clusters.map((item) => item.url);
  const reponses: API.Response[] = await Promise.all(
    urls.map((url) =>
      fetch(url, {
        headers: hh_headers,
      }).then((res) => res.json())
    )
  );

  const branched_clusters: API.Cluster[] = reponses.flatMap(
    (res) => res.clusters
  );

  const experience_items = formatClusters(branched_clusters).experience.items;

  return [...less_2000_clusters, ...experience_items];
};

const branchBySchedule = async (
  cluster_items: API.ClusterItem[]
): Promise<API.ClusterItem[]> => {
  const urls = cluster_items.map((item) => item.url);
  const reponses: API.Response[] = await Promise.all(
    urls.map((url) =>
      fetch(url, {
        headers: hh_headers,
      }).then((res) => res.json())
    )
  );

  const branched_clusters: API.Cluster[] = reponses.flatMap(
    (res) => res.clusters
  );

  const branched_by_schedule = branched_clusters.reduce((acc, cluster) => {
    if (cluster.id === "schedule") {
      acc.push(...cluster.items);
    }

    return acc;
  }, [] as API.ClusterItem[]);

  return [...branched_by_schedule];
};

const branchByProfessionalRole = async (
  cluster_items: API.ClusterItem[]
): Promise<API.ClusterItem[]> => {
  const urls = cluster_items.map((item) => item.url);
  const reponses: API.Response[] = await Promise.all(
    urls.map((url) =>
      fetch(url, {
        headers: hh_headers,
      }).then((res) => res.json())
    )
  );

  const branched_clusters: API.Cluster[] = reponses.flatMap(
    (res) => res.clusters
  );

  const branched_by_professional_role = branched_clusters.reduce(
    (acc, cluster) => {
      if (cluster.id === "professional_role") {
        acc.push(...cluster.items);
      }

      return acc;
    },
    [] as API.ClusterItem[]
  );

  return branched_by_professional_role;
};

const branchByIndustry = async (
  cluster_items: API.ClusterItem[]
): Promise<API.ClusterItem[]> => {
  const urls = cluster_items.map((item) => item.url);
  const reponses: API.Response[] = await Promise.all(
    urls.map((url) =>
      fetch(url, {
        headers: hh_headers,
      }).then((res) => res.json())
    )
  );

  const branched_clusters: API.Cluster[] = reponses.flatMap(
    (res) => res.clusters
  );

  const branched_by_industry = branched_clusters.reduce((acc, cluster) => {
    if (cluster.id === "industry") {
      acc.push(...cluster.items);
    }

    return acc;
  }, [] as API.ClusterItem[]);

  return branched_by_industry;
};

/**
 * для разделения (ветвления) крупных кластеров на более чем 2000 элементов на
 * меньшие ветвления с суммарным количеством элементов ниже или равным 2000
 * @param cluster_items - кластеры вакансий
 */
export const branchVacanciesFromDeepCluster = async (
  cluster_items: API.ClusterItem[]
): Promise<API.ParseItem[]> => {
  const urls = cluster_items.map((item) => item.url);

  const clusters: Promise<API.Cluster[]>[] = urls.map((url) =>
    fetch(url, {
      headers: hh_headers,
    })
      .then((res) => res.json() as Promise<API.Response>)
      .then((res) => res.clusters)
  );

  const parse_items = ([] as API.ParseItem[]).concat(
    ...(await Promise.all(clusters)).map((clusters) => {
      const formatted_clusters = formatClusters(clusters);
      const urls: any[] = [];
      if (formatted_clusters.metro !== undefined) {
        formatted_clusters.metro.items.forEach(async (item) => {
          urls.push({
            count: item.count,
            url: item.url,
            name: item.metro_line?.area.name + " " + item.name,
          });
          // if (item.count > 2000) {
          //   const branched_metro_cluster = await branchMetroCluster(item);
          //   console.log("LOL:", branched_metro_cluster.length)
          //   branched_metro_cluster.forEach((station) => {
          //     urls.push({
          //       count: station.count,
          //       url: station.url,
          //       name: station.name,
          //     });
          //   });
          // } else {
          //   console.log("count:", item.count)

          //   urls.push({
          //     count: item.count,
          //     url: item.url,
          //     name: item.metro_line?.area.name + " " + item.name,
          //   });
          // }
        });
      }
      return urls;
    })
  );

  return parse_items;
};

const branchMetroCluster = async (item: API.MetroClusterItem) => {
  const stations = await fetch(item.url, {
    headers: hh_headers,
  })
    .then((res) => res.json() as Promise<API.Response>)
    .then((res) => formatClusters(res.clusters))
    .then((clusters) => clusters.metro?.items ?? []);

  return stations;
};
