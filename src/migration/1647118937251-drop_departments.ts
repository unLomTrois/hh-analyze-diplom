import {MigrationInterface, QueryRunner} from "typeorm";

export class dropDepartments1647118937251 implements MigrationInterface {
    name = 'dropDepartments1647118937251'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vacancy" DROP COLUMN "department"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vacancy" ADD "department" jsonb`);
    }

}
