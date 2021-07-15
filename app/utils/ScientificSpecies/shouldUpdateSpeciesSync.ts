import AsyncStorage from '@react-native-community/async-storage';
import dbLog from '../../repositories/logs';
import { LogTypes } from '../constants';

// Checks if the gap between current date and the last species updated date is greater than 90 then returns true else returns false
const shouldUpdateSpeciesSync = async (): Promise<boolean> => {
  const currentDate = new Date().toISOString().split('T')[0];
  const previousUpdatedSyncDate = await getSpeciesSyncUpdateDate();
  console.log('previousUpdatedSyncDate', previousUpdatedSyncDate);

  if (!previousUpdatedSyncDate) {
    setSpeciesSyncUpdateDate(currentDate);
  } else {
    let differenceNoOfDays: any =
      new Date(currentDate).getTime() - new Date(previousUpdatedSyncDate).getTime();

    differenceNoOfDays = differenceNoOfDays * (1000 * 60 * 60 * 24);

    if (differenceNoOfDays > 90) {
      return true;
    }
  }
  return false;
};

//to retrieve the lastUpdatedSpeciesSyncDate from AsyncStorage
const getSpeciesSyncUpdateDate = async () => {
  try {
    return await AsyncStorage.getItem('lastUpdatedSpeciesSyncDate');
  } catch (err) {
    dbLog.error({
      logType: LogTypes.OTHER,
      message: 'Error while getting updated species sync date from AsyncStorage',
      logStack: JSON.stringify(err),
    });
    return false;
  }
};

//to set the lastUpdatedSpeciesSyncDate in the AsyncStorage
export const setSpeciesSyncUpdateDate = async (date: string) => {
  try {
    await AsyncStorage.setItem('lastUpdatedSpeciesSyncDate', `${date}`);
  } catch (err) {
    dbLog.error({
      logType: LogTypes.OTHER,
      message: 'Error while updating log date in AsyncStorage',
      logStack: JSON.stringify(err),
    });
  }
};

export default shouldUpdateSpeciesSync;
