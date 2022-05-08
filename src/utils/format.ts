import { URL } from "url";
import { API } from "../types/api/module";

/**
 * создаёт коренной запрос, от которого ветвятся остальные
 * @param {API.Query} raw_query объект запроса
 * @returns {string}
 */
export const buildRootURL = (raw_query: API.Query): string => {
  const query = queryToString({ ...raw_query, per_page: 0, page: 0 });

  return "https://api.hh.ru/vacancies?" + query;
};

/**
 * преобразует итерируемый объект запроса в строку URL параметров, для дальнейшего использования в URL запроса
 * @param {API.Query} query объект запроса
 * @returns {string} строка параметров вида "key1=value1&key2=value2..."
 */
const queryToString = (query: API.Query): string => {
  const query_list: string[] = [];

  // объединить пары ключей и значений интерфейса знаком '='
  Object.entries(query).forEach(([key, value]) => {
    query_list.push([key, value].join("="));
  });

  // объединить эти пары пар знаком '&'
  return query_list.join("&");
};

/**
 * формитирует массив кластеров в единый итерируемый объект, где на каждый кластер имеются ключи по названию кластера
 * @param clusters массив кластеров
 * @param found количество всего найденных вакансий по коренному запросу
 * @returns формиатированный кластер
 */
export const formatClusters = (
  clusters: API.Cluster[],
  found?: number
): API.FormattedClusters => {
  console.log(clusters)

  return { ...convertArrayToObject(clusters, "id"), found };
};


/**
 * конвертирует массив рода [{key: value1, ...}, {key: value2, ...}] в объект рода {value1: {...}, value2: {...}}
 *
 * @param {any[]} array массив рода [{key: value1, ...}, {key: value2, ...}]
 * @param {string} key ключ, по значению которого выставляются ключи
 * @returns {*} объект рода {value1: {...}, value2: {...}}
 */
const convertArrayToObject = (array: any[], key: string): any => {
  const initialValue = {};
  return array.reduce((obj, item) => {
    return {
      ...obj,
      [item[key]]: item,
    };
  }, initialValue);
};


/**
 * пагинирует, разбивает ссылку по количеству страниц на массив ссылок с параметром page от 1 до pages
 *
 * @param {string} link ссылка
 * @param {number} pages количество страниц
 * @returns {string[]} массив пагинированных ссылок с параметром page
 */
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


/**
 * пагинирует кластера, то же самое, что и paginateLink, но на вход получает массив кластеров
 *
 * @param {API.ParseItem[]} parse_items массив кластеров с полем url
 * @returns {string[]} массив пагинированных ссылок с параметром page
 */
export const paginateClusters = (parse_items: API.ParseItem[]): string[] => {
  const urls = parse_items.flatMap((item) => {
    const pages: number = Math.ceil(item.count / 100);
    return paginateLink(item.url, pages);
  });

  return urls;
};
