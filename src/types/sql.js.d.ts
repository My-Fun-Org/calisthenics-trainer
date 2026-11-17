declare module "sql.js" {
  export interface SqlValue {
    [key: string]: string | number | Uint8Array | null;
  }

  export interface Statement {
    step(): boolean;
    getAsObject(): Record<string, string | number | Uint8Array | null>;
    free(): boolean;
  }

  export interface Database {
    run(sql: string, params?: readonly (string | number | null)[]): Database;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | null) => Database;
  }

  export interface InitSqlJsConfig {
    locateFile?: (file: string) => string;
    wasmBinary?: ArrayBuffer | Uint8Array;
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
}
