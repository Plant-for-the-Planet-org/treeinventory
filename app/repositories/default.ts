import Realm from 'realm';
import { bugsnag } from '../utils';
import schema0 from './migrations/schema0';
import schema1 from './migrations/schema1';
import schema2 from './migrations/schema2';
import schema3 from './migrations/schema3';
import schema4 from './migrations/schema4';
import schema5 from './migrations/schema5';
import schema6 from './migrations/schema6';
import schema7 from './migrations/schema7';
import schema8 from './migrations/schema8';
import schema9 from './migrations/schema9';
import schema10 from './migrations/schema10';
import schema11 from './migrations/schema11';

export const schemas = [
  schema0,
  schema1,
  schema2,
  schema3,
  schema4,
  schema5,
  schema6,
  schema7,
  schema8,
  schema9,
  schema10,
  schema11,
];

export const getSchema = () => schemas[schemas.length - 1];

export function migrateRealm() {
  return new Promise<void>((resolve, reject) => {
    try {
      // The first schema to update to is the current schema version
      // since the first schema in our array is at nextSchemaIndex
      let nextSchemaIndex = Realm.schemaVersion(Realm.defaultPath);

      // If Realm.schemaVersion() returned -1, it means this is a new Realm file
      // so no migration is needed.
      if (nextSchemaIndex !== -1 && nextSchemaIndex < schemas.length - 1) {
        // This will help to migrate the schema sequentially starting from the
        // current schema version of the user to the latest one. This will help to
        // avoid rewriting any old migrations code to match with new one, if the user
        // missed any update.
        while (nextSchemaIndex < schemas.length) {
          const migratedRealm = new Realm(schemas[nextSchemaIndex++]);
          migratedRealm.close();
        }
      }
      resolve();
    } catch (err) {
      console.error(`Error while setting up realm connection, ${JSON.stringify(err)}`);
      bugsnag.notify(err);
      reject(err);
    }
  });
}
