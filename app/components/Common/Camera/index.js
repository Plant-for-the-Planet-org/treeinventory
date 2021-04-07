import i18next from 'i18next';
import React, { useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { RNCamera } from 'react-native-camera';
import Header from '../Header';
import { copyImageAndGetData } from '../../../utils/copyToFS';
import PrimaryButton from '../PrimaryButton';
import { Colors } from '_styles';

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
      setImagePath('');
      setBase64Image('');
      return;
    });

    if (data) {
      setBase64Image(data.base64);
      setImagePath(data.uri);
    }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <RNCamera
        captureAudio={false}
        ref={camera}
        style={styles.cameraContainer}
        notAuthorizedView={
          <View>
            <Text>{i18next.t('label.permission_camera_message')}</Text>
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
    paddingHorizontal: 25,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
  },
});
