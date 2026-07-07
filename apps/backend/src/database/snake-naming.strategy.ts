import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

function snake(str: string): string {
  return str.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`).replace(/^_/, '');
}

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    const prefix = embeddedPrefixes.map(snake).join('_');
    return prefix ? `${prefix}_${customName ?? snake(propertyName)}` : (customName ?? snake(propertyName));
  }

  relationName(propertyName: string): string {
    return snake(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snake(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(firstTable: string, secondTable: string): string {
    return snake(`${firstTable}_${secondTable}`);
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snake(`${tableName}_${columnName ?? propertyName}`);
  }
}
