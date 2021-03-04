import Geolocation from 'react-native-geolocation-service';
import MapboxGL from '@react-native-mapbox-gl/maps';
import { useNavigation, CommonActions } from '@react-navigation/native';
import i18next from 'i18next';
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import Config from 'react-native-config';
import LinearGradient from 'react-native-linear-gradient';
import { SvgXml } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography } from '_styles';
import { active_marker, marker_png, off_site_enable_banner } from '../../assets';
import { InventoryContext } from '../../reducers/inventory';
import {
  addCoordinateSingleRegisterTree,
  getInventory,
  updateLastScreen,
} from '../../repositories/inventory';
import { AlertModal, Alrighty, Header, PrimaryButton } from '../Common';
import distanceCalculator from '../../utils/distanceCalculator';

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

const IS_ANDROID = Platform.OS === 'android';

const MapMarking = ({ updateScreenState, inventoryState, resetRouteStack }) => {
  const [isAlrightyModalShow, setIsAlrightyModalShow] = useState(false);
  const [isAccuracyModalShow, setIsAccuracyModalShow] = useState(false);
  const [loader, setLoader] = useState(false);
  const [locateTree, setLocateTree] = useState('on-site');
  const [inventory, setInventory] = useState(null);
  const [accuracyInMeters, setAccuracyInMeters] = useState('');
  const [isAlertShow, setIsAlertShow] = useState(false);
  const [isInitial, setIsInitial] = useState(false);
  const [isLocation, setIsLocation] = useState(false);
  const [isLocationAlertShow, setIsLocationAlertShow] = useState(false);
  const [location, setLocation] = useState(null);
  const camera = useRef(null);
  const map = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    // Do something
    if (IS_ANDROID) {
      MapboxGL.requestAndroidLocationPermissions().then((permission) => {
        if (permission) {
          MapboxGL.setTelemetryEnabled(false);
          updateCurrentPosition();
        }
      });
    } else {
      Geolocation.requestAuthorization('whenInUse').then((permission) => {
        if (permission === 'granted') {
          updateCurrentPosition();
        } else {
          setIsLocationAlertShow(true);
        }
      });
    }
    const inventoryID = inventoryState.inventoryID;
    getInventory({ inventoryID: inventoryID }).then((inventory) => {
      setInventory(inventory);
    });
  }, []);

  const renderFakeMarker = () => {
    return (
      <View style={styles.fakeMarkerCont}>
        <SvgXml xml={active_marker} style={styles.markerImage} />
      </View>
    );
  };

  const onChangeRegionStart = () => setLoader(true);

  const onChangeRegionComplete = async () => {
    setLoader(false);
  };

  //only the first time marker will follow the user's current location by default
  const onUpdateUserLocation = (location) => {
    if (!location) {
      return;
    }
    if (!isInitial) {
      onPressMyLocationIcon(location);
    }
  };

  //recenter the marker to the current coordinates
  const onPressMyLocationIcon = (position) => {
    var recenterCoords;
    if (position) {
      recenterCoords = [position.coords.longitude, position.coords.latitude];
    } else {
      recenterCoords = [location.coords.longitude, location.coords.latitude];
    }
    setIsInitial(true);
    camera.current.setCamera({
      centerCoordinate: recenterCoords,
      zoomLevel: 18,
      animationDuration: 2000,
    });
  };

  //checks if the marker is within 100 meters range or not and assigns a LocateTree label accordingly
  const addMarker = async (forceContinue, accuracySet) => {
    // Check distance
    if (accuracySet < 30 || forceContinue) {
      updateCurrentPosition()
        .then(async () => {
          let currentCoords = [location.coords.latitude, location.coords.longitude];
          let centerCoordinates = await map.current.getCenter();
          let distance = distanceCalculator(
            currentCoords[0],
            currentCoords[1],
            centerCoordinates[1],
            centerCoordinates[0],
            'K',
          );

          let distanceInMeters = distance * 1000;
          let locateTreeVariable;
          if (distanceInMeters < 100) {
            setLocateTree('on-site');
            locateTreeVariable = 'on-site';
          } else {
            setLocateTree('off-site');
            locateTreeVariable = 'off-site';
          }
          onPressContinue(currentCoords, centerCoordinates, locateTreeVariable);
        })
        .catch((err) => {
          alert(JSON.stringify(err), 'Alert');
        });
    } else {
      setIsAlertShow(true);
    }
  };

  const renderMapView = () => {
    return (
      <MapboxGL.MapView
        showUserLocation={true}
        style={styles.container}
        ref={map}
        onRegionWillChange={onChangeRegionStart}
        onRegionDidChange={onChangeRegionComplete}>
        <MapboxGL.Camera ref={camera} />
        {isLocation && (
          <MapboxGL.UserLocation
            showsUserHeadingIndicator
            onUpdate={() => {
              updateCurrentPosition();
            }}
          />
        )}
      </MapboxGL.MapView>
    );
  };

  const renderMyLocationIcon = () => {
    return (
      <TouchableOpacity
        onPress={() => {
          if (location) {
            onPressMyLocationIcon(location);
          } else {
            setIsLocationAlertShow(true);
          }
        }}
        style={[styles.myLocationIcon]}
        accessibilityLabel="Register Tree Camera"
        accessible={true}
        testID="register_tree_camera">
        <View style={Platform.OS == 'ios' && styles.myLocationIconContainer}>
          <Icon name={'my-location'} size={22} />
        </View>
      </TouchableOpacity>
    );
  };

  //getting current position of the user with high accuracy
  const updateCurrentPosition = async () => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          setAccuracyInMeters(position.coords.accuracy);
          onUpdateUserLocation(position);
          setLocation(position);
          setIsLocation(true);
          resolve(true);
        },
        (err) => {
          setIsLocationAlertShow(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 20000,
          accuracy: {
            android: 'high',
            ios: 'bestForNavigation',
          },
        },
      );
    });
  };

  // Adds coordinates and locateTree label to inventory
  const onPressContinue = (currentCoords, centerCoordinates, locateTreeVariable) => {
    const inventoryID = inventoryState.inventoryID;
    addCoordinateSingleRegisterTree({
      inventory_id: inventoryID,
      markedCoords: centerCoordinates,
      locateTree: locateTreeVariable,
      currentCoords: { latitude: currentCoords[0], longitude: currentCoords[1] },
    }).then(() => {
      setIsAlrightyModalShow(true);
    });
  };

  // Alrighty Screen..
  // Updates the last screen for off-site as the coordinates are already recorded.
  // Moves the screen to ImageCapturing for on-site flow as the Picture is needed in the on-site flow
  const renderAlrightyModal = () => {
    const onPressClose = () => setIsAlrightyModalShow(false);
    const moveScreen = () => updateScreenState('ImageCapturing');
    const offSiteContinue = () => {
      navigation.navigate('SelectSpecies', {
        inventory: inventory,
        visible: true,
      });
      updateLastScreen({ inventory_id: inventory.inventory_id, last_screen: 'SelectSpecies' });
      onPressClose();
    };
    let subHeading = i18next.t('label.alright_modal_sub_header');
    let heading = i18next.t('label.alright_modal_header');
    let bannerImage = undefined;
    let whiteBtnText = i18next.t('label.alright_modal_white_btn');
    if (locateTree == 'off-site') {
      subHeading = i18next.t('label.alright_modal_off_site_sub_header');
      heading = i18next.t('label.alright_modal_off_site_header');
      bannerImage = off_site_enable_banner;
      whiteBtnText = undefined;
    }
    return (
      <Modal animationType={'slide'} visible={isAlrightyModalShow}>
        <View style={styles.cont}>
          <Alrighty
            closeIcon
            bannerImage={bannerImage}
            onPressClose={onPressClose}
            onPressWhiteButton={onPressClose}
            onPressContinue={locateTree === 'off-site' ? offSiteContinue : moveScreen}
            heading={heading}
            subHeading={subHeading}
            whiteBtnText={whiteBtnText}
          />
        </View>
      </Modal>
    );
  };

  const onPressBack = () => {
    // resets the navigation stack with MainScreen => TreeInventory
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'MainScreen' },
          {
            name: 'TreeInventory',
          },
        ],
      }),
    );
    return;
  };

  //this modal shows the information about GPS accuracy and accuracy range for red, yellow and green colour
  const renderAccuracyModal = () => {
    return (
      <Modal transparent visible={isAccuracyModalShow}>
        <View style={styles.modalContainer}>
          <View style={styles.contentContainer}>
            <Text
              style={{
                color: '#000000',
                fontFamily: Typography.FONT_FAMILY_BOLD,
                fontSize: Typography.FONT_SIZE_18,
                paddingBottom: 18,
              }}>
              {i18next.t('label.gps_accuracy')}
            </Text>
            <Text style={styles.accuracyModalText}>{i18next.t('label.accuracy_info')}</Text>
            <Text style={styles.accuracyModalText}>
              <Text style={{ color: '#87B738', fontFamily: Typography.FONT_FAMILY_BOLD }}>
                {i18next.t('label.green')}
              </Text>{' '}
              {i18next.t('label.green_info')}
            </Text>
            <Text style={styles.accuracyModalText}>
              <Text style={{ color: '#CBBB03', fontFamily: Typography.FONT_FAMILY_BOLD }}>
                {i18next.t('label.yellow')}
              </Text>{' '}
              {i18next.t('label.yellow_info')}
            </Text>
            <Text style={styles.accuracyModalText}>
              <Text style={{ color: '#FF0000', fontFamily: Typography.FONT_FAMILY_BOLD }}>
                {i18next.t('label.red')}
              </Text>{' '}
              {i18next.t('label.red_info')}
            </Text>
            <TouchableOpacity
              style={{
                alignSelf: 'center',
                paddingTop: 25,
              }}>
              <Text
                style={{
                  color: '#87B738',
                  fontFamily: Typography.FONT_FAMILY_REGULAR,
                  fontSize: Typography.FONT_SIZE_14,
                }}
                onPress={() => setIsAccuracyModalShow(false)}>
                {i18next.t('label.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  //if the accuracy is greater than 30m, this alert will be shown to confirm if the user really want to continue with the poor level of accuracy
  const renderConfirmationModal = () => {
    return (
      <AlertModal
        visible={isAlertShow}
        heading={i18next.t('label.poor_accuracy')}
        message={i18next.t('label.poor_accuracy_message')}
        primaryBtnText={i18next.t('label.try_again')}
        secondaryBtnText={i18next.t('label.continue')}
        onPressPrimaryBtn={onPressTryAgain}
        onPressSecondaryBtn={onPressAlertContinue}
      />
    );
  };

  //alert shown if the location setting are not satisfied
  const renderLocationAlert = () => {
    return (
      <AlertModal
        visible={isLocationAlertShow}
        heading={i18next.t('label.location_service')}
        message={i18next.t('label.location_service_message')}
        primaryBtnText={IS_ANDROID ? i18next.t('label.ok') : i18next.t('label.open_settings')}
        secondaryBtnText={i18next.t('label.back')}
        onPressPrimaryBtn={() => {
          setIsLocationAlertShow(false);
          if (IS_ANDROID) {
            updateCurrentPosition();
          } else {
            Linking.openURL('app-settings:');
          }
        }}
        onPressSecondaryBtn={() => {
          setIsLocationAlertShow(false);
          resetRouteStack();
        }}
      />
    );
  };

  //to try again for getting a better accuracy
  const onPressTryAgain = () => {
    setIsAlertShow(false);
  };
  //continuing with a poor accuracy
  const onPressAlertContinue = () => {
    setIsAlertShow(false);
    addMarker(true, accuracyInMeters);
  };

  //small button on top right corner which will show accuracy in meters and the respective colour
  const renderAccuracyInfo = () => {
    return (
      <TouchableOpacity
        style={[
          styles.gpsContainer,
          accuracyInMeters < 10 && accuracyInMeters > 0
            ? { backgroundColor: '#1CE003' }
            : accuracyInMeters < 30 && accuracyInMeters > 0
            ? { backgroundColor: '#FFC400' }
            : { backgroundColor: '#FF0000' },
        ]}
        onPress={() => setIsAccuracyModalShow(true)}>
        <Text style={styles.gpsText}>GPS ~{Math.round(accuracyInMeters * 100) / 100}m</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container} fourceInset={{ top: 'always' }}>
      <View style={styles.container}>
        {renderMapView()}
        {renderFakeMarker()}
      </View>
      <View>
        {renderMyLocationIcon()}
        <View style={styles.continueBtnCont}>
          <PrimaryButton
            onPress={() => addMarker(false, accuracyInMeters)}
            disabled={loader}
            btnText={i18next.t('label.tree_map_marking_btn')}
            style={styles.bottomBtnWith}
            testID={'tree_map_marking_btn'}
            accessibilityLabel={'tree_map_marking_btn'}
          />
        </View>
      </View>
      <LinearGradient style={styles.headerCont} colors={[Colors.WHITE, 'rgba(255, 255, 255, 0)']}>
        <SafeAreaView />
        <Header
          onBackPress={onPressBack}
          closeIcon
          headingText={i18next.t('label.tree_map_marking_header')}
          topRightComponent={renderAccuracyInfo}
        />
      </LinearGradient>
      <View></View>
      {renderAccuracyModal()}
      {renderConfirmationModal()}
      {renderLocationAlert()}
      {renderAlrightyModal()}
    </View>
  );
};

export default function MapMarkingMain(props) {
  const navigation = useNavigation();
  const { state } = useContext(InventoryContext);
  return <MapMarking {...props} {...state} navigation={navigation} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  cont: {
    flex: 1,
  },
  continueBtnCont: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    backgroundColor: 'transparent',
    width: '100%',
    justifyContent: 'center',
  },
  completePolygonBtnCont: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 80,
    backgroundColor: 'transparent',
    width: '100%',
    justifyContent: 'center',
  },
  headerCont: {
    paddingHorizontal: 25,
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    width: '100%',
  },
  gpsContainer: {
    marginTop: 20,
    width: 96,
    height: 24,
    backgroundColor: '#FFC400',
    borderRadius: 25,
  },
  gpsText: {
    color: '#FFFFFF',
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontWeight: Typography.FONT_WEIGHT_REGULAR,
    fontSize: Typography.FONT_SIZE_12,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    alignSelf: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  contentContainer: {
    backgroundColor: Colors.WHITE,
    width: 300,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderRadius: 10,
    paddingLeft: 25,
    paddingRight: 15,
    paddingVertical: 25,
  },
  accuracyModalText: {
    color: '#000000',
    lineHeight: 26,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_14,
  },
  fakeMarkerCont: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerImage: {
    position: 'absolute',
    resizeMode: 'contain',
    bottom: 0,
  },
  loader: {
    position: 'absolute',
    bottom: 67,
  },
  activeMarkerLocation: {
    position: 'absolute',
    bottom: 67,
    color: Colors.WHITE,
    fontWeight: 'bold',
    fontSize: 16,
  },
  myLocationIcon: {
    width: 45,
    height: 45,
    backgroundColor: Colors.WHITE,
    position: 'absolute',
    borderRadius: 100,
    right: 0,
    marginHorizontal: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: Colors.TEXT_COLOR,
    bottom: 90,
  },
  myLocationIconContainer: {
    top: 1.5,
    left: 0.8,
  },
  markerContainer: {
    width: 30,
    height: 43,
    paddingBottom: 85,
  },
  markerText: {
    width: 30,
    height: 43,
    color: Colors.WHITE,
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    paddingTop: 4,
  },
  bottomBtnWith: {
    width: '90%',
  },
});
