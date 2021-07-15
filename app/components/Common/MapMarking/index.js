import MapboxGL from '@react-native-mapbox-gl/maps';
import { CommonActions, useNavigation } from '@react-navigation/native';
import bbox from '@turf/bbox';
import turfCenter from '@turf/center';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import i18next from 'i18next';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Config from 'react-native-config';
import Geolocation from 'react-native-geolocation-service';
import { Colors, Typography } from '_styles';
import { AlertModal, Header } from '../';
import { initiateInventoryState } from '../../../actions/inventory';
import { InventoryContext } from '../../../reducers/inventory';
import {
  addCoordinates,
  addCoordinateSingleRegisterTree,
  addLocateTree,
  getInventory,
  initiateInventory,
  updateInventory,
  updateLastScreen,
} from '../../../repositories/inventory';
import dbLog from '../../../repositories/logs';
import { LogTypes } from '../../../utils/constants';
import distanceCalculator from '../../../utils/distanceCalculator';
import { MULTI, OFF_SITE, ON_SITE, SAMPLE, SINGLE } from '../../../utils/inventoryConstants';
import { toLetters } from '../../../utils/mapMarkingCoordinate';
import Map from './Map';
import MapAlrightyModal from './MapAlrightyModal';
import MapButtons from './MapButtons';
import { bugsnag } from '../../../utils';

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

const IS_ANDROID = Platform.OS === 'android';

