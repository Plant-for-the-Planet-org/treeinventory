import AsyncStorage from '@react-native-community/async-storage';
import dbLog, { deleteOldLogs } from '../repositories/logs';
import { LogTypes } from './constants';

// This function checks everyday if there are any older logs stored in the db which needs to be deleted
export const dailyLogUpdateCheck = async () => {
  const currentDate = new Date().toLocaleDateString();
  const previousUpdatedLogDate = await getLogUpdateDate();

  if (!previousUpdatedLogDate) {
    setUpdatedLogDate(currentDate);
  } else if (previousUpdatedLogDate !== currentDate) {
    deleteOldLogs().then(() => setUpdatedLogDate(currentDate));
  }
};

//to retrieve the updatedLogDate from AsyncStorage
const getLogUpdateDate = async () => {
  try {
    return await AsyncStorage.getItem('updatedLogDate');
  } catch (err) {
    dbLog.error({
      logType: LogTypes.OTHER,
      message: 'Error while getting updated log date from AsyncStorage',
      logStack: JSON.stringify(err),
    });
    // error reading value
    console.error(`Error at /utils/logs/getLogUpdateDate, ${JSON.stringify(err)}`);
    return false;
  }
};

//to set the updatedLogDate in the AsyncStorage
const setUpdatedLogDate = async (date: string) => {
  try {
    await AsyncStorage.setItem('updatedLogDate', `${date}`);
  } catch (err) {
    dbLog.error({
      logType: LogTypes.OTHER,
      message: 'Error while updating log date in AsyncStorage',
      logStack: JSON.stringify(err),
    });
    // error saving storing updateLogDate to AsyncStorage
    console.error(`Error at /utils/logs/setUpdatedLogDate, ${JSON.stringify(err)}`);
  }
};
