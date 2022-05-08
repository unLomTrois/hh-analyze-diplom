import {MigrationInterface, QueryRunner} from "typeorm";

export class dropUselessFieldss1651858509684 implements MigrationInterface {
    name = 'dropUselessFieldss1651858509684'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vacancy" DROP COLUMN "response_url"`);
        await queryRunner.query(`ALTER TABLE "vacancy" DROP COLUMN "archived"`);
        await queryRunner.query(`ALTER TABLE "vacancy" DROP COLUMN "working_days"`);
        await queryRunner.query(`ALTER TABLE "vacancy" DROP COLUMN "working_time_intervals"`);
        await queryRunner.query(`ALTER TABLE "vacancy" DROP COLUMN "working_time_modes"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vacancy" ADD "working_time_modes" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vacancy" ADD "working_time_intervals" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vacancy" ADD "working_days" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vacancy" ADD "archived" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vacancy" ADD "response_url" character varying`);
    }

}
