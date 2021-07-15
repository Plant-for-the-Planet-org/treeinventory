import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import i18next from 'i18next';
import React, { useContext, useEffect, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RNFS from 'react-native-fs';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import FIcon from 'react-native-vector-icons/Fontisto';
import MIcon from 'react-native-vector-icons/MaterialIcons';
import { APIConfig } from '../../actions/Config';
import { deleteInventoryId, setSkipToInventoryOverview } from '../../actions/inventory';
import { InventoryContext } from '../../reducers/inventory';
import {
  addAppMetadata,
  changeInventoryStatus,
  deleteInventory,
  getInventory,
  updateLastScreen,
  updatePlantingDate,
  updateSingleTreeSpecie,
  updateSpecieDiameter,
  updateSpecieHeight,
  updateTreeTag,
} from '../../repositories/inventory';
import { getProjectById } from '../../repositories/projects';
import { getUserDetails, getUserInformation } from '../../repositories/user';
import { Colors, Typography } from '../../styles';
import {
  cmToInch,
  DBHInMeter,
  diameterMaxCm,
  diameterMaxInch,
  diameterMinCm,
  diameterMinInch,
  footToMeter,
  heightMaxFoot,
  heightMaxM,
  heightMinFoot,
  heightMinM,
  inchToCm,
  meterToFoot,
  nonISUCountries,
} from '../../utils/constants';
import {
  INCOMPLETE,
  INCOMPLETE_SAMPLE_TREE,
  MULTI,
  ON_SITE,
  PENDING_DATA_UPLOAD,
  SINGLE,
  SYNCED,
} from '../../utils/inventoryConstants';
import { updateSampleTree } from '../../utils/updateSampleTree';
import { Header, InputModal, Label, PrimaryButton } from '../Common';
import AdditionalDataOverview from '../Common/AdditionalDataOverview';
import AlertModal from '../Common/AlertModal';
import SpecieSampleTree from '../SpecieSampleTree';
import ManageSpecies from '../ManageSpecies';
import getIsMeasurementRatioCorrect from '../../utils/calculateHeighDiameterRatio';
const { protocol, cdnUrl } = APIConfig;

type RootStackParamList = {
  SingleTreeOverview: { isSampleTree: boolean; sampleTreeIndex: number; totalSampleTrees: number };
};

type SingleTreeOverviewScreenRouteProp = RouteProp<RootStackParamList, 'SingleTreeOverview'>;

const SingleTreeOverview = () => {
  const { state: inventoryState, dispatch } = useContext(InventoryContext);

  const [inventory, setInventory] = useState<any>();
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
  const [isShowDate, setIsShowDate] = useState<boolean>(false);
  const [plantationDate, setPlantationDate] = useState<Date>(new Date());
  const [specieText, setSpecieText] = useState<string>('');
  const [specieDiameter, setSpecieDiameter] = useState<string>('');
  const [specieEditDiameter, setSpecieEditDiameter] = useState<string>('');
  const [specieHeight, setSpecieHeight] = useState<string>('');
  const [specieEditHeight, setSpecieEditHeight] = useState<string>('');
  const [editedTagId, setEditedTagId] = useState<string>('');
  const [tagId, setTagId] = useState<string>('');
  const [locateTree, setLocateTree] = useState(null);
  const [editEnable, setEditEnable] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('');
  const [isShowManageSpecies, setIsShowManageSpecies] = useState<boolean>(false);
  const [registrationType, setRegistrationType] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);
  const [showInputError, setShowInputError] = useState<boolean>(false);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showProject, setShowProject] = useState<boolean>(false);
  const [isSampleTree, setIsSampleTree] = useState(false);
  const [sampleTreeIndex, setSampleTreeIndex] = useState<number>();
  const [totalSampleTrees, setTotalSampleTrees] = useState<number>();
  const [showIncorrectRatioAlert, setShowIncorrectRatioAlert] = useState<boolean>(false);
  const [diameterLabel, setDiameterLabel] = useState<string>(
    i18next.t('label.measurement_basal_diameter'),
  );
  const [isIncompleteSampleTree, setIsIncompleteSampleTree] = useState<boolean>(false);

  const [inputErrorMessage, setInputErrorMessage] = useState<string>(
    i18next.t('label.tree_inventory_input_error_message'),
  );

  const [isError, setIsError] = useState<boolean>(false);

  const navigation = useNavigation();
  const route: SingleTreeOverviewScreenRouteProp = useRoute();

  useEffect(() => {
    if (route?.params?.isSampleTree || route?.params?.totalSampleTrees) {
      setSampleTreeIndex(route.params.sampleTreeIndex);
      setTotalSampleTrees(route.params.totalSampleTrees);
      setIsIncompleteSampleTree(
        inventory?.sampleTrees[route.params.sampleTreeIndex].status === INCOMPLETE,
      );
    }
  }, [route.params]);

  useEffect(() => {
    if (!route?.params?.isSampleTree) {
      let data = { inventory_id: inventoryState.inventoryID, lastScreen: 'SingleTreeOverview' };
      updateLastScreen(data);
    }
    getUserDetails().then((userDetails) => {
      if (userDetails) {
        const stringifiedUserDetails = JSON.parse(JSON.stringify(userDetails));
        if (stringifiedUserDetails?.type === 'tpo') {
          setShowProject(true);
        } else {
          setShowProject(false);
        }
      }
    });
    const unsubscribe = navigation.addListener('focus', () => {
      if (inventoryState.inventoryID) {
        fetchAndUpdateInventoryDetails();
      }
    });

    return unsubscribe;
  }, [isShowManageSpecies, navigation]);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', onPressSave);
    return BackHandler.removeEventListener('hardwareBackPress', onPressSave);
  }, []);

  const fetchAndUpdateInventoryDetails = () => {
    getInventory({ inventoryID: inventoryState.inventoryID }).then((inventoryData) => {
      setInventory(inventoryData);
      setStatus(inventoryData.status);
      setLocateTree(inventoryData.locateTree);
      setRegistrationType(inventoryData.treeType);

      getUserInformation().then(async (data) => {
        setCountryCode(data.country);
        if (
          inventoryData.status === INCOMPLETE_SAMPLE_TREE ||
          (route?.params?.isSampleTree &&
            (route?.params?.sampleTreeIndex === 0 || route?.params?.sampleTreeIndex))
        ) {
          const sampleTreeCount =
            inventoryData.completedSampleTreesCount === inventoryData.sampleTreesCount
              ? inventoryData.completedSampleTreesCount - 1
              : inventoryData.completedSampleTreesCount;

          const index = route?.params?.isSampleTree
            ? route?.params?.sampleTreeIndex
            : sampleTreeCount;

          const currentSampleTree = inventoryData.sampleTrees[index];
          const diameter = nonISUCountries.includes(data.country)
            ? Math.round(currentSampleTree.specieDiameter * cmToInch * 1000) / 1000
            : currentSampleTree.specieDiameter;
          const height = nonISUCountries.includes(data.country)
            ? Math.round(currentSampleTree.specieHeight * meterToFoot * 1000) / 1000
            : currentSampleTree.specieHeight;

          updateDiameterLabel(currentSampleTree.specieHeight);

          setSampleTreeIndex(index);
          setIsIncompleteSampleTree(currentSampleTree.status === INCOMPLETE);
          setIsSampleTree(true);
          setSpecieText(currentSampleTree.specieName);
          setSpecieDiameter(diameter);
          setSpecieEditDiameter(diameter);
          setSpecieHeight(height);
          setSpecieEditHeight(height);
          setPlantationDate(currentSampleTree.plantationDate);
          setTagId(currentSampleTree.tagId);
          setEditedTagId(currentSampleTree.tagId);
          setTotalSampleTrees(inventoryData.sampleTreesCount);
        } else {
          const diameter = nonISUCountries.includes(data.country)
            ? Math.round(inventoryData.specieDiameter * cmToInch * 1000) / 1000
            : inventoryData.specieDiameter;
          const height = nonISUCountries.includes(data.country)
            ? Math.round(inventoryData.specieHeight * meterToFoot * 1000) / 1000
            : inventoryData.specieHeight;

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

          updateDiameterLabel(inventoryData.specieHeight);

          setSpecieText(inventoryData.species[0].aliases);
          setSpecieDiameter(diameter);
          setSpecieEditDiameter(diameter);
          setSpecieHeight(height);
          setSpecieEditHeight(height);
          setPlantationDate(inventoryData.plantation_date);
          setTagId(inventoryData.tagId);
          setEditedTagId(inventoryData.tagId);
        }
      });
    });
  };

  const updateDiameterLabel = (convertedHeight: number) => {
    if (convertedHeight < DBHInMeter) {
      setDiameterLabel(i18next.t('label.measurement_basal_diameter'));
    } else {
      setDiameterLabel(i18next.t('label.measurement_DBH'));
    }
  };

  const getConvertedDiameter = (treeDiameter = specieEditDiameter) => {
    return nonISUCountries.includes(countryCode)
      ? Number(treeDiameter) * inchToCm
      : Number(treeDiameter);
  };

  const getConvertedHeight = (treeHeight = specieEditHeight) => {
    return nonISUCountries.includes(countryCode)
      ? Number(treeHeight) * footToMeter
      : Number(treeHeight);
  };

  const onSubmitInputField = ({
    action,
    forceContinue = false,
  }: {
    action: string;
    forceContinue?: boolean;
  }) => {
    const dimensionRegex = /^\d{0,5}(\.\d{1,3})?$/;

    const diameterMinValue = nonISUCountries.includes(countryCode)
      ? diameterMinInch
      : diameterMinCm;
    const diameterMaxValue = nonISUCountries.includes(countryCode)
      ? diameterMaxInch
      : diameterMaxCm;

    const heightMinValue = nonISUCountries.includes(countryCode) ? heightMinFoot : heightMinM;
    const heightMaxValue = nonISUCountries.includes(countryCode) ? heightMaxFoot : heightMaxM;

    switch (action) {
      case 'diameter':
        if (
          !specieEditDiameter ||
          Number(specieEditDiameter) < diameterMinValue ||
          Number(specieEditDiameter) > diameterMaxValue
        ) {
          setInputErrorMessage(
            i18next.t('label.select_species_diameter_more_than_error', {
              minValue: diameterMinValue,
              maxValue: diameterMaxValue,
            }),
          );
          setShowInputError(true);
        } else if (!dimensionRegex.test(specieEditDiameter)) {
          setInputErrorMessage(i18next.t('label.select_species_diameter_invalid'));
          setShowInputError(true);
        } else {
          const refactoredSpecieDiameter: number = getConvertedDiameter();

          const isRatioCorrect = getIsMeasurementRatioCorrect({
            height: getConvertedHeight(),
            diameter: refactoredSpecieDiameter,
          });

          if (!isRatioCorrect && !forceContinue) {
            setShowIncorrectRatioAlert(true);
            return;
          }
          setSpecieDiameter(specieEditDiameter);

          if (!isSampleTree && !route?.params?.isSampleTree) {
            updateSpecieDiameter({
              inventory_id: inventory.inventory_id,
              speciesDiameter: refactoredSpecieDiameter,
            });
          } else {
            updateSampleTree({
              toUpdate: action,
              value: refactoredSpecieDiameter,
              inventory,
              sampleTreeIndex,
              setInventory,
            });
          }
        }
        break;
      case 'height':
        if (
          !specieEditHeight ||
          Number(specieEditHeight) < heightMinValue ||
          Number(specieEditHeight) > heightMaxValue
        ) {
          setInputErrorMessage(
            i18next.t('label.select_species_height_more_than_error', {
              minValue: heightMinValue,
              maxValue: heightMaxValue,
            }),
          );
          setShowInputError(true);
        } else if (!dimensionRegex.test(specieEditHeight)) {
          setInputErrorMessage(i18next.t('label.select_species_height_invalid'));
          setShowInputError(true);
        } else {
          const refactoredSpecieHeight = getConvertedHeight();

          const isRatioCorrect = getIsMeasurementRatioCorrect({
            height: refactoredSpecieHeight,
            diameter: getConvertedDiameter(),
          });

          if (!isRatioCorrect && !forceContinue) {
            setShowIncorrectRatioAlert(true);
            return;
          }
          setSpecieHeight(specieEditHeight);

          updateDiameterLabel(refactoredSpecieHeight);

          if (!isSampleTree && !route?.params?.isSampleTree) {
            updateSpecieHeight({
              inventory_id: inventory.inventory_id,
              speciesHeight: refactoredSpecieHeight,
            });
          } else {
            updateSampleTree({
              toUpdate: action,
              value: refactoredSpecieHeight,
              inventory,
              sampleTreeIndex,
              setInventory,
            });
          }
        }
        break;
      case 'tagId':
        setTagId(editedTagId);
        if (!isSampleTree && !route?.params?.isSampleTree) {
          updateTreeTag({
            inventoryId: inventory.inventory_id,
            tagId: editedTagId,
          });
        } else {
          updateSampleTree({
            toUpdate: action,
            value: editedTagId,
            inventory,
            sampleTreeIndex,
            setInventory,
          });
        }
        break;
      default:
        setInputErrorMessage(i18next.t('label.tree_inventory_input_error_message'));
        setShowInputError(true);
    }

    setIsOpenModal(false);
    setEditEnable('');
  };

  const onPressEditSpecies = (action: string) => {
    if (action === 'species') {
      setIsShowManageSpecies(true);
    } else if (action === 'project') {
      navigation.navigate('SelectProject', { selectedProjectId });
    } else {
      setEditEnable(action);
      if (action === 'diameter') {
        setSpecieEditDiameter(specieDiameter);
      } else if (action === 'height') {
        setSpecieEditHeight(specieHeight);
      } else if (action === 'tagId') {
        setEditedTagId(tagId);
      }
      setIsOpenModal(true);
    }
  };

  const addSpecieNameToInventory = (stringifiedSpecie: any) => {
    let specie = JSON.parse(stringifiedSpecie);
    if (!isSampleTree && !route?.params?.isSampleTree) {
      updateSingleTreeSpecie({
        inventory_id: inventory.inventory_id,
        species: [
          {
            id: specie.guid,
            treeCount: 1,
            aliases: specie.aliases ? specie.aliases : specie.scientificName,
          },
        ],
      });
    } else {
      updateSampleTree({
        toUpdate: 'specie',
        value: specie,
        inventory,
        sampleTreeIndex,
        setInventory,
      });
    }
    setSpecieText(specie.scientificName);
  };

  const onChangeDate = (selectedDate: any) => {
    if (!isSampleTree && !route?.params?.isSampleTree) {
      updatePlantingDate({
        inventory_id: inventoryState.inventoryID,
        plantation_date: selectedDate,
      });
    } else {
      updateSampleTree({
        toUpdate: 'plantationDate',
        value: selectedDate,
        inventory,
        sampleTreeIndex,
        setInventory,
      });
    }

    setIsShowDate(false);
    setPlantationDate(selectedDate);
  };

  const renderDateModal = () => {
    const handleConfirm = (data: any) => onChangeDate(data);
    const hideDatePicker = () => setIsShowDate(false);

    return (
      isShowDate && (
        <DateTimePickerModal
          headerTextIOS={i18next.t('label.inventory_overview_pick_a_date')}
          cancelTextIOS={i18next.t('label.inventory_overview_cancel')}
          confirmTextIOS={i18next.t('label.inventory_overview_confirm')}
          isVisible={true}
          maximumDate={new Date()}
          minimumDate={new Date(2006, 0, 1)}
          testID="dateTimePicker1"
          timeZoneOffsetInMinutes={0}
          date={new Date(plantationDate)}
          mode={'date'}
          is24Hour={true}
          display="default"
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
        />
      )
    );
  };

  let filePath, imageSource: any;

  if (inventory) {
    const imageURIPrefix = Platform.OS === 'android' ? 'file://' : '';
    if (inventory.treeType === SINGLE) {
      if (inventory.polygons[0]?.coordinates[0]?.imageUrl) {
        filePath = inventory.polygons[0]?.coordinates[0]?.imageUrl;
      } else if (inventory.polygons[0]?.coordinates[0]?.cdnImageUrl) {
        filePath = inventory.polygons[0]?.coordinates[0]?.cdnImageUrl;
      }
    } else if (
      inventory.treeType === MULTI &&
      (inventory.status === INCOMPLETE_SAMPLE_TREE ||
        inventory.status === SYNCED ||
        inventory.status === PENDING_DATA_UPLOAD) &&
      (sampleTreeIndex === 0 || sampleTreeIndex)
    ) {
      if (inventory.sampleTrees[sampleTreeIndex]?.imageUrl) {
        filePath = inventory.sampleTrees[sampleTreeIndex].imageUrl;
      } else if (
        inventory.sampleTrees.length &&
        inventory.sampleTrees[sampleTreeIndex]?.cdnImageUrl
      ) {
        filePath = inventory.sampleTrees[sampleTreeIndex].cdnImageUrl;
      }
    }
    if (
      ((inventory.polygons[0]?.coordinates[0]?.imageUrl && inventory.treeType !== MULTI) ||
        (inventory.sampleTrees[sampleTreeIndex]?.imageUrl && inventory.sampleTrees)) &&
      filePath
    ) {
      imageSource = {
        uri: `${imageURIPrefix}${RNFS.DocumentDirectoryPath}/${filePath}`,
      };
    } else if (
      (inventory.polygons[0]?.coordinates[0]?.cdnImageUrl ||
        (inventory.sampleTrees[sampleTreeIndex]?.cdnImageUrl &&
          inventory.sampleTrees.length !== 0)) &&
      filePath
    ) {
      imageSource = {
        uri: `${protocol}://${cdnUrl}/media/uploads/images/coordinate/${filePath}`,
      };
    } else {
      imageSource = false;
    }
  }

  const renderDetails = ({ polygons }: any) => {
    let coords;
    if (polygons[0]) {
      coords = polygons[0].coordinates[0];
    }
    let shouldEdit;
    if (
      inventory &&
      (inventory.status === INCOMPLETE ||
        inventory.status === INCOMPLETE_SAMPLE_TREE ||
        !inventory.status)
    ) {
      shouldEdit = true;
    } else {
      shouldEdit = false;
    }
    let detailHeaderStyle = !imageSource
      ? [styles.detailHeader, styles.defaultFontColor]
      : [styles.detailHeader];
    let detailContainerStyle = imageSource ? [styles.detailSubContainer] : [{}];

    const isNonISUCountry: boolean = nonISUCountries.includes(countryCode);

    // used to get the text to show on UI for diameter and height
    const getConvertedMeasurementText = (measurement: any, unit: 'cm' | 'm' = 'cm'): string => {
      let text = i18next.t('label.tree_review_unable');

      if (measurement && isNonISUCountry) {
        text = ` ${Math.round(Number(measurement) * 1000) / 1000} ${i18next.t(
          unit === 'cm' ? 'label.select_species_inches' : 'label.select_species_feet',
        )} `;
      } else if (measurement) {
        text = ` ${Math.round(Number(measurement) * 1000) / 1000} ${unit} `;
      }
      return text;
    };

    return (
      <View style={detailContainerStyle}>
        <View style={{ marginVertical: 5 }}>
          <Text style={detailHeaderStyle}>{i18next.t('label.tree_review_specie')}</Text>
          <TouchableOpacity
            disabled={!shouldEdit}
            onPress={() => onPressEditSpecies('species')}
            accessible={true}
            accessibilityLabel={i18next.t('label.tree_review_specie')}
            testID="species_btn">
            <Text style={[styles.detailText, { fontStyle: 'italic' }]}>
              {specieText
                ? i18next.t('label.tree_review_specie_text', { specieText })
                : i18next.t('label.tree_review_unable')}{' '}
              {shouldEdit && <MIcon name={'edit'} size={20} />}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginVertical: 5 }}>
          <Text style={detailHeaderStyle}>{i18next.t('label.select_species_height')}</Text>
          <TouchableOpacity
            disabled={!shouldEdit}
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => onPressEditSpecies('height')}
            accessibilityLabel="Height"
            testID="height_btn"
            accessible={true}>
            <FIcon name={'arrow-v'} style={styles.detailText} />
            <Text style={styles.detailText}>
              {getConvertedMeasurementText(specieHeight, 'm')}
              {shouldEdit && <MIcon name={'edit'} size={20} />}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginVertical: 5 }}>
          <Text style={detailHeaderStyle}>{diameterLabel}</Text>
          <TouchableOpacity
            disabled={!shouldEdit}
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => onPressEditSpecies('diameter')}
            accessibilityLabel={i18next.t('label.tree_review_diameter')}
            testID="diameter_btn"
            accessible={true}>
            <FIcon name={'arrow-h'} style={styles.detailText} />
            <Text style={styles.detailText}>
              {getConvertedMeasurementText(specieDiameter)}
              {shouldEdit && <MIcon name={'edit'} size={20} />}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginVertical: 5 }}>
          <Text style={detailHeaderStyle}>{i18next.t('label.tree_review_plantation_date')}</Text>
          <TouchableOpacity
            disabled={!shouldEdit}
            onPress={() => setIsShowDate(true)}
            accessible={true}
            accessibilityLabel="Register Planting Date"
            testID="register_planting_date">
            <Text style={styles.detailText}>
              {i18next.t('label.inventory_overview_date', {
                date: new Date(plantationDate),
              })}{' '}
              {shouldEdit && <MIcon name={'edit'} size={20} />}
            </Text>
          </TouchableOpacity>
        </View>
        {status !== INCOMPLETE_SAMPLE_TREE && !route?.params?.isSampleTree && showProject ? (
          <View style={{ marginVertical: 5 }}>
            <Text style={detailHeaderStyle}>{i18next.t('label.tree_review_project')}</Text>
            <TouchableOpacity
              disabled={!shouldEdit}
              onPress={() => onPressEditSpecies('project')}
              accessible={true}
              accessibilityLabel="register_project"
              testID="register_project">
              <Text style={styles.detailText}>
                {selectedProjectName || i18next.t('label.tree_review_unassigned')}{' '}
                {shouldEdit && <MIcon name={'edit'} size={20} />}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          []
        )}
        <View style={{ marginVertical: 5 }}>
          <Text style={detailHeaderStyle}>{i18next.t('label.tree_review_tree_tag_header')}</Text>
          <TouchableOpacity
            disabled={!shouldEdit}
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => onPressEditSpecies('tagId')}
            accessibilityLabel={i18next.t('label.tree_review_tree_tag_header')}
            testID="tree-tag-btn"
            accessible={true}>
            <Text style={styles.detailText}>
              {tagId ? tagId : i18next.t('label.tree_review_not_tagged')}{' '}
              {shouldEdit && <MIcon name={'edit'} size={20} />}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginVertical: 5 }}>
          <Text style={detailHeaderStyle}>{i18next.t('label.tree_review_location')}</Text>
          <Text style={styles.detailText}>
            {`${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`}{' '}
          </Text>
        </View>
        <Label leftText={i18next.t('label.additional_data')} rightText={''} />

        <AdditionalDataOverview
          data={
            isSampleTree && (sampleTreeIndex === 0 || sampleTreeIndex)
              ? inventory?.sampleTrees[sampleTreeIndex]
              : inventory
          }
          isSampleTree={isSampleTree}
        />
      </View>
    );
  };

  const onPressSave = () => {
    if (route?.params?.isSampleTree) {
      navigation.goBack();
    } else if (inventory.status === INCOMPLETE) {
      if (specieText) {
        addAppMetadata({ inventory_id: inventoryState.inventoryID })
          .then(() => {
            let data = { inventory_id: inventoryState.inventoryID, status: PENDING_DATA_UPLOAD };
            changeInventoryStatus(data, dispatch).then(() => {
              navigation.navigate('TreeInventory');
            });
          })
          .catch((err) => {
            setIsError(true);
          });
      } else {
        // TODO:i18n - if this is used, please add translations
        alert('Species Name  is required');
      }
    } else {
      navigation.navigate('TreeInventory');
    }
    return true;
  };

  const onPressContinue = () => {
    updateSampleTree({
      toUpdate: 'changeStatusToPending',
      inventory,
      sampleTreeIndex,
      setInventory,
    })
      .then(() => {
        setSkipToInventoryOverview(false)(dispatch);
        navigation.dispatch(
          CommonActions.reset({
            index: 3,
            routes: [
              { name: 'MainScreen' },
              { name: 'TreeInventory' },
              {
                name: inventoryState.skipToInventoryOverview
                  ? 'InventoryOverview'
                  : 'AdditionalDataForm',
              },
            ],
          }),
        );
      })
      .catch(() => setIsError(true));
  };

  const onPressNextTree = () => {
    if (inventory.status === INCOMPLETE) {
      addAppMetadata({ inventory_id: inventoryState.inventoryID })
        .then(() => {
          let data = { inventory_id: inventoryState.inventoryID, status: PENDING_DATA_UPLOAD };
          changeInventoryStatus(data, dispatch).then(() => {
            deleteInventoryId()(dispatch);

            navigation.navigate('RegisterSingleTree');
          });
        })
        .catch(() => setIsError(true));
    } else if (inventory.status === INCOMPLETE_SAMPLE_TREE) {
      updateSampleTree({
        toUpdate: 'changeStatusToPending',
        inventory,
        sampleTreeIndex,
        setInventory,
      })
        .then(() => {
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
        })
        .catch(() => setIsError(true));
    }
  };

  const handleDeleteInventory = () => {
    if (isSampleTree) {
      let inventoryStatus = inventory?.sampleTrees[sampleTreeIndex].status;
      updateSampleTree({
        toUpdate: 'deleteSampleTree',
        sampleTreeIndex,
        inventory,
        setInventory,
      })
        .then(() => {
          setShowDeleteAlert(!showDeleteAlert);
          if (inventoryStatus == INCOMPLETE && !inventoryState.skipToInventoryOverview) {
            navigation.navigate('RecordSampleTrees');
          } else {
            setSkipToInventoryOverview(false)(dispatch);
            navigation.navigate('InventoryOverview');
          }
        })
        .catch((err) => console.error(err));
    } else {
      deleteInventory({ inventory_id: inventory.inventory_id }, dispatch)
        .then(() => {
          setShowDeleteAlert(!showDeleteAlert);
          navigation.navigate('TreeInventory');
        })
        .catch((err) => console.error(err));
    }
  };

  return isShowManageSpecies ? (
    isSampleTree ? (
      <SpecieSampleTree
        onPressBack={() => setIsShowManageSpecies(false)}
        registrationType={registrationType}
        addSpecieToInventory={addSpecieNameToInventory}
        editOnlySpecieName={true}
        isSampleTree={isSampleTree}
      />
    ) : (
      <ManageSpecies
        onPressBack={() => setIsShowManageSpecies(false)}
        registrationType={registrationType}
        addSpecieToInventory={addSpecieNameToInventory}
        editOnlySpecieName={true}
        isSampleTree={isSampleTree}
      />
    )
  ) : (
    <SafeAreaView style={styles.mainContainer}>
      <InputModal
        isOpenModal={isOpenModal}
        setIsOpenModal={setIsOpenModal}
        value={
          editEnable === 'diameter'
            ? specieEditDiameter.toString()
            : editEnable === 'height'
            ? specieEditHeight.toString()
            : editedTagId
        }
        inputType={editEnable === 'diameter' || editEnable === 'height' ? 'number' : 'text'}
        setValue={
          editEnable === 'diameter'
            ? setSpecieEditDiameter
            : editEnable === 'height'
            ? setSpecieEditHeight
            : setEditedTagId
        }
        onSubmitInputField={() => onSubmitInputField({ action: editEnable })}
      />
      {renderDateModal()}
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 0,
              marginBottom: 24,
            }}>
            <Header
              style={{ flex: 1 }}
              closeIcon
              onBackPress={onPressSave}
              headingText={
                isSampleTree && (sampleTreeIndex === 0 || sampleTreeIndex)
                  ? i18next.t('label.sample_tree_review_tree_number', {
                      ongoingSampleTreeNumber: sampleTreeIndex + 1,
                      sampleTreesCount: totalSampleTrees,
                    })
                  : status === SYNCED
                  ? i18next.t('label.tree_review_details')
                  : i18next.t('label.tree_review_header')
              }
              rightText={
                status === INCOMPLETE ||
                status === INCOMPLETE_SAMPLE_TREE ||
                (status === PENDING_DATA_UPLOAD && inventory?.treeType === SINGLE)
                  ? i18next.t('label.tree_review_delete')
                  : ''
              }
              onPressFunction={() => setShowDeleteAlert(true)}
            />
          </View>

          {inventory && (
            <View style={styles.scrollViewContainer}>
              {imageSource && (
                <Image
                  source={imageSource}
                  style={locateTree === ON_SITE ? styles.imgSpecie : styles.bgImage}
                />
              )}
              {renderDetails(inventory)}
            </View>
          )}
        </ScrollView>
        {inventory?.treeType === SINGLE && status === INCOMPLETE ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <PrimaryButton
              onPress={() => onPressSave()}
              btnText={i18next.t('label.tree_review_Save')}
              theme={'white'}
              halfWidth={true}
            />
            <PrimaryButton
              onPress={() => onPressNextTree()}
              btnText={i18next.t('label.tree_review_next_btn')}
              halfWidth={true}
            />
          </View>
        ) : inventory?.sampleTreesCount === inventory?.completedSampleTreesCount + 1 &&
          isIncompleteSampleTree ? (
          <View style={styles.bottomBtnsContainer}>
            <PrimaryButton
              onPress={onPressContinue}
              btnText={
                inventoryState.skipToInventoryOverview
                  ? i18next.t('label.tree_review_continue_to_review')
                  : i18next.t('label.tree_review_continue_to_additional_data')
              }
            />
          </View>
        ) : (status === INCOMPLETE || status === INCOMPLETE_SAMPLE_TREE) &&
          !route?.params?.isSampleTree ? (
          <View style={styles.bottomBtnsContainer}>
            <PrimaryButton
              onPress={() => onPressNextTree()}
              btnText={i18next.t('label.tree_review_next_btn')}
            />
          </View>
        ) : (
          []
        )}
      </View>
      <AlertModal
        visible={showDeleteAlert}
        heading={i18next.t('label.tree_inventory_alert_header')}
        message={
          status === SYNCED
            ? i18next.t('label.tree_review_delete_uploaded_registration')
            : i18next.t('label.tree_review_delete_not_yet_uploaded_registration')
        }
        primaryBtnText={i18next.t('label.tree_review_delete')}
        secondaryBtnText={i18next.t('label.alright_modal_white_btn')}
        onPressPrimaryBtn={handleDeleteInventory}
        onPressSecondaryBtn={() => setShowDeleteAlert(!showDeleteAlert)}
        showSecondaryButton={true}
      />
      <AlertModal
        visible={showInputError || isError}
        heading={
          isError
            ? i18next.t('label.something_went_wrong')
            : i18next.t('label.tree_inventory_input_error')
        }
        message={isError ? i18next.t('label.error_saving_inventory') : inputErrorMessage}
        primaryBtnText={i18next.t('label.ok')}
        onPressPrimaryBtn={() => {
          setIsError(false);
          setShowInputError(false);
        }}
      />
      <AlertModal
        visible={showIncorrectRatioAlert}
        heading={i18next.t('label.not_optimal_ratio')}
        message={i18next.t('label.not_optimal_ratio_message')}
        primaryBtnText={i18next.t('label.check_again')}
        onPressPrimaryBtn={() => {
          setShowIncorrectRatioAlert(false);
          if (editEnable === 'diameter') {
            setSpecieEditDiameter(specieDiameter);
          } else {
            setSpecieEditHeight(specieHeight);
          }
        }}
        showSecondaryButton
        secondaryBtnText={i18next.t('label.continue')}
        onPressSecondaryBtn={() => {
          setShowIncorrectRatioAlert(false);
          onSubmitInputField({ action: editEnable, forceContinue: true });
        }}
      />
    </SafeAreaView>
  );
};
export default SingleTreeOverview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    backgroundColor: Colors.WHITE,
  },
  cont: {
    flex: 1,
  },
  subScript: {
    fontSize: 10,
    color: Colors.WHITE,
  },
  overViewContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 15,
    overflow: 'hidden',
    marginVertical: 10,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  bgWhite: {
    backgroundColor: Colors.WHITE,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  flexRow: {
    flexDirection: 'row',
  },
  flexEnd: {
    justifyContent: 'flex-end',
  },
  bottomBtnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  detailContainer: {
    marginTop: 24,
  },
  scrollViewContainer: {
    flex: 1,
    marginTop: 0,
  },
  detailHeader: {
    fontSize: Typography.FONT_SIZE_14,
    color: Colors.GRAY_LIGHTEST,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    marginVertical: 5,
  },
  detailText: {
    fontSize: Typography.FONT_SIZE_18,
    color: Colors.TEXT_COLOR,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    lineHeight: Typography.LINE_HEIGHT_30,
  },
  defaultFontColor: {
    color: Colors.TEXT_COLOR,
  },
  detailSubContainer: {
    paddingTop: 10,
  },
  imgSpecie: {
    width: '100%',
    height: Dimensions.get('window').height * 0.3,
    borderRadius: 13,
  },
  detailHead: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_18,
    color: Colors.TEXT_COLOR,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    lineHeight: Typography.LINE_HEIGHT_24,
  },
  detailTxt: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_18,
    color: Colors.TEXT_COLOR,
    lineHeight: Typography.LINE_HEIGHT_24,
  },
});
