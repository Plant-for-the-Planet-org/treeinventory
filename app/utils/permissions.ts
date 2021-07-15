import i18next from 'i18next';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { bugsnag } from '.';

const IS_ANDROID = Platform.OS === 'android';

export const permission = () => {
  return new Promise((resolve, reject) => {
    if (IS_ANDROID) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        .then((granted) => {
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            resolve('granted');
          } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            reject(new Error('blocked'));
          } else {
            reject(new Error('denied'));
          }
        })
        .catch((err) => console.warn(err));
    } else {
      Geolocation.requestAuthorization('whenInUse').then((permissionStatus) => {
        if (permissionStatus === 'granted') {
          resolve(true);
        } else {
          reject(new Error('blocked'));
        }
      });
    }
  });
};

export const askExternalStoragePermission = async () => {
  try {
    if (!IS_ANDROID) {
      return true;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: i18next.t('label.storage_permission_android_title'),
        message: i18next.t('label.storage_permission_android_message'),
        buttonPositive: i18next.t('label.permission_camera_ok'),
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    } else {
      Alert.alert(
        i18next.t('label.storage_permission_denied_header'),
        i18next.t('label.storage_permission_denied_sub_header'),
      );
      return false;
    }
  } catch (err) {
    bugsnag.notify(err);
    return false;
  }
};
