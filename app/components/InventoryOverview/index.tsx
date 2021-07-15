import MapboxGL from '@react-native-mapbox-gl/maps';
import { CommonActions } from '@react-navigation/routers';
import i18next from 'i18next';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  ImageBackground,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Share from 'react-native-share';
import { SvgXml } from 'react-native-svg';
import { setSkipToInventoryOverview } from '../../actions/inventory';
import { marker_png, plus_icon, two_trees } from '../../assets';
import { InventoryContext } from '../../reducers/inventory';
import {
  addAppMetadata,
  changeInventoryStatus,
  deleteInventory,
  getInventory,
  updateLastScreen,
  updatePlantingDate,
} from '../../repositories/inventory';
import { getProjectById } from '../../repositories/projects';
import { getUserDetails } from '../../repositories/user';
import { Colors, Typography } from '../../styles';
import { ALPHABETS } from '../../utils';
import { toBase64 } from '../../utils/base64';
import getGeoJsonData from '../../utils/convertInventoryToGeoJson';
import { getNotSampledSpecies } from '../../utils/getSampleSpecies';
import {
  INCOMPLETE,
  INCOMPLETE_SAMPLE_TREE,
  OFF_SITE,
  ON_SITE,
  PENDING_DATA_UPLOAD,
  SYNCED,
} from '../../utils/inventoryConstants';
import { askExternalStoragePermission } from '../../utils/permissions';
import { Header, InventoryCard, Label, LargeButton, PrimaryButton } from '../Common';
import AdditionalDataOverview from '../Common/AdditionalDataOverview';
import AlertModal from '../Common/AlertModal';
import SampleTreesReview from '../SampleTrees/SampleTreesReview';

