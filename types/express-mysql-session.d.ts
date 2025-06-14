declare module "express-mysql-session" {
  import { Store } from "express-session";
  import { Pool } from "mysql2/promise";

  interface MySQLStoreOptions {
    expiration?: number;
    createDatabaseTable?: boolean;
    schema?: {
      tableName?: string;
      columnNames?: {
        session_id?: string;
        expires?: string;
        data?: string;
      };
    };
  }

  function connectMySQL(session: any): {
    new (options: MySQLStoreOptions, connection: Pool): Store;
  };

  export default connectMySQL;
}
