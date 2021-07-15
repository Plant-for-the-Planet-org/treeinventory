import NetInfo from '@react-native-community/netinfo';
import dbLog from '../repositories/logs';
import { LogTypes } from './constants';

export const isInternetConnected = async (): Promise<boolean> => {
  let networkConnection: boolean | null;
  try {
    let state = await NetInfo.fetch();
    networkConnection = state.isConnected && state.isInternetReachable;
  } catch (err: any) {
    networkConnection = false;
    dbLog.error({
      logType: LogTypes.OTHER,
      message: `Failed to check the internet connection status`,
      logStack: JSON.stringify(err),
    });
  }

  return !!networkConnection;
};
