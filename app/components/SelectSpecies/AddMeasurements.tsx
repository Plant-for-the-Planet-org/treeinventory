import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  SafeAreaView,
  Switch,
  Text,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
import {
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
  LogTypes,
  meterToFoot,
  nonISUCountries,
} from '../../utils/constants';
import i18next from 'i18next';
import { Colors, Typography } from '../../styles';
import { AlertModal, Header, PrimaryButton } from '../Common';
import OutlinedInput from '../Common/OutlinedInput';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { InventoryContext } from '../../reducers/inventory';
import { INCOMPLETE_SAMPLE_TREE } from '../../utils/inventoryConstants';
import {
  getInventory,
  updateInventory,
  updateSpecieAndMeasurements,
} from '../../repositories/inventory';
import { getUserInformation } from '../../repositories/user';
import dbLog from '../../repositories/logs';
import getIsMeasurementRatioCorrect from '../../utils/calculateHeighDiameterRatio';

export const AddMeasurements = () => {
  const [singleTreeSpecie, setSingleTreeSpecie] = useState('');
  const [diameter, setDiameter] = useState('');
  const [diameterError, setDiameterError] = useState('');
  const [height, setHeight] = useState('');
  const [heightError, setHeightError] = useState('');
  const [tagId, setTagId] = useState('');
  const [inventory, setInventory] = useState<any>();
  const [countryCode, setCountryCode] = useState('');
  const [isTagIdPresent, setIsTagIdPresent] = useState(true);
  const [tagIdError, setTagIdError] = useState('');
  const [isSampleTree, setIsSampleTree] = useState(false);
  const [diameterLabel, setDiameterLabel] = useState<string>(
    i18next.t('label.measurement_basal_diameter'),
  );
  const [showIncorrectRatioAlert, setShowIncorrectRatioAlert] = useState<boolean>(false);

  const { state } = useContext(InventoryContext);
  const navigation = useNavigation();
  const diameterRef = React.createRef();
  const tagIdRef = React.createRef();

  useEffect(() => {
    if (!isTagIdPresent) {
      setTagId('');
    }
  }, [isTagIdPresent]);

  useEffect(() => {
    setIsSampleTree(inventory?.status === INCOMPLETE_SAMPLE_TREE);
  }, [inventory]);

  useEffect(() => {
    fetchInventory();
    setCountry();
  }, []);

  const fetchInventory = () => {
    if (state.inventoryID) {
      getInventory({ inventoryID: state.inventoryID }).then((inventoryData) => {
        setInventory(inventoryData);

        if (inventoryData.species.length > 0 && inventoryData.specieDiameter == null) {
          setSingleTreeSpecie(inventoryData.species[0]);
        }
      });
    }
  };

  const setCountry = () => {
    getUserInformation().then((data) => {
      setCountryCode(data.country);
    });
  };
  const dimensionRegex = /^\d{0,5}(\.\d{1,3})?$/;

  const onPressMeasurementBtn = () => {
    Keyboard.dismiss();
    let isDiameterValid = false;
    let isHeightValid = false;
    let isTagIdValid = false;

    const diameterMinValue = nonISUCountries.includes(countryCode)
      ? diameterMinInch
      : diameterMinCm;
    const diameterMaxValue = nonISUCountries.includes(countryCode)
      ? diameterMaxInch
      : diameterMaxCm;

    const heightMinValue = nonISUCountries.includes(countryCode) ? heightMinFoot : heightMinM;
    const heightMaxValue = nonISUCountries.includes(countryCode) ? heightMaxFoot : heightMaxM;

    // sets diameter error if diameter is not in between the minimum and maximum values or is invalid input
    if (!diameter || Number(diameter) < diameterMinValue || Number(diameter) > diameterMaxValue) {
      setDiameterError(
        i18next.t('label.select_species_diameter_more_than_error', {
          minValue: diameterMinValue,
          maxValue: diameterMaxValue,
        }),
      );
    } else if (!dimensionRegex.test(diameter)) {
      setDiameterError(i18next.t('label.select_species_diameter_invalid'));
    } else {
      setDiameterError('');
      isDiameterValid = true;
    }

    // sets height error if height is not in between the minimum and maximum values or is invalid input
    if (!height || Number(height) < heightMinValue || Number(height) > heightMaxValue) {
      setHeightError(
        i18next.t('label.select_species_height_more_than_error', {
          minValue: heightMinValue,
          maxValue: heightMaxValue,
        }),
      );
    } else if (!dimensionRegex.test(height)) {
      setHeightError(i18next.t('label.select_species_height_invalid'));
    } else {
      setHeightError('');
      isHeightValid = true;
    }

    // checks if tag id is present and sets error accordingly
    if (isTagIdPresent && !tagId) {
      setTagIdError(i18next.t('label.select_species_tag_id_required'));
    } else {
      setTagIdError('');
      isTagIdValid = true;
    }

    // if all fields are valid then updates the specie data in DB
    if (isDiameterValid && isHeightValid && isTagIdValid) {
      const isRatioCorrect = getIsMeasurementRatioCorrect({
        height: getConvertedHeight(),
        diameter: getConvertedDiameter(),
      });

      if (isRatioCorrect) {
        addMeasurements();
      } else {
        setShowIncorrectRatioAlert(true);
      }
    }
  };

  // returns the converted diameter by checking the user's country metric
  const getConvertedDiameter = (treeDiameter: string = diameter) => {
    return nonISUCountries.includes(countryCode)
      ? Number(treeDiameter) * inchToCm
      : Number(treeDiameter);
  };

  // returns the converted height by checking the user's country metric
  const getConvertedHeight = (treeHeight: string = height) => {
    return nonISUCountries.includes(countryCode)
      ? Number(treeHeight) * footToMeter
      : Number(treeHeight);
  };

  // adds height, diameter and tag in DB by checking the tree type
  const addMeasurements = () => {
    if (!isSampleTree) {
      updateSpecieAndMeasurements({
        inventoryId: inventory.inventory_id,
        species: [singleTreeSpecie],
        diameter: getConvertedDiameter(),
        height: getConvertedHeight(),
        tagId,
      })
        .then(() => {
          postMeasurementUpdate();
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      let updatedSampleTrees = [...inventory.sampleTrees];
      updatedSampleTrees[
        inventory.completedSampleTreesCount
      ].specieDiameter = getConvertedDiameter();
      updatedSampleTrees[inventory.completedSampleTreesCount].specieHeight = getConvertedHeight();
      if (tagId) {
        updatedSampleTrees[inventory.completedSampleTreesCount].tagId = tagId;
      }

      updateInventory({
        inventory_id: inventory.inventory_id,
        inventoryData: {
          sampleTrees: [...updatedSampleTrees],
        },
      })
        .then(() => {
          dbLog.info({
            logType: LogTypes.INVENTORY,
            message: `Successfully added measurements for sample tree #${
              inventory.completedSampleTreesCount + 1
            } having inventory_id: ${inventory.inventory_id}`,
          });
          postMeasurementUpdate();
        })
        .catch((err) => {
          dbLog.error({
            logType: LogTypes.INVENTORY,
            message: `Error while adding measurements for sample tree #${
              inventory.completedSampleTreesCount + 1
            } having inventory_id: ${inventory.inventory_id}`,
            logStack: JSON.stringify(err),
          });
          console.error(
            `Error while adding measurements for sample tree #${
              inventory.completedSampleTreesCount + 1
            } having inventory_id: ${inventory.inventory_id}`,
            err,
          );
        });
    }
  };

  // resets the state and navigate user to next screen
  const postMeasurementUpdate = () => {
    setShowIncorrectRatioAlert(false);
    setDiameter('');
    setHeight('');
    setTagId('');
    navigation.dispatch(
      CommonActions.reset({
        index: 2,
        routes: [
          { name: 'MainScreen' },
          { name: 'TreeInventory' },
          {
            name: 'AdditionalDataForm',
            params: isSampleTree ? { totalSampleTrees: inventory.sampleTreesCount } : {},
          },
        ],
      }),
    );
  };

  const handleHeightChange = (text: string) => {
    const convertedHeight = text ? getConvertedHeight(text) : 0;

    setHeightError('');
    setHeight(text.replace(/,/g, '.').replace(/[^0-9.]/g, ''));

    if (convertedHeight < DBHInMeter) {
      setDiameterLabel(i18next.t('label.measurement_basal_diameter'));
    } else {
      setDiameterLabel(i18next.t('label.measurement_DBH'));
    }
  };

  const isNonISUCountry = nonISUCountries.includes(countryCode);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.mainContainer}>
        <View style={styles.container}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
            <Header
              headingText={i18next.t('label.select_species_add_measurements')}
              onBackPress={() => {
                navigation.goBack();
              }}
            />
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS == 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
              <View>
                <View style={styles.inputBox}>
                  <View>
                    <OutlinedInput
                      value={height}
                      onChangeText={(text: string) => handleHeightChange(text)}
                      label={i18next.t('label.select_species_height')}
                      keyboardType={'decimal-pad'}
                      rightText={
                        nonISUCountries.includes(countryCode)
                          ? i18next.t('label.select_species_feet')
                          : 'm'
                      }
                      error={heightError}
                      autoFocus
                      returnKeyType={'next'}
                      onSubmitEditing={() => diameterRef.current.focus()}
                    />
                  </View>
                </View>

                <View style={[styles.inputBox, { zIndex: 1 }]}>
                  <View>
                    <OutlinedInput
                      value={diameter}
                      onChangeText={(text: string) => {
                        setDiameterError('');
                        setDiameter(text.replace(/,/g, '.').replace(/[^0-9.]/g, ''));
                      }}
                      label={diameterLabel}
                      keyboardType={'decimal-pad'}
                      rightText={
                        nonISUCountries.includes(countryCode)
                          ? i18next.t('label.select_species_inches')
                          : 'cm'
                      }
                      error={diameterError}
                      ref={diameterRef}
                      returnKeyType={isTagIdPresent ? 'next' : 'default'}
                      onSubmitEditing={isTagIdPresent ? () => tagIdRef.current.focus() : () => {}}
                      showInfo={true}
                      infoText={i18next.t('label.measurement_diameter_info', {
                        height: isNonISUCountry ? DBHInMeter * meterToFoot : DBHInMeter,
                        unit: isNonISUCountry ? i18next.t('label.select_species_inches') : 'm',
                      })}
                    />
                  </View>
                </View>

                <View style={styles.switchContainer}>
                  <Text style={styles.switchText}>
                    {i18next.t('label.select_species_tagged_for_identification')}
                  </Text>
                  <Switch
                    trackColor={{ false: '#767577', true: '#d4e7b1' }}
                    thumbColor={isTagIdPresent ? Colors.PRIMARY : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={() => setIsTagIdPresent(!isTagIdPresent)}
                    value={isTagIdPresent}
                  />
                </View>

                {isTagIdPresent ? (
                  <>
                    <View style={styles.inputBox}>
                      <View>
                        <OutlinedInput
                          value={tagId}
                          label={i18next.t('label.select_species_tree_tag')}
                          onChangeText={(text: string) => {
                            setTagIdError('');
                            setTagId(text);
                          }}
                          error={tagIdError}
                          ref={tagIdRef}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  []
                )}
              </View>

              <View>
                <PrimaryButton
                  onPress={onPressMeasurementBtn}
                  btnText={i18next.t('label.select_species_continue')}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
        <AlertModal
          visible={showIncorrectRatioAlert}
          heading={i18next.t('label.not_optimal_ratio')}
          message={i18next.t('label.not_optimal_ratio_message')}
          primaryBtnText={i18next.t('label.check_again')}
          onPressPrimaryBtn={() => setShowIncorrectRatioAlert(false)}
          showSecondaryButton
          secondaryBtnText={i18next.t('label.continue')}
          onPressSecondaryBtn={() => {
            setShowIncorrectRatioAlert(false);
            addMeasurements();
          }}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    backgroundColor: Colors.WHITE,
    flexDirection: 'column',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  inputBox: {
    marginTop: 24,
    marginBottom: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  switchText: {
    color: Colors.TEXT_COLOR,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    marginRight: 10,
    flex: 1,
  },
});
