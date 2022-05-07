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

export const getURLs = async (
  url: string,
  found: number,
  clusters: API.FormattedClusters
) => {
  if (found <= 2000) {
    const pages: number = Math.ceil(found / 100);

    return paginateLink(url, pages);
  }

  ora().info("парсинг кластеров...");
  return await getURLsFromClusters(clusters);
};

export const getURLsFromClusters = async (
  clusters: API.FormattedClusters
): Promise<string[]> => {
  // если нет кластера "area", то поиск ведётся по конкретному региону, значит делить по регионам уже не нужно
  if (clusters.area === undefined) {
    return paginateClusters(await deepBranch(clusters.employment.items));
  }

  // поделить кластера по регионам, где больше 2000 и где меньше
  const final_items: API.ClusterItem[] = [];
  let [less_2000_clusters, more_2000_clusters] = partition(
    clusters.area.items,
    (cluster_item) => cluster_item.count <= 2000
  );
  final_items.push(...less_2000_clusters);
  console.log(
    "Со всей России, где меньше 2000 вакансий",
    final_items.reduce((acc, cur) => {
      return (acc += cur.count);
    }, 0)
  );

  // const branched = more_2000_clusters.map(async(cluster) => {
  //   return deepBranch(cluster)
  // })
  const branched1 = await deepBranch([more_2000_clusters[0]]);
  const branched2 = await deepBranch([more_2000_clusters[1]]);
  const branched3 = await deepBranch([more_2000_clusters[2]]);
  final_items.push(...branched1);
  final_items.push(...branched2);
  final_items.push(...branched3);

  const final_count = final_items.reduce((acc, cur) => {
    return (acc += cur.count);
  }, 0);
  console.log(clusters.found, final_count, clusters.found - final_count);

  return paginateClusters(final_items);
};

const getcounts = (items: API.ClusterItem[]): number => {
  const counts = items.map((item) => item.count);
  const count = counts.reduce((acc, c) => acc + c, 0);
  // console.log("count: ", count);
  return count;
};

const deepBranch = async (cluster_items: API.ClusterItem[]) => {
  ora().info("начало ветвления...");

  const final_items: API.ClusterItem[] = [];

  let [less_2000_clusters, more_2000_clusters] = [[], []];

  await oraPromise(async () => {
    const branched_by_employment = await branchByEmployment(cluster_items);
    [less_2000_clusters, more_2000_clusters] = partition(
      branched_by_employment,
      (cluster_item) => cluster_item.count <= 2000
    );
    final_items.push(...less_2000_clusters);
  }, "ветвление по типу занятости...");

  await oraPromise(async () => {
    const branched_by_schedule = await branchBySchedule(more_2000_clusters);
    [less_2000_clusters, more_2000_clusters] = partition(
      branched_by_schedule,
      (cluster_item) => cluster_item.count <= 2000
    );
    final_items.push(...less_2000_clusters);
  }, "ветвление графику работы...");

  await oraPromise(async () => {
    const branched_by_professional_role = await branchByProfessionalRole(
      more_2000_clusters
    );
    [less_2000_clusters, more_2000_clusters] = partition(
      branched_by_professional_role,
      (cluster_item) => cluster_item.count <= 2000
    );
    final_items.push(...less_2000_clusters);
  }, "ветвление по проф.роли...");

  await oraPromise(async () => {
    const branched_by_industry = await branchByIndustry(more_2000_clusters);
    [less_2000_clusters, more_2000_clusters] = partition(
      branched_by_industry,
      (cluster_item) => cluster_item.count <= 2000
    );
    final_items.push(...less_2000_clusters);
  }, "ветвление по отрасли компаний...");

  return final_items;
};

const branchByEmployment = async (
  cluster_items: API.ClusterItem[]
): Promise<API.ClusterItem[]> => {
  const [less_2000_clusters, more_2000_clusters] = partition(
    cluster_items,
    (cluster_item) => cluster_item.count <= 2000
  );

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