const InventoryOverview = ({ navigation }: any) => {
  const cameraRef = useRef(null);

  const { state, dispatch } = useContext(InventoryContext);

  const [inventory, setInventory] = useState<any>(null);
  const [locationTitle, setLocationTitle] = useState<string>('');
  const [selectedLOC, setSelectedLOC] = useState<any>(null);
  const [isLOCModalOpen, setIsLOCModalOpen] = useState<boolean>(false);
  const [showDate, setShowDate] = useState<boolean>(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showProject, setShowProject] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [showAddSampleTrees, setShowAddSampleTrees] = useState(false);
  const [showNoSpeciesAlert, setShowNoSpeciesAlert] = useState(false);
  const [showLessSampleTreesAlert, setShowLessSampleTreesAlert] = useState(false);
  const [countryCode, setCountryCode] = useState<string>('');

  useEffect(() => {
    getUserDetails().then((userDetails) => {
      if (userDetails) {
        setCountryCode(userDetails.country || '');
        const stringifiedUserDetails = JSON.parse(JSON.stringify(userDetails));
        if (stringifiedUserDetails?.type === 'tpo') {
          setShowProject(true);
        } else {
          setShowProject(false);
        }
      }
    });

    const unsubscribeFocus = navigation.addListener('focus', () => {
      BackHandler.addEventListener('hardwareBackPress', hardBackHandler);
      initialState();
      let data = { inventory_id: state.inventoryID, lastScreen: 'InventoryOverview' };
      updateLastScreen(data);
    });
    const unsubscribeBlur = navigation.addListener('focus', () => {
      BackHandler.removeEventListener('hardwareBackPress', hardBackHandler);
    });
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      BackHandler.removeEventListener('hardwareBackPress', hardBackHandler);
    };
  }, []);

  const hardBackHandler = () => {
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
    return true;
  };

  const initialState = () => {
    if (state.inventoryID) {
      getInventory({ inventoryID: state.inventoryID }).then(async (inventoryData) => {
        setInventory(inventoryData);

        if (inventoryData.projectId) {
          const project: any = await getProjectById(inventoryData.projectId);
          if (project) {
            setSelectedProjectName(project.name);
            setSelectedProjectId(project.id);
          }
        } else {
          setSelectedProjectName('');
          setSelectedProjectId('');
        }
      });
    }
  };

  const renderPolygon = (polygons: any, locationType: any) => {
    return (
      <FlatList
        keyboardShouldPersistTaps={'always'}
        data={polygons}
        renderItem={({ item, index }) => {
          return (
            <View>
              <Label
                leftText={i18next.t('label.inventory_overview_polygon_left_text', {
                  locationType,
                })}
                rightText={''}
              />
              <FlatList
                data={item.coordinates}
                renderItem={({ item: oneCoordinate, index }) => {
                  let normalizeData = {
                    title: i18next.t('label.inventory_overview_title_coordinates', {
                      alphabetindex: ALPHABETS[index],
                    }),
                    subHeading: `${oneCoordinate.latitude.toFixed(
                      5,
                    )}˚N,${oneCoordinate.longitude.toFixed(7)}˚E`,
                    date: i18next.t('label.inventory_overview_view_location'),
                    imageURL: oneCoordinate.imageUrl,
                    cdnImageUrl: oneCoordinate.cdnImageUrl,
                    index: index,
                    countryCode: countryCode,
                  };
                  return (
                    <InventoryCard
                      data={normalizeData}
                      activeBtn={true}
                      onPressActiveBtn={onPressViewLOC}
                    />
                  );
                }}
                keyExtractor={(item, index) => `location-${index}`}
              />
            </View>
          );
        }}
      />
    );
  };

  const onPressViewLOC = (index: number) => {
    let selectedCoords = inventory.polygons[0].coordinates[index];
    let normalCoords: any = [selectedCoords.longitude, selectedCoords.latitude];
    setSelectedLOC(normalCoords);
    setLocationTitle(ALPHABETS[index]);
    setIsLOCModalOpen(!isLOCModalOpen);
  };

  const addAppDataAndSave = () => {
    addAppMetadata({ inventory_id: state.inventoryID })
      .then(() => {
        let data = { inventory_id: state.inventoryID, status: PENDING_DATA_UPLOAD };
        changeInventoryStatus(data, dispatch).then(() => {
          navigation.navigate('TreeInventory');
        });
      })
      .catch(() => {
        setIsError(true);
        setShowAlert(true);
      });
  };

  const onPressSave = ({ forceContinue }: { forceContinue?: boolean }) => {
    if (inventory.species.length > 0) {
      if (inventory.locateTree === OFF_SITE) {
        addAppDataAndSave();
      } else if (inventory?.sampleTrees && inventory?.sampleTrees?.length > 4) {
        let notSampledSpecies = getNotSampledSpecies(inventory);
        if (notSampledSpecies?.size == 0 || forceContinue) {
          addAppDataAndSave();
        } else if (forceContinue !== undefined && !forceContinue) {
          setSkipToInventoryOverview(true)(dispatch);
          navigation.navigate('SpecieSampleTree', { notSampledSpecies });
        } else {
          setShowAddSampleTrees(true);
        }
      } else {
        setShowLessSampleTreesAlert(true);
      }
    } else {
      alert(i18next.t('label.inventory_overview_select_species'));
    }
  };

  const focusMarker = () => {
    cameraRef?.current?.setCamera({
      centerCoordinate: selectedLOC,
      zoomLevel: 18,
      animationDuration: 1000,
    });
  };

  const onBackPress = () => {
    // * FOR LOCATION MODAL
    setIsLOCModalOpen(!isLOCModalOpen);
    setSelectedLOC(null);
  };

  const renderViewLOCModal = () => {
    return (
      <Modal transparent visible={isLOCModalOpen} animationType={'slide'}>
        <SafeAreaView />
        <View style={styles.mainContainer}>
          <View style={styles.screenMargin}>
            <Header
              onBackPress={onBackPress}
              closeIcon
              headingText={i18next.t('label.inventory_overview_view_loc_modal_header', {
                locationTitle,
              })}
            />
          </View>
          <MapboxGL.MapView onDidFinishRenderingMapFully={focusMarker} style={styles.cont}>
            <MapboxGL.Camera ref={cameraRef} />
            {selectedLOC && (
              <MapboxGL.PointAnnotation id={'markerContainer1'} coordinate={selectedLOC}>
                <ImageBackground
                  source={marker_png}
                  style={styles.markerContainer}
                  resizeMode={'cover'}>
                  <Text style={styles.markerText}>
                    {i18next.t('label.inventory_overview_loc', { locationTitle })}
                  </Text>
                </ImageBackground>
              </MapboxGL.PointAnnotation>
            )}
          </MapboxGL.MapView>
        </View>
      </Modal>
    );
  };

  const onPressExportJSON = async () => {
    const exportGeoJSONFile = () => {
      if (inventory.polygons.length > 0) {
        const geoJSON = getGeoJsonData(inventory);

        const options = {
          url: 'data:application/json;base64,' + toBase64(JSON.stringify(geoJSON)),
          message: i18next.t('label.inventory_overview_export_json_message'),
          title: i18next.t('label.inventory_overview_export_json_title'),
          filename: `Tree Mapper GeoJSON ${inventory.inventory_id}`,
          saveToFiles: true,
        };
        Share.open(options)
          .then(() => {
            alert(i18next.t('label.inventory_overview_export_json_success'));
          })
          .catch((err) => {
            if (err?.error?.code != 'ECANCELLED500') {
              // iOS cancel button pressed
              alert(i18next.t('label.inventory_overview_export_json_error'));
            }
          });
      }
    };
    const permissionResult = await askExternalStoragePermission();
    if (permissionResult) {
      exportGeoJSONFile();
    }
  };

  const onChangeDate = (selectedDate: any) => {
    setShowDate(false);
    setInventory({ ...inventory, plantation_date: selectedDate });
    updatePlantingDate({
      inventory_id: state.inventoryID,
      plantation_date: selectedDate,
    });
  };

  const renderDatePicker = () => {
    const handleConfirm = (data: any) => onChangeDate(data);
    const hideDatePicker = () => setShowDate(false);

    return (
      showDate && (
        <DateTimePickerModal
          headerTextIOS={i18next.t('label.inventory_overview_pick_a_date')}
          cancelTextIOS={i18next.t('label.inventory_overview_cancel')}
          confirmTextIOS={i18next.t('label.inventory_overview_confirm')}
          isVisible={showDate}
          maximumDate={new Date()}
          minimumDate={new Date(2006, 0, 1)}
          testID="dateTimePicker"
          timeZoneOffsetInMinutes={0}
          date={new Date(inventory.plantation_date)}
          mode={'date'}
          is24Hour={true}
          display="default"
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
        />
      )
    );
  };

  const renderAddSpeciesButton = (status: string) => {
    return (
      (status === INCOMPLETE || status === INCOMPLETE_SAMPLE_TREE) && (
        <TouchableOpacity
          onPress={handleSelectSpecies}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            backgroundColor: '#F0F0F0',
            borderRadius: 10,
            marginVertical: 10,
          }}
          accessibilityLabel="Species Button"
          testID="species_btn">
          <Text style={styles.plantSpeciesText}>
            {i18next.t('label.inventory_overview_add_species')}
          </Text>
          <View>
            <SvgXml xml={plus_icon} />
          </View>
          <View>
            <SvgXml xml={two_trees} />
          </View>
        </TouchableOpacity>
      )
    );
  };

  const renderAddSampleTreeButton = (inventoryStatus: string) => {
    return (
      (inventoryStatus === INCOMPLETE || inventoryStatus === INCOMPLETE_SAMPLE_TREE) && (
        <TouchableOpacity
          onPress={addSampleTree}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            backgroundColor: '#F0F0F0',
            borderRadius: 10,
            marginVertical: 10,
          }}
          accessibilityLabel="Species Button"
          testID="species_btn">
          <Text style={styles.plantSpeciesText}>
            {i18next.t('label.inventory_overview_add_sample_tree')}
          </Text>
          <View>
            <SvgXml xml={plus_icon} />
          </View>
          <View>
            <SvgXml xml={two_trees} />
          </View>
        </TouchableOpacity>
      )
    );
  };

  const addSampleTree = () => {
    if (inventory.species.length === 0) {
      setShowNoSpeciesAlert(true);
    } else {
      let data = {
        inventory_id: inventory.inventory_id,
        lastScreen: 'RecordSampleTrees',
      };
      updateLastScreen(data);
      navigation.dispatch(
        CommonActions.reset({
          index: 2,
          routes: [
            { name: 'MainScreen' },
            { name: 'TreeInventory' },
            { name: 'RecordSampleTrees' },
          ],
        }),
      );
    }
  };

  const onPressDate = (status: string) => {
    if (status === INCOMPLETE && inventory.locateTree === OFF_SITE) {
      setShowDate(true);
    }
  };

  const handleSelectSpecies = () => {
    navigation.navigate('TotalTreesSpecies', {
      retainNavigationStack: true,
      redirectToOverview: true,
    });
  };

  const handleDeleteInventory = () => {
    deleteInventory({ inventory_id: inventory.inventory_id }, dispatch)
      .then(() => {
        setShowAlert(!showAlert);
        navigation.navigate('TreeInventory');
      })
      .catch((err) => {
        console.error(err);
      });
  };

  let locationType;
  let isSingleCoordinate, locateType;
  if (inventory) {
    isSingleCoordinate = inventory.polygons[0].coordinates.length == 1;
    locationType = isSingleCoordinate
      ? i18next.t('label.tree_inventory_point')
      : i18next.t('label.tree_inventory_polygon');
    locateType =
      inventory.locateTree === OFF_SITE
        ? i18next.t('label.tree_inventory_off_site')
        : i18next.t('label.tree_inventory_on_site');
  }

  let status = inventory ? inventory.status : PENDING_DATA_UPLOAD;
  return (
    <SafeAreaView style={styles.mainContainer}>
      {renderViewLOCModal()}
      <View style={styles.container}>
        {inventory !== null ? (
          <View style={styles.cont}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps={'always'}>
              <Header
                closeIcon
                headingText={i18next.t('label.inventory_overview_header_text')}
                subHeadingText={i18next.t('label.inventory_overview_sub_header')}
                onBackPress={() => navigation.navigate('TreeInventory')}
                rightText={
                  status == INCOMPLETE_SAMPLE_TREE ||
                  status == INCOMPLETE ||
                  status == PENDING_DATA_UPLOAD
                    ? i18next.t('label.tree_review_delete')
                    : []
                }
                onPressFunction={() => setShowAlert(true)}
              />
              <Label
                leftText={i18next.t('label.inventory_overview_left_text')}
                rightText={i18next.t('label.inventory_overview_date', {
                  date: new Date(inventory.plantation_date),
                })}
                onPressRightText={() => onPressDate(status)}
                rightTextStyle={
                  status === INCOMPLETE || status === INCOMPLETE_SAMPLE_TREE
                    ? { color: Colors.PRIMARY }
                    : { color: Colors.TEXT_COLOR }
                }
              />
              {!isSingleCoordinate && (
                <Label leftText={`${locateType} Registration`} rightText={''} />
              )}
              {showProject ? (
                <Label
                  leftText={i18next.t('label.tree_review_project')}
                  rightText={
                    selectedProjectName
                      ? selectedProjectName
                      : i18next.t('label.tree_review_unassigned')
                  }
                  onPressRightText={() =>
                    status === INCOMPLETE || status === INCOMPLETE_SAMPLE_TREE
                      ? navigation.navigate('SelectProject', { selectedProjectId })
                      : {}
                  }
                  rightTextStyle={
                    status === INCOMPLETE || status === INCOMPLETE_SAMPLE_TREE
                      ? { color: Colors.PRIMARY }
                      : { color: Colors.TEXT_COLOR }
                  }
                />
              ) : (
                []
              )}

              <Label
                leftText={i18next.t('label.inventory_overview_left_text_planted_species')}
                rightText={
                  status === INCOMPLETE || status === INCOMPLETE_SAMPLE_TREE
                    ? i18next.t('label.edit')
                    : ''
                }
                onPressRightText={handleSelectSpecies}
              />
              <FlatList
                data={inventory.species}
                renderItem={({ item }) => (
                  <Label
                    leftText={i18next.t('label.inventory_overview_loc_left_text', { item })}
                    rightText={i18next.t('label.inventory_overview_loc_right_text', { item })}
                    style={{ marginVertical: 10 }}
                    leftTextStyle={{ paddingLeft: 20, fontFamily: Typography.FONT_FAMILY_REGULAR }}
                    rightTextStyle={{ color: Colors.TEXT_COLOR }}
                  />
                )}
              />
              {inventory && inventory.species.length <= 0 ? renderAddSpeciesButton(status) : null}
              {renderPolygon(inventory.polygons, locationType)}
              {inventory?.sampleTrees.length > 0 && (
                <SampleTreesReview
                  sampleTrees={inventory?.sampleTrees}
                  navigation={navigation}
                  totalSampleTrees={inventory.sampleTreesCount}
                  inventoryDispatch={dispatch}
                />
              )}
              {inventory?.completedSampleTreesCount == 0 && inventory?.locateTree === ON_SITE
                ? renderAddSampleTreeButton(status)
                : null}
              <LargeButton
                onPress={onPressExportJSON}
                heading={i18next.t('label.inventory_overview_loc_export_json')}
                active={false}
                medium
              />
              <Label leftText={i18next.t('label.additional_data')} rightText={''} />

              <AdditionalDataOverview data={inventory} />
            </ScrollView>
            {(inventory.status === INCOMPLETE || inventory.status === INCOMPLETE_SAMPLE_TREE) && (
              <View style={styles.bottomButtonContainer}>
                <PrimaryButton
                  onPress={() => onPressSave({})}
                  btnText={i18next.t('label.inventory_overview_loc_save')}
                  style={{ marginTop: 10 }}
                />
              </View>
            )}
          </View>
        ) : null}
      </View>
      <AlertModal
        visible={showAlert}
        heading={
          isError
            ? i18next.t('label.something_went_wrong')
            : i18next.t('label.tree_inventory_alert_header')
        }
        message={
          isError
            ? i18next.t('label.error_saving_inventory')
            : status === SYNCED
            ? i18next.t('label.tree_review_delete_uploaded_registration')
            : i18next.t('label.tree_review_delete_not_yet_uploaded_registration')
        }
        primaryBtnText={isError ? i18next.t('label.ok') : i18next.t('label.tree_review_delete')}
        secondaryBtnText={i18next.t('label.alright_modal_white_btn')}
        onPressPrimaryBtn={isError ? () => setShowAlert(!showAlert) : handleDeleteInventory}
        onPressSecondaryBtn={() => setShowAlert(!showAlert)}
        showSecondaryButton={!isError}
      />
      <AlertModal
        visible={showAddSampleTrees}
        heading={i18next.t('label.add_more_sample_trees')}
        message={i18next.t('label.recommend_at_least_one_sample')}
        primaryBtnText={i18next.t('label.continue')}
        secondaryBtnText={i18next.t('label.skip')}
        onPressPrimaryBtn={() => {
          setShowAddSampleTrees(false);
          onPressSave({ forceContinue: false });
        }}
        onPressSecondaryBtn={() => {
          setShowAddSampleTrees(false);
          onPressSave({ forceContinue: true });
        }}
        showSecondaryButton={true}
      />
      <AlertModal
        visible={showNoSpeciesAlert}
        heading={i18next.t('label.no_species_found')}
        message={i18next.t('label.at_least_one_species')}
        primaryBtnText={i18next.t('label.ok')}
        onPressPrimaryBtn={() => setShowNoSpeciesAlert(false)}
      />
      <AlertModal
        visible={showLessSampleTreesAlert}
        heading={i18next.t('label.need_more_sample_trees')}
        message={i18next.t('label.at_least_five_sample_trees')}
        primaryBtnText={i18next.t('label.ok')}
        onPressPrimaryBtn={() => setShowLessSampleTreesAlert(false)}
      />
      {renderDatePicker()}
    </SafeAreaView>
  );
};
export default InventoryOverview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    backgroundColor: Colors.WHITE,
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cont: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.WHITE,
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
  screenMargin: {
    marginHorizontal: 25,
  },
  plantSpeciesText: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_20,
    lineHeight: Typography.LINE_HEIGHT_24,
    color: Colors.TEXT_COLOR,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
  },
  detailText: {
    fontSize: Typography.FONT_SIZE_16,
    color: Colors.TEXT_COLOR,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
});
