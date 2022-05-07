import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { API } from "../types/api/module";

@Entity()
export class Vacancy {
  @PrimaryColumn()
  id: string;

  @Column()
  premium: boolean;

  @Column()
  has_test: boolean;

  @Column("jsonb", { nullable: true })
  address: {
    city: string | null;
    street: string | null;
    building: string | null;
    description: string | null;
    lat: number | null;
    lng: number | null;
    metro_stations: API.MetroStation[];
  } | null;

  @Column()
  apply_alternate_url: string;

  @Column("jsonb", { nullable: true })
  salary: {
    from: number | null;
    to: number | null;
    currency: string;
    gross: boolean;
  };

  @Column()
  name: string;

  @Column("jsonb", { nullable: true })
  insider_interview: {
    id: string;
    url: string;
  };

  @Column("jsonb", { nullable: true })
  area: {
    url: string;
    id: string;
    name: string;
  };

  @Column()
  url: string;

  @Column("timestamptz")
  published_at: string;

  @Column("jsonb", { nullable: true })
  employer: {
    url: string;
    alternate_url: string;
    logo_urls: any;
    name: string;
    id: string;
  };

  @Column()
  response_letter_required: boolean;

  @Column()
  accept_temporary: boolean;
}
