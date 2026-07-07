import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { SnakeNamingStrategy } from './snake-naming.strategy';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
});
