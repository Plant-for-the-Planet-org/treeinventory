import { CommonActions, useNavigation } from '@react-navigation/native';
import i18next from 'i18next';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import { Colors, Typography } from '_styles';
import { InventoryContext } from '../../../reducers/inventory';
import {
  completePolygon,
  getInventory,
  insertImageAtIndexCoordinate,
  insertImageSingleRegisterTree,
  polygonUpdate,
  removeLastCoord,
  updateInventory,
  updateLastScreen,
} from '../../../repositories/inventory';
import dbLog from '../../../repositories/logs';
import { LogTypes } from '../../../utils/constants';
import { copyImageAndGetData } from '../../../utils/FSInteration';
import { MULTI, ON_SITE } from '../../../utils/inventoryConstants';
import { toLetters } from '../../../utils/mapMarkingCoordinate';
import Alrighty from '../Alrighty';
import Header from '../Header';
import PrimaryButton from '../PrimaryButton';

const infographicText = [
  {
    heading: i18next.t('label.info_graphic_header_1'),
    subHeading: i18next.t('label.info_graphic_sub_header_1'),
  },
  {
    heading: i18next.t('label.info_graphic_header_2'),
    subHeading: i18next.t('label.info_graphic_sub_header_2'),
  },
  {
    heading: i18next.t('label.info_graphic_header_3'),
    subHeading: i18next.t('label.info_graphic_sub_header_3'),
  },
];

