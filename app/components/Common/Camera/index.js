import i18next from 'i18next';
import React, { useRef, useState } from 'react';
import {
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ImageBackground,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import { Colors, Typography } from '_styles';
import dbLog from '../../../repositories/logs';
import { LogTypes } from '../../../utils/constants';
import { copyImageAndGetData } from '../../../utils/FSInteration';
import Header from '../Header';
import PrimaryButton from '../PrimaryButton';

export default function Camera({ handleCamera }) {
  const camera = useRef();
  const [imagePath, setImagePath] = useState('');
  const [base64Image, setBase64Image] = useState('');

  const onPressContinue = async () => {
    const fsurl = await copyImageAndGetData(imagePath);
    handleCamera({ uri: imagePath, fsurl, base64Image });
  };

  const onPressCamera = async () => {
    if (imagePath) {
      setImagePath('');
      setBase64Image('');
      return;
    }
    const options = { base64: true };
    const data = await camera.current.takePictureAsync(options).catch((err) => {
      alert(i18next.t('label.permission_camera_message'));
      dbLog.error({
        logType: LogTypes.OTHER,
        message: `Failed to take picture ${err}`,
        logStack: JSON.stringify(err),
      });
      setImagePath('');
      setBase64Image('');
      return;
    });

    if (data) {
      setBase64Image(data.base64);
      setImagePath(data.uri);
    }
  };

  const onClickOpenSettings = async () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      {imagePath ? (
        <ImageBackground source={{ uri: imagePath }} style={styles.cameraContainer}>
          <Header whiteBackIcon />
          <View style={[styles.bottomBtnsContainer, { justifyContent: 'space-between' }]}>
            <PrimaryButton
              onPress={onPressCamera}
              btnText={
                imagePath ? i18next.t('label.image_retake') : i18next.t('label.image_click_picture')
              }
              theme={imagePath ? 'white' : null}
              halfWidth={imagePath}
            />
            {imagePath ? (
              <PrimaryButton
                disabled={imagePath ? false : true}
                onPress={onPressContinue}
                btnText={i18next.t('label.continue')}
                halfWidth={true}
              />
            ) : (
              []
            )}
          </View>
        </ImageBackground>
      ) : (
        <RNCamera
          captureAudio={false}
          ref={camera}
          style={styles.cameraContainer}
          notAuthorizedView={
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.message}>{i18next.t('label.permission_camera_message')}</Text>
              {Platform.OS === 'ios' ? (
                <Text style={styles.message} onPress={onClickOpenSettings}>
                  {i18next.t('label.open_settings')}
                </Text>
              ) : (
                []
              )}
            </View>
          }
          androidCameraPermissionOptions={{
            title: i18next.t('label.permission_camera_title'),
            message: i18next.t('label.permission_camera_message'),
            buttonPositive: i18next.t('label.permission_camera_ok'),
            buttonNegative: i18next.t('label.permission_camera_cancel'),
          }}>
          <Header whiteBackIcon />
          <View style={[styles.bottomBtnsContainer, { justifyContent: 'space-between' }]}>
            <PrimaryButton
              onPress={onPressCamera}
              btnText={
                imagePath ? i18next.t('label.image_retake') : i18next.t('label.image_click_picture')
              }
              theme={imagePath ? 'white' : null}
              halfWidth={imagePath}
            />
            {imagePath ? (
              <PrimaryButton
                disabled={imagePath ? false : true}
                onPress={onPressContinue}
                btnText={i18next.t('label.continue')}
                halfWidth={true}
              />
            ) : (
              []
            )}
          </View>
        </RNCamera>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  btnAlignment: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  bottomBtnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
    paddingHorizontal: 25,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  message: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    lineHeight: Typography.LINE_HEIGHT_30,
    textAlign: 'center',
    padding: 20,
  },
});
