import { Spinner } from "cli-spinner";
import { chunk, partition } from "lodash-es";
import fetch from "node-fetch";
import { API } from "../types/api/module";
import { fetchCache, formatClusters, paginateClusters } from "../utils";

const hh_headers = {
  "User-Agent": "labor-market-analyzer (vadim.kuz02@gmail.com)",
};

export const getVacanciesInfo = async (url: string): Promise<API.Response> => {
  const data: API.Response = await fetch(
    url.match(/[_\.!~*'()-]/) && url.match(/%[0-9a-f]{2}/i)
      ? url
      : encodeURI(url),
    {
      headers: hh_headers,
    }
  ).then((res) => res.json());

  return data;
};

export const getVacancies = async (urls: string[]) => {
  const chunk_size = 50;
  const chunked_urls = chunk(urls, chunk_size);

  console.log("количество чанков:", chunked_urls.length);
  console.log("размер чанка:", chunk_size);

  const vacancies: API.Vacancy[] = [];

  const spinner = new Spinner("подготовка... %s");
  spinner.setSpinnerString("|/-\\");
  spinner.start();

  let i = 1;
  for (const chunk of chunked_urls) {
    spinner.setSpinnerTitle(`${i}/${chunked_urls.length} %s`);
    vacancies.push(...(await getVacanciesFromURLs(chunk)));
    i++;
  }
  console.log("");
  spinner.stop();

  return vacancies;
};

export const getFullVacancies = async (
  urls: string[]
): Promise<API.FullVacancy[]> => {
  const chunked_urls = chunk(urls, 100);
  const full_vacancies: API.FullVacancy[] = [];

  console.log("количество чанков:", chunked_urls.length);

  let i = 1;
  for (const chunk of chunked_urls) {
    process.stdout.write(`${i}/${chunked_urls.length}\r`);
    i++;
    full_vacancies.push(...(await getFullVacanciesFromURLs(chunk)));
  }
  console.log("");

  return full_vacancies;
};

export const getURLsFromClusters = async (clusters: API.FormattedClusters) => {  
  const [small_area_clusters, big_area_clusters] = partition(
    clusters?.area?.items ?? clusters.metro?.items,
    (cluster) => cluster.count <= 2000
  );

  const branched_big_cluster = await branchVacanciesFromDeepCluster(
    big_area_clusters
  );

  const paginated_urls_from_big_clusters = paginateClusters(
    branched_big_cluster
  );

  const paginated_urls_from_small_clusters = paginateClusters(
    small_area_clusters
  );

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

export const getVacanciesFromURLs = async (
  urls: string[]
): Promise<API.Vacancy[]> => {
  const data: Promise<API.Response>[] = urls.map((url) =>
    fetch(url, {
      headers: hh_headers,
    }).then((res) => res.json())
  );

  // дождаться резолва промисов, получить их поля items
  const vacancies: API.Vacancy[] = ([] as API.Vacancy[]).concat(
    ...(await Promise.all(data)).map((page) => {
      return page.items;
    })
  );

  return vacancies;
};

export const getFullVacanciesFromURLs = async (
  urls: string[]
): Promise<API.FullVacancy[]> => {
  const data: Promise<API.FullVacancy>[] = urls.map((url) =>
    fetchCache(url, { headers: hh_headers })
  );

  const full_vacancies: API.FullVacancy[] = await Promise.all(data);

  return full_vacancies;
};
