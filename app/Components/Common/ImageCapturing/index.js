import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Header, PrimaryButton, Alrighty } from '../';
import { Colors, Typography } from '_styles';
import {
  insertImageAtIndexCoordinate,
  polygonUpdate,
  getCoordByIndex,
  removeLastCoord,
  completePolygon,
  insertImageSingleRegisterTree,
  getInventory,
} from '../../../actions';
import { store } from '../../../actions/store';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RNCamera } from 'react-native-camera';
// import { APLHABETS } from '../../Utils/index';
import { toLetters } from '../../../Utils/mapMarkingCoordinate';
import i18next from 'i18next';
import RNFS from 'react-native-fs';

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
}) => {
  const camera = useRef();

  const navigation = useNavigation();
  const { state } = useContext(store);
  const [imagePath, setImagePath] = useState('');
  const [APLHABETS, setAPLHABETS] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [isAlrightyModalShow, setIsAlrightyModalShow] = useState(false);

  useEffect(() => {
    if (inventoryType === 'multiple') {
      getCoordByIndex({ inventory_id: state.inventoryID, index: activeMarkerIndex }).then(
        ({ coordsLength, coord }) => {
          if (coord.imageUrl) {
            setImagePath(coord.imageUrl);
          }
        },
      );
      generateMarkers();
    } else {
      getInventory({ inventoryID: state.inventoryID }).then((inventory) => {
        inventory.species = Object.values(inventory.species);
        setInventory(inventory);
        if (inventory.polygons[0]?.coordinates[0]?.imageUrl) {
          setImagePath(inventory.polygons[0].coordinates[0].imageUrl);
        }
      });
    }
  }, []);

  const generateMarkers = () => {
    let array = [];
    for (var x = 1, y; x <= 130; x++) {
      y = toLetters(x);
      array.push(y);
    }
    setAPLHABETS(array);
  };

  const copyImageAndGetData = async () => {
    // splits and stores the image path directories
    let splittedPath = imagePath.split('/');
    // splits and stores the file name and extension which is present on last index
    let fileName = splittedPath.pop();
    // splits and stores the file parent directory which is present on last index after pop
    const inbox = splittedPath.pop();
    // splits and stores the file extension
    const fileExtension = fileName.split('.').pop();
    // splits and stores the file name
    fileName = fileName.split('.')[0];

    // stores the destination path in which image should be stored
    const outputPath = `${RNFS.DocumentDirectoryPath}/${fileName}.${fileExtension}`;

    // stores the path from which the image should be copied
    const inputPath = `${RNFS.CachesDirectoryPath}/${inbox}/${fileName}.${fileExtension}`;
    try {
      // copies the image to destination folder
      await RNFS.copyFile(inputPath, outputPath);
      let data = {
        inventory_id: state.inventoryID,
        imageUrl: Platform.OS === 'android' ? `file://${outputPath}` : outputPath,
      };
      return data;
    } catch (err) {
      console.error('error while saving file', err);
    }
  };

  const onPressCamera = async () => {
    if (imagePath) {
      setImagePath('');
      return;
    }
    const options = { quality: 0.5 };
    const data = await camera.current.takePictureAsync(options);
    setImagePath(data.uri);
  };

  const onPressClose = () => {
    setIsAlrightyModalShow(false);
  };

  const onPressContinue = async () => {
    if (imagePath) {
      try {
        let data = await copyImageAndGetData();
        if (inventoryType === 'multiple') {
          data.index = activeMarkerIndex;
          insertImageAtIndexCoordinate(data).then(() => {
            if (isCompletePolygon) {
              setIsAlrightyModalShow(false);
              navigation.navigate('InventoryOverview');
            } else {
              updateActiveMarkerIndex(activeMarkerIndex + 1);
              toggleState();
            }
          });
        } else {
          insertImageSingleRegisterTree(data).then(() => {
            navigation.navigate('SelectSpecies', {
              species: inventory.species,
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
    if (inventoryType === 'multiple') {
      removeLastCoord({ inventory_id: state.inventoryID }).then(() => {
        toggleState();
      });
    } else {
      updateScreenState('MapMarking');
    }
  };

  const onPressCompletePolygon = async () => {
    let data = await copyImageAndGetData();
    data.index = activeMarkerIndex;

    insertImageAtIndexCoordinate(data).then(() => {
      polygonUpdate({ inventory_id: state.inventoryID }).then(() => {
        completePolygon({ inventory_id: state.inventoryID }).then(() => {
          setIsAlrightyModalShow(false);
          navigation.navigate('InventoryOverview');
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

  return (
    <SafeAreaView style={styles.container} fourceInset={{ bottom: 'always' }}>
      <View style={styles.screenMargin}>
        <Header
          onBackPress={onBackPress}
          headingText={
            inventoryType === 'multiple'
              ? `Location ${APLHABETS[activeMarkerIndex]}`
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
        <TouchableOpacity
          onPress={onPressCamera}
          style={styles.cameraIconContainer}
          accessibilityLabel={inventoryType === 'multiple' ? 'Camera' : 'Register Tree Camera'}
          testID={inventoryType === 'multiple' ? 'camera_icon' : 'register_tree_camera'}>
          <View style={styles.cameraIconCont}>
            <Ionicons name={imagePath ? 'md-camera-reverse' : 'md-camera'} size={25} />
          </View>
        </TouchableOpacity>
      </View>
      <View
        style={[
          styles.bottomBtnsContainer,
          inventoryType === 'single' ? { justifyContent: 'space-between' } : {},
        ]}>
        {inventoryType === 'single' && (
          <PrimaryButton
            onPress={onBackPress}
            btnText={i18next.t('label.back')}
            theme={'white'}
            halfWidth
          />
        )}
        <PrimaryButton
          disabled={imagePath ? false : true}
          onPress={
            inventoryType === 'multiple' ? () => setIsAlrightyModalShow(true) : onPressContinue
          }
          btnText={i18next.t('label.continue')}
          style={inventoryType === 'multiple' ? styles.bottomBtnsWidth : {}}
          halfWidth={inventoryType === 'single'}
        />
      </View>
      {inventoryType === 'multiple' && renderAlrightyModal()}
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