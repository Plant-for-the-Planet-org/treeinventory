import { StackActions } from '@react-navigation/native';
import i18next from 'i18next';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  BackHandler,
  Linking,
  Platform,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Colors } from '_styles';
import { empty_inventory_banner } from '../../assets';
import { InventoryContext } from '../../reducers/inventory';
import { clearAllIncompleteInventory, getInventoryByStatus } from '../../repositories/inventory';
import { uploadInventoryData } from '../../utils/uploadInventory';
import { Header, InventoryList, PrimaryButton, SmallHeader, AlertModal, Sync } from '../Common';
import {
  DATA_UPLOAD_START,
  INCOMPLETE,
  INCOMPLETE_SAMPLE_TREE,
  PENDING_DATA_UPLOAD,
  PENDING_IMAGE_UPLOAD,
  PENDING_SAMPLE_TREES_UPLOAD,
  SYNCED,
} from '../../utils/inventoryConstants';
import { UserContext } from '../../reducers/user';
import VerifyEmailAlert from '../Common/EmailAlert';
import { getUserDetails } from '../../repositories/user';
import { useNetInfo } from '@react-native-community/netinfo';

const IS_ANDROID = Platform.OS === 'android';

const TreeInventory = ({ navigation }) => {
  const { state, dispatch } = useContext(InventoryContext);
  const { dispatch: userDispatch } = useContext(UserContext);

  const [allInventory, setAllInventory] = useState(null);
  const [isPermissionBlockedAlertShow, setIsPermissionBlockedAlertShow] = useState(false);
  const [emailAlert, setEmailAlert] = useState(false);
  const [pendingInventory, setPendingInventory] = useState([]);
  const [uploadingInventory, setUploadingInventory] = useState([]);
  const [inCompleteInventory, setInCompleteInventory] = useState([]);
  const [uploadedInventory, setUploadedInventory] = useState([]);
  const [countryCode, setCountryCode] = useState('');
  const [offlineModal, setOfflineModal] = useState(false);

  const netInfo = useNetInfo();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      initialState();
    });

    return () => {
      unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    if (state.isUploading) {
      filteredInventories();
    }
  }, [state.uploadCount, state.isUploading, state.pendingCount, state.progressCount]);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
  }, []);

  const handleBackPress = () => {
    navigation.dispatch(StackActions.popToTop());
    // navigation.goBack();
  };

  const initialState = () => {
    getInventoryByStatus([]).then((allInventory) => {
      setAllInventory(allInventory);
      filteredInventories();
    });
    getUserDetails().then((userDetails) => {
      setCountryCode(userDetails?.country || '');
    });
  };

  const onPressClearAll = () => {
    clearAllIncompleteInventory().then(() => {
      getInventoryByStatus([]).then((allInventory) => {
        setAllInventory(allInventory);
      });
    });
  };

  const filteredInventories = () => {
    getInventoryByStatus([INCOMPLETE, INCOMPLETE_SAMPLE_TREE]).then((inventoryList) => {
      setInCompleteInventory(inventoryList);
    });
    getInventoryByStatus([PENDING_DATA_UPLOAD]).then((inventoryList) => {
      setPendingInventory(inventoryList);
    });
    getInventoryByStatus([
      PENDING_IMAGE_UPLOAD,
      PENDING_SAMPLE_TREES_UPLOAD,
      DATA_UPLOAD_START,
    ]).then((inventoryList) => {
      setUploadingInventory(inventoryList);
    });
    getInventoryByStatus([SYNCED]).then((inventoryList) => {
      setUploadedInventory(inventoryList);
    });
  };

  const onPressUploadNow = () => {
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      uploadInventoryData(dispatch, userDispatch)
        .then(() => {
          // handleBackPress();
        })
        .catch((err) => {
          if (err?.response?.status === 303) {
            navigation.navigate('SignUp');
          } else if (err?.message === 'blocked') {
            setIsPermissionBlockedAlertShow(true);
          } else if (err?.error !== 'a0.session.user_cancelled') {
            setEmailAlert(true);
          }
        });
      navigation.goBack();
    } else {
      setOfflineModal(true);
    }
  };

  const renderLoadingInventoryList = () => {
    return (
      <View style={styles.cont}>
        <Header
          headingText={i18next.t('label.tree_inventory_list_header')}
          subHeadingText={i18next.t('label.tree_inventory_list_sub_header')}
          style={{ marginHorizontal: 25 }}
          onBackPress={handleBackPress}
          TopRightComponent={uploadButton}
        />
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  };

  const renderEmptyInventoryList = () => {
    return (
      <View style={styles.cont}>
        <Header
          headingText={i18next.t('label.tree_inventory_empty_list_header')}
          subHeadingText={i18next.t('label.tree_inventory_list_sub_header')}
          style={{ marginHorizontal: 25 }}
          onBackPress={handleBackPress}
        />
        <SvgXml xml={empty_inventory_banner} style={styles.emptyInventoryBanner} />
        <View style={styles.primaryBtnCont}>
          {uploadedInventory.length > 0 && (
            <PrimaryButton
              onPress={() => navigation.navigate('UploadedInventory')}
              btnText={i18next.t('label.tree_inventory_view_upload')}
              theme={'white'}
              style={{ marginVertical: 20 }}
            />
          )}
          <PrimaryButton
            onPress={() => navigation.navigate('RegisterTree')}
            btnText={i18next.t('label.register_tree')}
            style={{ marginTop: 10 }}
          />
        </View>
      </View>
    );
  };

  const renderInventoryListContainer = () => {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Header
            headingText={i18next.t('label.tree_inventory_list_header')}
            subHeadingText={i18next.t('label.tree_inventory_list_container_sub_header')}
            onBackPress={handleBackPress}
            TopRightComponent={uploadButton}
          />
          <RenderInventory
            uploadingInventory={uploadingInventory}
            uploadedInventory={uploadedInventory}
            pendingInventory={pendingInventory}
            inCompleteInventory={inCompleteInventory}
            onPressClearAll={onPressClearAll}
            state={state}
            navigation={navigation}
            onPressUploadNow={onPressUploadNow}
            countryCode={countryCode}
          />
        </ScrollView>
        <PrimaryButton
          onPress={() => navigation.navigate('RegisterTree')}
          btnText={i18next.t('label.register_tree')}
          style={{ marginTop: 10 }}
        />
        <SafeAreaView />
      </View>
    );
  };
  const uploadButton = () => {
    return (
      <Sync
        uploadCount={state.uploadCount}
        pendingCount={state.pendingCount}
        isUploading={state.isUploading}
        isUserLogin={true}
        borderLess={true}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.WHITE }}>
      <SafeAreaView />
      {pendingInventory.length > 0 ||
      inCompleteInventory.length > 0 ||
      uploadedInventory.length > 0 ||
      uploadingInventory.length > 0
        ? renderInventoryListContainer()
        : allInventory == null
          ? renderLoadingInventoryList()
          : renderEmptyInventoryList()}
      <PermissionBlockedAlert
        isPermissionBlockedAlertShow={isPermissionBlockedAlertShow}
        setIsPermissionBlockedAlertShow={setIsPermissionBlockedAlertShow}
        handleBackPress={handleBackPress}
      />
      <AlertModal
        visible={offlineModal}
        heading={i18next.t('label.network_error')}
        message={i18next.t('label.network_error_message')}
        primaryBtnText={i18next.t('label.ok')}
        onPressPrimaryBtn={() => {
          setOfflineModal(false);
        }}
      />
      <VerifyEmailAlert emailAlert={emailAlert} setEmailAlert={setEmailAlert} />
    </View>
  );
};
export default TreeInventory;

