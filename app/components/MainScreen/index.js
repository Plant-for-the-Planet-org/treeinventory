import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import Realm from 'realm';
import { Colors, Typography } from '_styles';
import { updateCount } from '../../actions/inventory';
import { startLoading, stopLoading } from '../../actions/loader';
import {
  auth0Login,
  auth0Logout,
  clearUserDetails,
  getCdnUrls,
  setUserDetails,
} from '../../actions/user';
import { main_screen_banner, map_texture } from '../../assets';
import i18next from '../../languages/languages';
import { InventoryContext } from '../../reducers/inventory';
import { LoadingContext } from '../../reducers/loader';
import { UserContext } from '../../reducers/user';
import { getSchema } from '../../repositories/default';
import { getInventoryByStatus } from '../../repositories/inventory';
import { getUserDetails } from '../../repositories/user';
import { Header, LargeButton, Loader, MainScreenHeader, PrimaryButton, Sync } from '../Common';
import ProfileModal from '../ProfileModal';

const MainScreen = ({ navigation }) => {
  const [isModalVisible, setIsModalVisible] = useState(false); // * FOR VIDEO MODAL
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [numberOfInventory, setNumberOfInventory] = useState(0);
  const [isUserLogin, setIsUserLogin] = useState(false);
  const { state, dispatch } = useContext(InventoryContext);
  const { state: loadingState, dispatch: loadingDispatch } = useContext(LoadingContext);
  const { dispatch: userDispatch } = useContext(UserContext);
  const [userInfo, setUserInfo] = useState({});
  const [cdnUrls, setCdnUrls] = useState({});

  useEffect(() => {
    let realm;
    // stores the listener to later unsubscribe when screen is unmounted
    const unsubscribe = navigation.addListener('focus', async () => {
      getInventoryByStatus('all').then((data) => {
        let count = 0;
        for (const inventory of data) {
          if (inventory.status === 'pending' || inventory.status === 'uploading') {
            count++;
          }
        }
        updateCount({ type: 'pending', count })(dispatch);
        setNumberOfInventory(data ? data.length : 0);
      });

      realm = await Realm.open(getSchema());
      initializeRealm(realm);
    });

    // Return the function to unsubscribe from the event so it gets removed on unmount
    return () => {
      unsubscribe();
      if (realm) {
        // Unregister all realm listeners
        realm.removeAllListeners();
      }
    };
  }, [navigation]);

  useEffect(() => {
    getUserDetails().then((userDetails) => {
      if (userDetails) {
        setUserInfo(userDetails);
        setIsUserLogin(userDetails.accessToken ? true : false);
      }
    });
    getCdnUrls(i18next.language).then((cdnMedia) => {
      setCdnUrls(cdnMedia);
    });
  }, []);

  // Define the collection notification listener
  function listener(userData, changes) {
    if (changes.deletions.length > 0) {
      setUserInfo({});
      setIsUserLogin(false);
      clearUserDetails()(userDispatch);
    }
    // Update UI in response to inserted objects
    changes.insertions.forEach((index) => {
      if (userData[index].id === 'id0001') {
        checkIsSignedInAndUpdate(userData[index]);
      }
    });
    // Update UI in response to modified objects
    changes.modifications.forEach((index) => {
      if (userData[index].id === 'id0001') {
        checkIsSignedInAndUpdate(userData[index]);
      }
    });
  }

  // initializes the realm by adding listener to user object of realm to listen
  // the modifications and update the application state
  const initializeRealm = async (realm) => {
    try {
      // gets the user object from realm
      const userObject = realm.objects('User');

      // Observe collection notifications.
      userObject.addListener(listener);
    } catch (err) {
      console.error(`Error at /components/MainScreen/initializeRealm, ${JSON.stringify(err)}`);
    }
  };

  const checkIsSignedInAndUpdate = (userDetail) => {
    if (userDetail.isSignUpRequired) {
      navigation.navigate('SignUp');
    } else {
      // dispatch function sets the passed user details into the user state
      setUserDetails(userDetail)(userDispatch);
      setUserInfo(userDetail);
      setIsUserLogin(userDetail.accessToken ? true : false);
    }
  };

  // let rightIcon = <Icon size={40} name={'play-circle'} color={Colors.GRAY_LIGHTEST} />;

  const onPressLargeButtons = (screenName) => navigation.navigate(screenName);

  const onPressLearn = () => setIsModalVisible(!isModalVisible);

  const onPressCloseProfileModal = () => setIsProfileModalVisible(!isProfileModalVisible);

  const onPressLogin = async () => {
    if (isUserLogin) {
      setIsProfileModalVisible(true);
    } else {
      startLoading()(loadingDispatch);
      auth0Login(userDispatch)
        .then(() => {
          stopLoading()(loadingDispatch);
        })
        .catch((err) => {
          if (err?.response?.status === 303) {
            navigation.navigate('SignUp');
          } else if (err.error !== 'a0.session.user_cancelled' && err?.response?.status < 500) {
            Alert.alert(
              'Verify your Email',
              'Please verify your email before logging in.',
              [{ text: 'OK' }],
              { cancelable: false },
            );
          }
          stopLoading()(loadingDispatch);
        });
    }
  };

  const onPressLogout = () => {
    onPressCloseProfileModal();
    auth0Logout(userDispatch);
  };

  const renderVideoModal = () => {
    return (
      <Modal visible={isModalVisible} animationType={'slide'}>
        <View style={styles.modalContainer}>
          <Ionicons
            name={'md-close'}
            size={30}
            color={Colors.WHITE}
            onPress={onPressLearn}
            style={styles.closeIcon}
          />
          {isModalVisible && (
            <Video
              repeat={true}
              resizeMode={'contain'}
              posterResizeMode={'stretch'}
              source={require('./learn.mp4')}
              style={styles.videoPLayer}
            />
          )}
        </View>
      </Modal>
    );
  };

  const onPressLegals = () => {
    navigation.navigate('Legals');
  };

  const onPressSupport = () => {
    Linking.openURL('mailto:support@plant-for-the-planet.org').catch(() =>
      alert('Can write mail to support@plant-for-the-planet.org'),
    );
  };

  return (
    <SafeAreaView style={styles.safeAreaViewCont}>
      {loadingState.isLoading ? (
        <Loader isLoaderShow={true} />
      ) : (
        <View style={styles.container} testID="app-root" accessibilityLabel="app-root">
          <ScrollView style={styles.safeAreaViewCont} showsVerticalScrollIndicator={false}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Sync
                uploadCount={state.uploadCount}
                pendingCount={state.pendingCount}
                isUploading={state.isUploading}
                isUserLogin={isUserLogin}
              />
              <MainScreenHeader
                onPressLogin={onPressLogin}
                isUserLogin={isUserLogin}
                testID={'btn_login'}
                accessibilityLabel={'Login/Sign Up'}
                photo={
                  cdnUrls && cdnUrls.cache && userInfo.image
                    ? `${cdnUrls.cache}/profile/avatar/${userInfo.image}`
                    : ''
                }
                name={userInfo ? userInfo.firstName : ''}
              />
            </View>
            {/* <View> */}
            <View style={styles.bannerImgContainer}>
              <SvgXml xml={main_screen_banner} />
            </View>
            <Header
              headingText={i18next.t('label.tree_mapper')}
              hideBackIcon
              textAlignStyle={{ textAlign: 'center' }}
            />
            {/* </View> */}
            <View>
              <ImageBackground id={'inventorybtn'} source={map_texture} style={styles.bgImage}>
                <LargeButton
                  onPress={() => onPressLargeButtons('TreeInventory')}
                  style={styles.customStyleLargeBtn}
                  heading={i18next.t('label.tree_inventory')}
                  active={false}
                  subHeading={i18next.t('label.tree_inventory_sub_header')}
                  notification={numberOfInventory > 0 && numberOfInventory}
                  testID="page_tree_inventory"
                  accessibilityLabel="Tree Inventory"
                />
              </ImageBackground>
              <ImageBackground id={'downloadmapbtn'} source={map_texture} style={styles.bgImage}>
                <LargeButton
                  onPress={() => onPressLargeButtons('DownloadMap')}
                  style={styles.customStyleLargeBtn}
                  heading={i18next.t('label.download_maps')}
                  active={false}
                  subHeading={i18next.t('label.download_maps_sub_header')}
                  testID="page_map"
                  accessibilityLabel="Download Map"
                />
              </ImageBackground>
              {/* <ImageBackground id={'learnbtn'} source={map_texture} style={styles.bgImage}>
              <LargeButton
                onPress={onPressLearn}
                rightIcon={rightIcon}
                style={styles.customStyleLargeBtn}
                heading={i18next.t('label.learn')}
                active={false}
                subHeading={i18next.t('label.learn_sub_header')}
                accessibilityLabel="Learn"
                testID="page_learn"
              />
            </ImageBackground> */}
            </View>
          </ScrollView>
          <PrimaryButton
            onPress={() => onPressLargeButtons('RegisterTree')}
            btnText={i18next.t('label.register_tree')}
            testID={'btn_register_trees'}
            accessibilityLabel={'btn_register_trees'}
          />
          {!isUserLogin ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-evenly',
                marginHorizontal: 50,
              }}>
              <Text onPress={onPressLegals} style={styles.textAlignCenter}>
                {i18next.t('label.legal_docs')}
              </Text>
              <Text>•</Text>
              <Text onPress={onPressSupport} style={styles.textAlignCenter}>
                {i18next.t('label.support')}
              </Text>
            </View>
          ) : (
            <View />
          )}
        </View>
      )}
      {renderVideoModal()}
      <ProfileModal
        isUserLogin={isUserLogin}
        isProfileModalVisible={isProfileModalVisible}
        onPressCloseProfileModal={onPressCloseProfileModal}
        onPressLogout={onPressLogout}
        userInfo={userInfo}
        cdnUrls={cdnUrls}
      />
    </SafeAreaView>
  );
};
export default MainScreen;

const styles = StyleSheet.create({
  safeAreaViewCont: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 20,
    backgroundColor: Colors.WHITE,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.BLACK,
    padding: 30,
  },
  addSpecies: {
    color: Colors.ALERT,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_18,
    lineHeight: Typography.LINE_HEIGHT_24,
    textAlign: 'center',
  },
  customStyleLargeBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    marginVertical: 0,
    borderWidth: 0.1,
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '150%',
    overflow: 'hidden',
    marginVertical: 10,
    borderRadius: 5,
  },
  bannerImgContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 50,
  },
  bannerImage: {
    alignSelf: 'center',
  },
  videoPLayer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  closeIcon: {
    zIndex: 100,
  },
  textAlignCenter: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_10,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
});