const ImageCapturing = ({
  toggleState,
  updateActiveMarkerIndex,
  activeMarkerIndex,
  isCompletePolygon,
  updateScreenState,
  inventoryType,
  isSampleTree,
}) => {
  const camera = useRef();

  const navigation = useNavigation();
  const { state } = useContext(InventoryContext);
  const [imagePath, setImagePath] = useState('');
  const [ALPHABETS, setALPHABETS] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [isAlrightyModalShow, setIsAlrightyModalShow] = useState(false);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    if (inventoryType === MULTI && !isSampleTree) {
      getInventory({ inventoryID: state.inventoryID }).then((inventoryData) => {
        setInventory(inventoryData);
        if (
          Array.isArray(inventoryData.polygons) &&
          Array.isArray(inventoryData.polygons[0]?.coordinates) &&
          inventoryData.polygons[0].coordinates[activeMarkerIndex]
        ) {
          setImagePath(inventoryData.polygons[0].coordinates[activeMarkerIndex].imageUrl);
        }
      });
      generateMarkers();
    } else {
      getInventory({ inventoryID: state.inventoryID }).then((inventoryData) => {
        setInventory(inventoryData);
        if (inventoryData.polygons[0]?.coordinates[0]?.imageUrl && !isSampleTree) {
          setImagePath(inventoryData.polygons[0].coordinates[0].imageUrl);
        }
      });
    }
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, []);

  const generateMarkers = () => {
    let array = [];
    for (var x = 1, y; x <= 130; x++) {
      y = toLetters(x);
      array.push(y);
    }
    setALPHABETS(array);
  };

  const onPressCamera = async () => {
    if (imagePath) {
      setImagePath('');
      return;
    }
    const data = await camera.current.takePictureAsync().catch((err) => {
      alert(i18next.t('label.permission_camera_message'));
      dbLog.error({
        logType: LogTypes.OTHER,
        message: `Failed to take picture ${err}`,
        logStack: JSON.stringify(err),
      });
      setImagePath('');
      return;
    });
    if (data) {
      setImagePath(data.uri);
    }
  };

  const onPressClose = () => {
    setIsAlrightyModalShow(false);
  };

  const onPressContinue = async () => {
    if (imagePath) {
      try {
        const imageUrl = await copyImageAndGetData(imagePath);
        let data = {
          inventory_id: state.inventoryID,
          imageUrl,
        };
        if (inventoryType === MULTI && !isSampleTree) {
          data.index = activeMarkerIndex;
          insertImageAtIndexCoordinate(data).then(() => {
            if (isCompletePolygon) {
              setIsAlrightyModalShow(false);
              if (inventory.locateTree === ON_SITE) {
                navigation.navigate('SampleTreesCount');
              } else {
                navigation.navigate('AdditionalDataForm');
              }
              // else {
              //   navigation.navigate('InventoryOverview');
              // }
            } else {
              updateActiveMarkerIndex(activeMarkerIndex + 1);
              toggleState();
            }
          });
        } else if (inventoryType === MULTI && isSampleTree) {
          let updatedSampleTrees = [...inventory.sampleTrees];
          updatedSampleTrees[inventory.completedSampleTreesCount].imageUrl = data.imageUrl;

          updateInventory({
            inventory_id: inventory.inventory_id,
            inventoryData: {
              sampleTrees: [...updatedSampleTrees],
            },
          })
            .then(() => {
              dbLog.info({
                logType: LogTypes.INVENTORY,
                message: `Successfully added image for sample tree #${
                  inventory.completedSampleTreesCount + 1
                } inventory_id: ${inventory.inventory_id}`,
              });

              if (inventory.sampleTrees[inventory.completedSampleTreesCount]?.specieId) {
                updateLastScreen({
                  inventory_id: inventory.inventory_id,
                  lastScreen: 'SelectSpecies',
                });
                navigation.navigate('SelectSpecies');
              } else {
                updateLastScreen({
                  inventory_id: inventory.inventory_id,
                  lastScreen: 'SpecieSampleTree',
                });
                navigation.navigate('SpecieSampleTree');
              }
            })
            .catch((err) => {
              dbLog.error({
                logType: LogTypes.INVENTORY,
                message: `Failed to add image for sample tree #${
                  inventory.completedSampleTreesCount + 1
                } inventory_id: ${inventory.inventory_id}`,
                logStack: JSON.stringify(err),
              });
              console.error(
                `Failed to add image for sample tree #${
                  inventory.completedSampleTreesCount + 1
                } inventory_id: ${inventory.inventory_id}`,
                err,
              );
            });
        } else {
          updateLastScreen({ inventory_id: inventory.inventory_id, lastScreen: 'SelectSpecies' });
          insertImageSingleRegisterTree(data).then(() => {
            navigation.navigate('SelectSpecies', {
              inventory: inventory,
              visible: true,
            });
          });
        }
      } catch (err) {
        console.error('error while saving file', err);
      }
    } else {
      alert(i18next.t('label.image_capturing_required'));
    }
  };

  const onBackPress = () => {
    if (inventoryType === MULTI && !isSampleTree) {
      removeLastCoord({ inventory_id: state.inventoryID }).then(() => {
        toggleState();
      });
    } else {
      updateScreenState('MapMarking');
    }
  };

  const onPressCompletePolygon = async () => {
    const imageUrl = await copyImageAndGetData(imagePath);
    let data = {
      inventory_id: state.inventoryID,
      imageUrl,
    };
    data.index = activeMarkerIndex;

    insertImageAtIndexCoordinate(data).then(() => {
      polygonUpdate({ inventory_id: state.inventoryID }).then(() => {
        completePolygon({
          inventory_id: state.inventoryID,
          locateTree: inventory.locateTree,
        }).then(() => {
          setIsAlrightyModalShow(false);
          // if (inventory.locateTree === ON_SITE) {
          // resets the navigation stack with MainScreen => TreeInventory => SampleTreesCount
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
          // } else {
          // resets the navigation stack with MainScreen => TreeInventory => TotalTreesSpecies
          // navigation.dispatch(
          //   CommonActions.reset({
          //     index: 2,
          //     routes: [
          //       { name: 'MainScreen' },
          //       { name: 'TreeInventory' },
          //       { name: 'TotalTreesSpecies' },
          //     ],
          //   }),
          // );
          // }
        });
      });
    });
  };

  const renderAlrightyModal = () => {
    let infoIndex = activeMarkerIndex > 2 ? 2 : activeMarkerIndex;
    const { heading, subHeading } = infographicText[infoIndex];
    return (
      <Modal animationType={'slide'} visible={isAlrightyModalShow}>
        <View style={styles.mainContainer}>
          <Alrighty
            coordsLength={activeMarkerIndex + 1}
            onPressContinue={onPressContinue}
            onPressWhiteButton={onPressCompletePolygon}
            onPressClose={onPressClose}
            heading={heading}
            subHeading={subHeading}
          />
        </View>
      </Modal>
    );
  };

  const onClickOpenSettings = async () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    }
  };

  return (
    <SafeAreaView style={styles.container} fourceInset={{ bottom: 'always' }}>
      <View style={styles.screenMargin}>
        <Header
          onBackPress={onBackPress}
          headingText={
            inventoryType === MULTI && !isSampleTree
              ? `${i18next.t('label.locate_tree_location')} ${ALPHABETS[activeMarkerIndex]}`
              : i18next.t('label.image_capturing_header')
          }
          subHeadingText={i18next.t('label.image_capturing_sub_header')}
        />
      </View>
      <View style={styles.container}>
        <View style={styles.container}>
          {imagePath ? (
            <Image source={{ uri: imagePath }} style={styles.container} />
          ) : (
            <View style={styles.cameraContainer}>
              <RNCamera
                ratio={'1:1'}
                captureAudio={false}
                ref={camera}
                style={styles.container}
                notAuthorizedView={
                  <View
                    style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={styles.message}>
                      {i18next.t('label.permission_camera_message')}
                    </Text>
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
                }}
              />
            </View>
          )}
        </View>
      </View>
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
            onPress={
              inventoryType === MULTI && !isSampleTree
                ? () => setIsAlrightyModalShow(true)
                : onPressContinue
            }
            btnText={i18next.t('label.continue')}
            halfWidth={true}
          />
        ) : (
          []
        )}
      </View>
      {inventoryType === MULTI && !isSampleTree && renderAlrightyModal()}
    </SafeAreaView>
  );
};
export default ImageCapturing;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  screenMargin: {
    marginHorizontal: 25,
  },
  bottomBtnsContainer: {
    flexDirection: 'row',
    marginHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
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
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
  },
  cameraIconCont: {
    width: 55,
    height: 55,
    borderColor: Colors.LIGHT_BORDER_COLOR,
    borderWidth: 1,
    backgroundColor: Colors.WHITE,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  bottomBtnsWidth: {
    width: '100%',
  },
});