export default function MapMarking({
  updateScreenState,
  treeType,
  updateActiveMarkerIndex,
  activeMarkerIndex,
  toggleState,
  setIsCompletePolygon,
  multipleLocateTree,
  isPointForMultipleTree,
  specieId,
  specieName,
}) {
  const [showAlrightyModal, setShowAlrightyModal] = useState(false);
  const [isAccuracyModalShow, setIsAccuracyModalShow] = useState(false);
  const [loader, setLoader] = useState(false);
  const [locateTree, setLocateTree] = useState(multipleLocateTree ? multipleLocateTree : ON_SITE);
  const [inventory, setInventory] = useState(null);
  const [accuracyInMeters, setAccuracyInMeters] = useState('');
  const [isAlertShow, setIsAlertShow] = useState(false);
  const [isInitial, setIsInitial] = useState(true);
  const [isLocationAlertShow, setIsLocationAlertShow] = useState(false);
  const [showSecondaryButton, setShowSecondaryButton] = useState(true);
  const [location, setLocation] = useState();

  // used to show alphabet for each map location
  const [alphabets, setAlphabets] = useState([]);

  // currently active polygon index
  const [activePolygonIndex, setActivePolygonIndex] = useState(0);

  const camera = useRef(null);
  const map = useRef(null);
  const navigation = useNavigation();

  const { state: inventoryState, dispatch } = useContext(InventoryContext);

  const [alertHeading, setAlertHeading] = useState('');
  const [alertSubHeading, setAlertSubHeading] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const [bounds, setBounds] = useState([]);
  const [isCameraRefVisible, setIsCameraRefVisible] = useState(false);
  const [centerCoordinate, setCenterCoordinate] = useState([]);
  const [polygonCoordinates, setPolygonCoordinates] = useState([]);
  // stores the geoJSON
  const [geoJSON, setGeoJSON] = useState({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          isPolygonComplete: false,
        },
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      },
    ],
  });

  useEffect(() => {
    let isCancelled = false;

    if (!isCancelled) {
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
      if (
        (treeType === SAMPLE || treeType === MULTI || treeType === SINGLE) &&
        inventoryState.inventoryID
      ) {
        initializeState();
      }
      if (treeType === MULTI) {
        generateAlphabets();
      }
    }

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isCameraRefVisible && bounds.length > 0 && camera?.current?.fitBounds) {
      camera.current.fitBounds([bounds[0], bounds[1]], [bounds[2], bounds[3]], 60, 1000);
    }
  }, [isCameraRefVisible, bounds]);

  useEffect(() => {
    if (isCameraRefVisible && centerCoordinate.length > 0 && camera?.current?.setCamera) {
      camera.current.setCamera({
        centerCoordinate,
      });
    }
  }, [isCameraRefVisible, centerCoordinate]);

  useEffect(() => {
    setLocateTree(multipleLocateTree);
  }, [multipleLocateTree]);

  // initializes the state by updating state
  const initializeState = () => {
    getInventory({ inventoryID: inventoryState.inventoryID }).then((inventoryData) => {
      setInventory(inventoryData);
      setLocateTree(inventoryData.locateTree);
      if (inventoryData.polygons.length > 0) {
        let featureList = inventoryData.polygons.map((onePolygon) => {
          return {
            type: 'Feature',
            properties: {
              isPolygonComplete: onePolygon.isPolygonComplete,
            },
            geometry: {
              type: 'LineString',
              coordinates: onePolygon.coordinates.map((oneCoordinate) => [
                oneCoordinate.longitude,
                oneCoordinate.latitude,
              ]),
            },
          };
        });

        if (
          treeType === MULTI &&
          activeMarkerIndex !== null &&
          activeMarkerIndex < featureList[0].geometry.coordinates.length
        ) {
          updateActiveMarkerIndex(featureList[0].geometry.coordinates.length);
        } else if (treeType === SAMPLE) {
          if (inventoryData.sampleTrees.length > 0) {
            for (const sampleTree of inventoryData.sampleTrees) {
              featureList.push({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Point',
                  coordinates: [sampleTree.longitude, sampleTree.latitude],
                },
              });
            }
          }
          setCenterCoordinate(turfCenter(featureList[0]));
          setBounds(bbox(featureList[0]));
          setPolygonCoordinates({
            type: 'Polygon',
            coordinates: [featureList[0].geometry.coordinates],
          });
        }
        let geoJSONData = {
          type: 'FeatureCollection',
          features: featureList,
        };
        setGeoJSON(geoJSONData);
      } else if (updateActiveMarkerIndex) {
        updateActiveMarkerIndex(0);
      }
    });
  };

  // generates the alphabets
  const generateAlphabets = () => {
    let alphabetsArray = [];
    for (var x = 1, y; x <= 130; x++) {
      y = toLetters(x);
      alphabetsArray.push(y);
    }
    setAlphabets(alphabetsArray);
  };

  //only the first time marker will follow the user's current location by default
  const onUpdateUserLocation = (userLocation) => {
    if (isInitial && userLocation) {
      onPressMyLocationIcon(userLocation);
    }
  };

  useEffect(() => {
    if (isInitial && location) {
      onPressMyLocationIcon(location);
    }
  }, [isCameraRefVisible, location]);

  //recenter the marker to the current coordinates
  const onPressMyLocationIcon = (position) => {
    if (isInitial && treeType === SAMPLE) {
      setIsInitial(false);
      return;
    }
    if (isCameraRefVisible && camera?.current?.setCamera) {
      setIsInitial(false);
      camera.current.setCamera({
        centerCoordinate: [position.coords.longitude, position.coords.latitude],
        zoomLevel: 18,
        animationDuration: 1000,
      });
    }
  };

  const checkIsValidMarker = async (centerCoordinates) => {
    let isValidMarkers = true;
    for (const oneMarker of geoJSON.features[activePolygonIndex].geometry.coordinates) {
      let distance = distanceCalculator(
        centerCoordinates[1],
        centerCoordinates[0],
        oneMarker[1],
        oneMarker[0],
        'K',
      );
      let distanceInMeters = distance * 1000;
      // if the current marker position is less than one meter to already present markers nearby,
      // then makes the current marker position invalid
      if (distanceInMeters < 1) {
        isValidMarkers = false;
      }
    }
    return isValidMarkers;
  };

  //checks if the marker is within 100 meters range or not and assigns a LocateTree label accordingly
  const addPolygonMarker = async (forceContinue = false) => {
    updateCurrentPosition()
      .then(async (location) => {
        let currentCoords = [location.coords.latitude, location.coords.longitude];
        let centerCoordinates = await map.current.getCenter();
        let isValidMarkers = await checkIsValidMarker(centerCoordinates);

        if (!isValidMarkers) {
          setShowSecondaryButton(false);
          setAlertHeading(i18next.t('label.locate_tree_cannot_mark_location'));
          setAlertSubHeading(i18next.t('label.locate_tree_add_marker_valid'));
          setShowAlert(true);
        } else if (locateTree === ON_SITE && (accuracyInMeters < 30 || forceContinue)) {
          let distance = distanceCalculator(
            currentCoords[0],
            currentCoords[1],
            centerCoordinates[1],
            centerCoordinates[0],
            'K',
          );

          let distanceInMeters = distance * 1000;

          if (distanceInMeters < 100) {
            pushMaker(currentCoords);
          } else {
            setShowSecondaryButton(false);
            setAlertHeading(i18next.t('label.locate_tree_cannot_mark_location'));
            setAlertSubHeading(i18next.t('label.locate_tree_add_marker_invalid'));
            setShowAlert(true);
          }
        } else if (locateTree === ON_SITE && (accuracyInMeters >= 30 || !forceContinue)) {
          setIsAlertShow(true);
        } else {
          pushMaker(currentCoords);
        }
      })
      .catch((err) => {
        bugsnag.notify(err);
        dbLog.error({
          logType: LogTypes.INVENTORY,
          message: 'Failed to update Current Position',
          logStack: JSON.stringify(err),
        });
        showUnknownLocationAlert();
      });
    // Check distance
  };

  const showUnknownLocationAlert = () => {
    setShowSecondaryButton(false);
    setAlertHeading(i18next.t('label.something_went_wrong'));
    setAlertSubHeading(i18next.t('label.locate_tree_unable_to_retrieve_location'));
    setShowAlert(true);
  };

  const pushMaker = async (currentCoords) => {
    geoJSON.features[0].geometry.coordinates[activeMarkerIndex] = await map.current.getCenter();

    setGeoJSON(geoJSON);

    let result;
    if (!inventoryState.inventoryID) {
      result = await initiateInventory({ treeType: MULTI }, dispatch);
      if (result) {
        initiateInventoryState(result)(dispatch);
        addLocateTree({ inventory_id: result.inventory_id, locateTree });
        getInventory({ inventoryID: result.inventory_id }).then((inventoryData) => {
          setInventory(inventoryData);
        });
        let data = { inventory_id: result.inventory_id, lastScreen: 'CreatePolygon' };
        updateLastScreen(data);
      }
    }
    if (inventoryState.inventoryID || result) {
      let data = {
        inventory_id: inventoryState.inventoryID ? inventoryState.inventoryID : result.inventory_id,
        geoJSON: geoJSON,
        currentCoords: { latitude: currentCoords.latitude, longitude: currentCoords.longitude },
      };

      addCoordinates(data).then(() => {
        if (locateTree === ON_SITE) {
          toggleState();
        } else {
          setShowAlrightyModal(true);
          updateActiveMarkerIndex(activeMarkerIndex + 1);
        }
      });
    }
  };

  //checks if the marker is within 100 meters range or not and assigns a LocateTree label accordingly
  const addPointMarker = async (forceContinue = false) => {
    // Check distance
    if (accuracyInMeters < 30 || forceContinue) {
      updateCurrentPosition()
        .then(async (location) => {
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
            setLocateTree(ON_SITE);
            locateTreeVariable = ON_SITE;
            onPressContinue(currentCoords, centerCoordinates, locateTreeVariable);
          } else if (treeType !== SAMPLE) {
            setLocateTree(OFF_SITE);
            locateTreeVariable = OFF_SITE;
            onPressContinue(currentCoords, centerCoordinates, locateTreeVariable);
          } else {
            setAlertHeading(i18next.t('label.locate_tree_cannot_record_tree'));
            setAlertSubHeading(i18next.t('label.locate_tree_add_marker_invalid'));
            setShowAlert(true);
          }
        })
        .catch((err) => {
          bugsnag.notify(err);
          dbLog.error({
            logType: LogTypes.INVENTORY,
            message: 'Failed to update Current Position',
            logStack: JSON.stringify(err),
          });
          showUnknownLocationAlert();
        });
    } else {
      setIsAlertShow(true);
    }
  };

  //getting current position of the user with high accuracy
  const updateCurrentPosition = async () => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          setAccuracyInMeters(position.coords.accuracy);
          onUpdateUserLocation(position);
          setLocation(position);
          resolve(position);
        },
        (err) => {
          setIsLocationAlertShow(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          accuracy: {
            android: 'high',
            ios: 'bestForNavigation',
          },
        },
      );
    });
  };

  // Adds coordinates and locateTree label to inventory
  const onPressContinue = async (currentCoords, centerCoordinates, locateTreeVariable) => {
    const inventoryID = inventoryState.inventoryID;

    if (treeType === SAMPLE) {
      let sampleTrees = [...inventory.sampleTrees];

      if (
        specieId &&
        specieName &&
        inventory.sampleTreesCount == inventory.completedSampleTreesCount
      ) {
        await updateInventory({
          inventory_id: inventoryState.inventoryID,
          inventoryData: {
            sampleTreesCount: inventory.sampleTreesCount + 1,
          },
        });
      }
      let data = {
        latitude: centerCoordinates[1],
        longitude: centerCoordinates[0],
        deviceLatitude: currentCoords[0],
        deviceLongitude: currentCoords[1],
        plantationDate: new Date(),
        specieId,
        specieName,
      };

      if (sampleTrees[inventory.completedSampleTreesCount]) {
        sampleTrees[inventory.completedSampleTreesCount] = data;
      } else {
        sampleTrees.push(data);
      }

      const point = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: centerCoordinates,
        },
      };

      const isPointInPolygon = booleanPointInPolygon(point, polygonCoordinates);

      if (isPointInPolygon) {
        updateInventory({
          inventory_id: inventoryID,
          inventoryData: {
            sampleTrees,
          },
        })
          .then(() => {
            let data = {
              inventory_id: inventory.inventory_id,
              lastScreen: 'RecordSampleTrees',
            };
            updateLastScreen(data);
            getInventory({ inventoryID: inventoryID }).then((inventoryData) => {
              setInventory(inventoryData);
            });
            dbLog.info({
              logType: LogTypes.INVENTORY,
              message: `Successfully added map coordinate for sample tree #${
                inventory.completedSampleTreesCount + 1
              } having inventory_id: ${inventoryID}`,
            });
            setShowAlrightyModal(true);
          })
          .catch((err) => {
            dbLog.error({
              logType: LogTypes.INVENTORY,
              message: `Failed to add map coordinate for sample tree #${
                inventory.completedSampleTreesCount + 1
              } having inventory_id: ${inventoryID}`,
              logStack: JSON.stringify(err),
            });
            console.error(
              `Failed to add map coordinate for sample tree #${
                inventory.completedSampleTreesCount + 1
              } having inventory_id: ${inventoryID}`,
              err,
            );
          });
      } else {
        setShowSecondaryButton(false);
        setAlertHeading(i18next.t('label.locate_tree_cannot_record_tree'));
        setAlertSubHeading(i18next.t('label.locate_tree_cannot_record_tree_outside_polygon'));
        setShowAlert(true);
      }
    } else {
      let result;
      if (!inventoryID) {
        result = await initiateInventory(
          { treeType: isPointForMultipleTree ? MULTI : SINGLE },
          dispatch,
        );
        if (result) {
          initiateInventoryState(result)(dispatch);
          getInventory({ inventoryID: result.inventory_id }).then((inventoryData) => {
            setInventory(inventoryData);
          });
        }
      }
      if (inventoryID || result) {
        addCoordinateSingleRegisterTree({
          inventory_id: inventoryID ? inventoryID : result.inventory_id,
          markedCoords: centerCoordinates,
          locateTree: isPointForMultipleTree ? OFF_SITE : locateTreeVariable,
          currentCoords: { latitude: currentCoords[0], longitude: currentCoords[1] },
        }).then(() => {
          if (isPointForMultipleTree) {
            // resets the navigation stack with MainScreen => TreeInventory => TotalTreesSpecies
            navigation.dispatch(
              CommonActions.reset({
                index: 2,
                routes: [
                  { name: 'MainScreen' },
                  { name: 'TreeInventory' },
                  { name: 'TotalTreesSpecies' },
                ],
              }),
            );
          } else {
            setShowAlrightyModal(true);
          }
        });
      }
    }
  };

  const skipPicture = () => {
    let sampleTrees = [...inventory.sampleTrees];

    updateInventory({
      inventory_id: inventory.inventory_id,
      inventoryData: {
        sampleTrees: [...sampleTrees],
      },
    })
      .then(() => {
        dbLog.info({
          logType: LogTypes.INVENTORY,
          message: `Skipped picture for sample tree #${
            inventory.completedSampleTreesCount + 1
          } having inventory_id: ${inventory.inventory_id}`,
        });

        setShowAlrightyModal(false);
        navigation.navigate('SelectSpecies');
        updateLastScreen({ inventory_id: inventory.inventory_id, lastScreen: 'SelectSpecies' });
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.INVENTORY,
          message: `Error while skipping picture for sample tree #${
            inventory.completedSampleTreesCount + 1
          } having inventory_id: ${inventory.inventory_id}`,
          logStack: JSON.stringify(err),
        });
        console.error(
          `Error while skipping picture for sample tree #${
            inventory.completedSampleTreesCount + 1
          } having inventory_id: ${inventory.inventory_id}`,
          err,
        );
      });
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
            <Text style={[styles.accuracyModalText, { marginBottom: 16 }]}>
              {i18next.t('label.accuracy_info')}
            </Text>
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
        showSecondaryButton={true}
      />
    );
  };

  // resets the navigation stack with MainScreen => TreeInventory
  const resetRouteStack = () => {
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
            resetRouteStack();
          }
        }}
        onPressSecondaryBtn={() => {
          setIsLocationAlertShow(false);
          resetRouteStack();
        }}
        showSecondaryButton={true}
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
    if (treeType === MULTI && !isPointForMultipleTree) {
      addPolygonMarker(true);
    } else {
      addPointMarker(true);
    }
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
      <Map
        geoJSON={geoJSON}
        treeType={treeType}
        setLoader={setLoader}
        map={map}
        camera={camera}
        setIsCameraRefVisible={setIsCameraRefVisible}
        setLocation={setLocation}
        location={location}
        loader={loader}
        alphabets={alphabets}
        markerText={alphabets[activeMarkerIndex]}
        activePolygonIndex={activePolygonIndex}
      />

      <MapButtons
        location={location}
        onPressMyLocationIcon={onPressMyLocationIcon}
        setIsLocationAlertShow={setIsLocationAlertShow}
        addMarker={
          treeType === MULTI && !isPointForMultipleTree
            ? () => addPolygonMarker()
            : () => addPointMarker()
        }
        loader={loader}
      />

      <View style={styles.headerCont}>
        <SafeAreaView />
        <Header
          onBackPress={onPressBack}
          closeIcon
          headingText={
            treeType === SAMPLE
              ? i18next.t('label.sample_tree_marking_heading', {
                ongoingSampleTreeNumber: inventory?.completedSampleTreesCount + 1 || '',
                sampleTreesCount:
                    specieId &&
                    specieName &&
                    inventory?.sampleTreesCount == inventory?.completedSampleTreesCount
                      ? inventory?.sampleTreesCount + 1
                      : inventory?.sampleTreesCount || '',
              })
              : treeType === MULTI
                ? `${i18next.t('label.locate_tree_location')} ${
                  alphabets.length > 0 ? alphabets[activeMarkerIndex] : ''
                }`
                : i18next.t('label.tree_map_marking_header')
          }
          TitleRightComponent={renderAccuracyInfo}
        />
      </View>
      {renderAccuracyModal()}
      {renderConfirmationModal()}
      {renderLocationAlert()}
      <MapAlrightyModal
        treeType={treeType}
        updateScreenState={updateScreenState}
        showAlrightyModal={showAlrightyModal}
        setShowAlrightyModal={setShowAlrightyModal}
        // skipPicture={skipPicture}
        locateTree={locateTree}
        setIsCompletePolygon={setIsCompletePolygon}
        activePolygonIndex={activePolygonIndex}
        geoJSON={geoJSON}
        location={location}
        updateActiveMarkerIndex={updateActiveMarkerIndex}
        activeMarkerIndex={activeMarkerIndex}
        inventoryId={
          inventoryState.inventoryID ? inventoryState.inventoryID : inventory?.inventory_id
        }
      />
      <AlertModal
        visible={showAlert}
        heading={alertHeading}
        message={alertSubHeading}
        primaryBtnText={i18next.t('label.ok')}
        secondaryBtnText={i18next.t('label.back')}
        onPressPrimaryBtn={() => {
          setShowAlert(false);
          setShowSecondaryButton(true);
        }}
        onPressSecondaryBtn={() => {
          setShowAlert(false);
        }}
        showSecondaryButton={showSecondaryButton}
      />
    </View>
  );
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
    width: 110,
    backgroundColor: '#FFC400',
    borderRadius: 25,
  },
  gpsText: {
    textAlign: 'center',
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
    lineHeight: Typography.LINE_HEIGHT_20,
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
  bottomBtnWith: {
    width: '90%',
  },
});

const polyline = { lineWidth: 2, lineColor: Colors.BLACK };
