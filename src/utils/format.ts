import { URL } from "url";
import { API } from "../types/api/module";

/**
 * создаёт коренной запрос, от которого ветвятся остальные
 * @param  {API.Query} raw_query
 */
export const buildRootURL = (raw_query: API.Query) => {
  const query = queryToString({ ...raw_query, per_page: 0, page: 0 });

  return "https://api.hh.ru/vacancies?" + query;
};

export const formatClusters = (
  clusters: API.Cluster[],
  found?: number
): API.FormattedClusters => {
  return { ...convertArrayToObject(clusters, "id"), found };
};

const queryToString = (query: API.Query): string => {
  const query_list: string[] = [];

  // объединить пары ключей и значений интерфейса знаком '='
  Object.entries(query).forEach(([key, value]) => {
    query_list.push([key, value].join("="));
  });

  // объединить эти пары пар знаком '&'
  return query_list.join("&");
};

const convertArrayToObject = (array: any[], key: string) => {
  const initialValue = {};
  return array.reduce((obj, item) => {
    return {
      ...obj,
      [item[key]]: item,
    };
  }, initialValue);
};

export const paginateLink = (link: string, pages: number): string[] => {
  const url = new URL(link);

  url.searchParams.set("page", "0");

  const prepared_url = url
    .toString()
    .replace("clusters=true", "clusters=false")
    .replace(/per_page=(\d+)?/, "per_page=100");

  const urls: string[] = Array.from(
    Array(pages).fill(prepared_url),
    (url: string, page: number) => url.replace(/&page=(\d+)?/, `&page=${page}`)
  );

  return urls;
};

export const paginateClusters = (parse_items: API.ParseItem[]): string[] => {
  const urls = parse_items.flatMap((item) => {
    const pages: number = Math.ceil(item.count / 100);
    return paginateLink(item.url, pages);
  });

  return urls;
};
