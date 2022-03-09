import { partition } from "lodash-es";
import fetch from "node-fetch";
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
  console.log("парсинг сокращённых вакансий");
  return await getURLsFromClusters(clusters);
};

export const getURLsFromClusters = async (clusters: API.FormattedClusters) => {
  const [small_area_clusters, big_area_clusters] = partition(
    clusters?.area?.items ?? clusters.metro?.items,
    (cluster) => cluster.count <= 2000
  );

  const branched_big_cluster = await branchVacanciesFromDeepCluster(
    big_area_clusters
  );

  const paginated_urls_from_big_clusters =
    paginateClusters(branched_big_cluster);

  const paginated_urls_from_small_clusters =
    paginateClusters(small_area_clusters);

  return [
    ...paginated_urls_from_big_clusters,
    ...paginated_urls_from_small_clusters,
  ];
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
