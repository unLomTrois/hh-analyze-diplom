import { MigrationInterface, QueryRunner } from "typeorm";

export class dropType1647119161264 implements MigrationInterface {
  name = "dropType1647119161264";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vacancy" DROP COLUMN "type"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vacancy" ADD "type" jsonb`);
  }
}
