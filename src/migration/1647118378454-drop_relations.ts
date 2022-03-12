import { MigrationInterface, QueryRunner } from "typeorm";

export class dropRelations1647118378454 implements MigrationInterface {
  name = "dropRelations1647118378454";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vacancy" DROP COLUMN "relations"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vacancy" ADD "relations" text NOT NULL`
    );
  }
}
