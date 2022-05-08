import { API } from "../types/api/module";

/**
 * подсчитывает итогое количество вакансий, которые можно собрать с массива кластеров
 * @param items массив кластеров
 * @returns количество вакансий
 */
export const getcounts = (items: API.ClusterItem[]): number => {
  const counts = items.map((item) => item.count);
  const count = counts.reduce((acc, c) => acc + c, 0);
  // console.log("count: ", count);
  return count;
};
