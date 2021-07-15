import i18next from 'i18next';
import React, { useContext, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import Share from 'react-native-share';
import { SvgXml } from 'react-native-svg';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import { importIcon } from '../../assets';
import { AdditionalDataContext } from '../../reducers/additionalData';
import dbLog from '../../repositories/logs';
import { Colors, Typography } from '../../styles';
import { readJsonFileAndAddAdditionalData } from '../../utils/additionalData/functions';
import { toBase64 } from '../../utils/base64';
import { LogTypes } from '../../utils/constants';
import { askExternalStoragePermission } from '../../utils/permissions';
import { AlertModal, Header, LargeButton } from '../Common';

const AdditionalDataSettings = () => {
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [isImportingData, setIsImportingData] = useState<boolean>(false);
  const [alertHeading, setAlertHeading] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [showSecondaryButton, setShowSecondaryButton] = useState<boolean>(false);

  const {
    forms,
    metadata,
    addFormsToState,
    addMetadataInState,
    setTreeType,
    setRegistrationType,
  } = useContext(AdditionalDataContext);

  const exportAdditionalData = () => {
    const exportData = {
      formData: forms,
      metadata,
    };

    const options = {
      url: 'data:application/json;base64,' + toBase64(JSON.stringify(exportData)),
      message: i18next.t('label.export_additional_data_message'),
      title: i18next.t('label.export_additional_data_title'),
      filename: `TreeMapper-Additional-Data`,
      saveToFiles: true,
      failOnCancel: false,
    };

    Share.open(options).catch((err) => {
      if (err?.error?.code != 'ECANCELLED500') { // iOS cancel button pressed
        setAlertHeading(i18next.t('label.something_went_wrong'));
        setAlertMessage(i18next.t('label.share_additional_data_error'));
        setShowSecondaryButton(false);
        setShowAlert(true);

        dbLog.error({
          logType: LogTypes.ADDITIONAL_DATA,
          message: `Error while sharing additional data`,
          logStack: JSON.stringify(err),
        });
      }
    });
  };

  const handleImportExport = async (option: 'import' | 'export') => {
    if (option === 'export') {
      const permissionResult = await askExternalStoragePermission();
      if (permissionResult) {
        exportAdditionalData();
      }
    } else if (option === 'import') {
      if ((forms && forms.length > 0) || (metadata && metadata.length > 0)) {
        setAlertHeading(i18next.t('label.confirm_wipe_additional_data_import'));
        setAlertMessage(i18next.t('label.current_additional_data_lost'));
        setShowSecondaryButton(true);
        setShowAlert(true);
      } else {
        importJsonFile();
      }
    }
  };

  const closeAlertModal = () => setShowAlert(false);

  const importJsonFile = async () => {
    try {
      // pick json file from file system
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      setShowAlert(false);
      setIsImportingData(true);
      await readJsonFileAndAddAdditionalData(res);
      setIsImportingData(false);

      setTreeType('all');
      setRegistrationType('all');
      addFormsToState();
      addMetadataInState();
    } catch (err) {
      setShowAlert(false);
      setIsImportingData(false);
      if (err?.message === 'Incorrect JSON file format') {
        setAlertHeading(i18next.t('label.incorrect_file_format'));
        setAlertMessage(i18next.t('label.incorrect_format_additional_data_import'));
        setShowSecondaryButton(false);
        setShowAlert(true);
      } else if (err?.message !== 'User canceled document picker') {
        setAlertHeading(i18next.t('label.something_went_wrong'));
        setAlertMessage(i18next.t('label.import_file_error'));
        setShowSecondaryButton(false);
        setShowAlert(true);

        dbLog.error({
          logType: LogTypes.ADDITIONAL_DATA,
          message: `Failed to import file to add additional data`,
          logStack: JSON.stringify(err),
        });
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.WHITE }}>
      <View style={styles.container}>
        <Header
          headingText={i18next.t('label.import_export_data')}
          subHeadingText={i18next.t('label.import_export_data_desc')}
        />
        {isImportingData ? (
          <View style={styles.importingContainer}>
            <SvgXml xml={importIcon} />
            <Text style={styles.importingText}>{i18next.t('label.importing_additional_data')}</Text>
            <ActivityIndicator
              size="large"
              color={Colors.PRIMARY}
              style={{ paddingVertical: 20 }}
            />
          </View>
        ) : (
          <>
            <LargeButton
              onPress={() => handleImportExport('import')}
              heading={i18next.t('label.import_data')}
              subHeading={i18next.t('label.import_data_desc')}
              testID={'import_additional_data'}
              accessibilityLabel={'import_additional_data'}
              leftComponent={<FA5Icon name={'file-import'} color={Colors.TEXT_COLOR} size={40} />}
            />
            <LargeButton
              onPress={() => handleImportExport('export')}
              heading={i18next.t('label.export_data')}
              subHeading={`${i18next.t('label.export_data_desc')}`}
              testID={'export_additional_data'}
              accessibilityLabel={'export_additional_data'}
              leftComponent={<FA5Icon name={'file-export'} color={Colors.TEXT_COLOR} size={40} />}
            />
          </>
        )}

        {/* <View style={{ flex: 1 }}></View> */}
        <AlertModal
          visible={showAlert}
          heading={alertHeading}
          message={alertMessage}
          primaryBtnText={showSecondaryButton ? i18next.t('label.yes') : i18next.t('label.ok')}
          onPressPrimaryBtn={showSecondaryButton ? importJsonFile : closeAlertModal}
          showSecondaryButton={showSecondaryButton}
          secondaryBtnText={i18next.t('label.cancel')}
          onPressSecondaryBtn={closeAlertModal}
        />
      </View>
    </SafeAreaView>
  );
};

export default AdditionalDataSettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    backgroundColor: Colors.WHITE,
  },
  importingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  importingText: {
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    fontSize: Typography.FONT_SIZE_16,
    color: Colors.TEXT_COLOR,
    textAlign: 'center',
    marginTop: 60,
  },
});