const RenderInventory = ({
  uploadingInventory,
  uploadedInventory,
  pendingInventory,
  inCompleteInventory,
  onPressClearAll,
  state,
  navigation,
  onPressUploadNow,
  countryCode,
}) => {
  return (
    <View style={styles.cont}>
      {uploadingInventory.length > 0 && (
        <>
          {/* {state.isUploading && ( */}
          <SmallHeader
            // onPressRight={onPressUploadNow}
            leftText={i18next.t('label.tree_inventory_left_text_uploading')}
            rightText={state.isUploading ? 'Uploading' : ''}
            sync={state.isUploading}
            style={{ marginVertical: 15 }}
          />
          {/* )} */}
          <InventoryList
            accessibilityLabel={i18next.t('label.tree_inventory_inventory_list')}
            inventoryList={uploadingInventory}
          />
        </>
      )}
      {pendingInventory.length > 0 && (
        <>
          {/* {!state.isUploading ? ( */}
          <SmallHeader
            onPressRight={onPressUploadNow}
            leftText={i18next.t('label.tree_inventory_left_text')}
            // rightText={i18next.t('label.tree_inventory_right_text')}
            // icon={'cloud-upload'}
            style={{ marginVertical: 15 }}
          />
          {/* ) : (
              <SmallHeader
                // onPressRight={onPressUploadNow}
                leftText={i18next.t('label.tree_inventory_left_text')}
                rightText={'Uploading'}
                sync={true}
                style={{ marginVertical: 15 }}
              />
            )} */}
          <InventoryList
            accessibilityLabel={i18next.t('label.tree_inventory_inventory_list')}
            inventoryList={pendingInventory}
          />
        </>
      )}
      {uploadedInventory.length > 0 && (
        <PrimaryButton
          onPress={() => navigation.navigate('UploadedInventory')}
          btnText={i18next.t('label.tree_inventory_view_upload')}
          theme={'white'}
          style={{ marginVertical: 20 }}
        />
      )}
      {inCompleteInventory.length > 0 && (
        <>
          <SmallHeader
            onPressRight={onPressClearAll}
            leftText={i18next.t('label.tree_inventory_incomplete_registrations')}
            rightText={i18next.t('label.tree_inventory_clear_all')}
            rightTheme={'red'}
            style={{ marginVertical: 15 }}
          />
          <InventoryList
            accessibilityLabel={i18next.t('label.tree_inventory_inventory_list')}
            inventoryList={inCompleteInventory}
            countryCode={countryCode}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    backgroundColor: Colors.WHITE,
  },
  cont: {
    flex: 1,
  },
  emptyInventoryBanner: {
    width: '109%',
    height: '80%',
    marginHorizontal: -5,
    bottom: -10,
  },
  primaryBtnCont: {
    position: 'absolute',
    width: '100%',
    justifyContent: 'center',
    bottom: 10,
    paddingHorizontal: 25,
  },
  dowloadModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  loader: {
    backgroundColor: Colors.WHITE,
    borderRadius: 20,
    marginVertical: 20,
  },
});

const PermissionBlockedAlert = ({
  isPermissionBlockedAlertShow,
  setIsPermissionBlockedAlertShow,
  handleBackPress,
}) => {
  return (
    <AlertModal
      visible={isPermissionBlockedAlertShow}
      heading={i18next.t('label.permission_blocked')}
      message={i18next.t('label.permission_blocked_message')}
      primaryBtnText={i18next.t('label.open_settings')}
      secondaryBtnText={i18next.t('label.cancel')}
      onPressPrimaryBtn={() => {
        setIsPermissionBlockedAlertShow(false);
        if (IS_ANDROID) {
          Linking.openSettings();
        } else {
          Linking.openURL('app-settings:');
        }
      }}
      onPressSecondaryBtn={() => {
        setIsPermissionBlockedAlertShow(false);
      }}
      showSecondaryButton={true}
    />
  );
};
