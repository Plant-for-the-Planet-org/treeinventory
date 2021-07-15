import Realm from 'realm';
import { v4 as uuidv4 } from 'uuid';
import { version } from '../../package.json';
import { bugsnag } from '../utils';
import { LogLevels, LogTypes, TLogLevels, TLogTypes } from '../utils/constants';
import { getSchema } from './default';

interface ILogDataParams {
  id?: string;
  logType: TLogTypes;
  logLevel?: TLogLevels;
  timestamp?: Date;
  message: string;
  appVersion?: string;
  referenceId?: string;
  statusCode?: string;
  logStack?: string;
}

/**
 * This function is used to store the logs in realm DB in ActivityLogs Schema.
 * It writes to realm while creating a log
 * @param {LogLevels} logLevel - use to identify the level of log
 * @param {object} param1 - required properties which is to be stored in db
 * @returns {boolean} - returns a promise with boolean value on whether the operation was successful or not.
 */
const logToDB = (
  logLevel: TLogLevels,
  { referenceId, logType, message, statusCode, logStack }: ILogDataParams,
) => {
  return new Promise((resolve) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          // defines and stores the log data which is to be added in DB
          let logData: ILogDataParams = {
            // uses uuid v4 to create a unique id i.e. primary key
            id: uuidv4(),
            logType,
            logLevel,
            timestamp: new Date(),
            message,
            appVersion: `TM v${version}`,
          };
          // checks if referenceId is present then adds it to logData
          if (referenceId) {
            logData = {
              ...logData,
              referenceId,
            };
          }
          // checks if statusCode is present then adds it to logData
          if (statusCode) {
            logData = {
              ...logData,
              statusCode: statusCode.toString(),
            };
          }
          // checks if logStack is present then adds it to logData
          if (logStack) {
            logData = {
              ...logData,
              logStack,
            };
          }
          // create log in ActivityLogs using logData which is passed
          realm.create('ActivityLogs', logData);
        });
        resolve(true);
      })
      .catch((err) => {
        console.error('Error while creating log', err);
        bugsnag.notify(err);
        resolve(false);
      });
  });
};

// defines different types of log levels in object dbLog
const dbLog = {
  info: (data: ILogDataParams) => logToDB(LogLevels.INFO, data),
  warn: (data: ILogDataParams) => logToDB(LogLevels.WARN, data),
  error: (data: ILogDataParams) => logToDB(LogLevels.ERROR, data),
};

/**
 * This function is used to retrieve all logs or error logs from database, depending upon the parameter
 * @param {string} type
 * @returns {any} allLogs/errorLogs
 */
export const getLogs = (type: 'all' | 'error') => {
  return new Promise((resolve) => {
    Realm.open(getSchema())
      .then((realm) => {
        if (type === 'all') {
          let logs = realm.objects('ActivityLogs');
          let allLogs = logs.filtered('TRUEPREDICATE SORT (timestamp DESC)');
          resolve(allLogs);
        } else if (type === 'error') {
          const allLogs = realm.objects('ActivityLogs');
          let errorLogs = allLogs
            .filtered('logLevel = "ERROR"')
            .filtered('TRUEPREDICATE SORT (timestamp DESC)');
          resolve(errorLogs);
        }
      })
      .catch((err) => {
        console.error(`Error while fetching logs of type ${type}`, err);
        bugsnag.notify(err);
        resolve(false);
      });
  });
};

//Deleting older logs
export const deleteOldLogs = () => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          let logs = realm.objects('ActivityLogs');
          const currentDate: any = new Date();
          // Milliseconds in one day
          const oneDay = 1000 * 60 * 60 * 24;

          // calculates the old date for n days
          let oldDate: any = currentDate - oneDay * 14;

          oldDate = new Date(oldDate);

          // sets the date hours, mins, seconds and nanoseconds to zero
          oldDate.setUTCHours(0, 0, 0, 0);

          // converts to ISO string and removes the Z characters from last
          oldDate = oldDate.toISOString().slice(0, -1);

          // filters and stores all the logs before 14 days
          let deleteLogs = logs.filtered(`timestamp < ${oldDate}`);

          // deletes the filtered logs from DB
          realm.delete(deleteLogs);
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.OTHER,
            message: 'Deleted older logs',
          });
          resolve(true);
        });
      })
      .catch((err) => {
        // logs the error
        console.error(`Error at repositories/logs/deleteOldLogs, ${err}`);
        // logs the error of the failed request in DB
        dbLog.error({
          logType: LogTypes.OTHER,
          message: 'Failed to delete older logs',
          logStack: JSON.stringify(err),
        });
        reject(err);
      });
  });
};

// export to access the logging object
export default dbLog;
