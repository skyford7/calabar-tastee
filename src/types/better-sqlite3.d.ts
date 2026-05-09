declare module "better-sqlite3" {
  class Database {
    constructor(filename: string, options?: { verbose?: (...args: any[]) => void });
    pragma(source: string, options?: any): any;
    prepare(sql: string): Statement;
    exec(sql: string): this;
    close(): void;
    transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T;
  }
  class Statement {
    run(...params: any[]): { lastInsertRowid: number | bigint; changes: number };
    get(...params: any[]): any;
    all(...params: any[]): any[];
  }
  export default Database;
}
