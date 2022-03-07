export namespace API {
  type schedule = "fullDay" | "shift" | "flexible" | "remote" | "flyInFlyOut";

  type experience =
    | "noExperience"
    | "between1And3"
    | "between3And6"
    | "moreThan6";

  type employment = "full" | "part" | "project" | "volunteer" | "probation";

  type currency =
    | "AZN"
    | "BYR"
    | "EUR"
    | "GEL"
    | "KGS"
    | "KZT"
    | "RUR"
    | "UAH"
    | "USD"
    | "UZS";

  type order_by =
    | "publication_time"
    | "salary_desc"
    | "salary_asc"
    | "relevance"
    | "distance";

  type search_field = "name" | "company_name" | "description";

  export interface Query {
    no_magic?: boolean;
    area?: 113 | number;
    text?: string;
    schedule?: schedule;
    per_page?: number;
    page?: number;
    specialization?: string;
    experience?: experience;
    describe_arguments?: boolean;
    employment?: employment;
    industry?: string;
    salary?: number;
    currency?: currency;
    order_by?: order_by;
    search_field?: search_field;
    clusters?: boolean;
    only_with_salary?: boolean;
  }

  /// URL

  type baseURL = "https://api.hh.ru";

  type method = "/vacancies";

  export interface URL {
    baseURL: baseURL;
    method: method;
    query: Query;
  }

  /// ALIASES

  export interface Response {
    items: Vacancy[];
    per_page: number;
    page: number;
    pages: number;
    found: number;
    clusters: Cluster[];
    arguments: any | null;
    alternate_url: string;
  }

  export interface Vacancy {
    id: string;
    premium: boolean;
    has_test: boolean;
    response_url: string | null;
    address: any | null;
    alternate_url: string;
    apply_alternate_url: string;
    department: {
      id: string;
      name: string;
    };
    salary: {
      from: number | null;
      to: number | null;
      currency: string;
      gross: boolean;
    };
    name: string;
    insider_interview: {
      id: string;
      url: string;
    };
    area: {
      url: string;
      id: string;
      name: string;
    };
    url: string;
    published_at: string;
    relations: any[];
    employer: {
      url: string;
      alternate_url: string;
      logo_urls: any;
      name: string;
      id: string;
    };
    response_letter_required: string;
    type: {
      id: string;
      name: string;
    };
    archived: string;
    working_days: any[];
    working_time_intervals: any[];
    working_time_modes: any[];
    accept_temporary: boolean;
  }

  export interface DriverLicenseType {
    id: string;
  }

  export interface KeySkill {
    name: string;
  }

  export interface Specialization {
    id: string;
    name: string;
    profarea_id: string;
    profarea_name: string;
  }

  export interface FullVacancy {
    id: string;
    description: string;
    branded_description?: string;
    key_skills: KeySkill[];
    schedule: {
      id: string;
      name: string;
    };
    accept_handicapped: boolean;
    accept_kids: boolean;
    experience: {
      id: string;
      name: string;
    };
    address?: any;
    alternate_url: string;
    url: string;
    apply_alternate_url: string;
    code?: string;
    department?: {
      id: string;
      name: string;
    };
    employment?: {
      id: string;
      name: string;
    };
    salary?: {
      from?: number;
      to?: number;
      gross?: boolean;
    };
    archived: boolean;
    name: string;
    insider_interview?: any;
    area: {
      id: string;
      name: string;
      url: string;
    };
    created_at: string;
    published_at: string;
    employer?: {
      blacklisted: boolean;
    };
    response_letter_required: boolean;
    type: {
      id: string;
      name: string;
    };
    has_test: boolean;
    response_url: string;
    test?: {
      required: boolean;
    };
    specialization: Specialization[];
    contacts?: any;
    billing_type: {
      id: string;
      name: string;
    };
    allow_messages: boolean;
    premium: boolean;
    driver_license_types: DriverLicenseType[];
    accept_incomplete_resumes: boolean;
    working_days?: {
      id: string;
      name: string;
    };
    working_time_intervals?: {
      id: string;
      name: string;
    };
    working_time_modes?: {
      id: string;
      name: string;
    };
    accept_temporary: boolean;
  }

  export interface PreparedVacancy {
    key_skills: KeySkill[];
    has_test: boolean;
    test?: {
      required: boolean;
    };
    salary?: {
      from?: number;
      to?: number;
      gross?: boolean;
    };
    response_letter_required: boolean;
    accept_incomplete_resumes: boolean;
    accept_temporary: boolean;
  }

  export interface FormattedClusters {
    found?: number;
    metro?: MetroCluster;
    area: Cluster;
    salary: Cluster;
    sub_industry: Cluster;
    industry: Cluster;
    experience: Cluster;
    employment: Cluster;
    schedule: Cluster;
    label: Cluster;
  }

  export interface Cluster {
    name: string;
    id: string;
    items: ClusterItem[];
  }

  /**
   * Минимальный элемент парсинга, предоставляет информацию о ссылке и количестве вакансий по ней
   */
  export interface ParseItem {
    count: number;
    url: string;
    name: string;
  }
  export interface ClusterItem extends ParseItem {
    type?: string;
  }

  export interface MetroCluster extends Cluster {
    items: MetroClusterItem[];
  }

  export interface MetroClusterItem extends ClusterItem {
    type: "metro_line" | "metro_station";
    metro_line?: {
      id: string;
      hex_color: string;
      area: Area;
    };
    metro_station?: {
      id: string;
      hex_color: string;
      area: Area;
      lat: number;
      lng: number;
      order: number;
    };
  }

  export interface Area {
    id: 1;
    name: string;
    url: string;
  }

  interface SuggestAreaItem {
    id: string;
    text: string;
    url: string;
  }

  interface SuggestAreasResponse {
    items: SuggestAreaItem[];
  }

  export type PreparedClusters = any;

  // IO

  export interface Request {
    text: string;
    area: number;
    limit: number;
    cluster: boolean;
  }

  /// Not used
  // export interface Response {
  //   name: string;
  //   snippet: Snippet;
  // }

  export interface Snippet {
    requirement: string | undefined | null;
    responsibility: string | undefined | null;
  }
}
