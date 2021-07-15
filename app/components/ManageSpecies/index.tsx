import { useNetInfo } from '@react-native-community/netinfo';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import i18next from 'i18next';
import React, { useContext, useEffect, useState } from 'react';
import {
  Keyboard,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Snackbar from 'react-native-snackbar';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Realm from 'realm';
import { setSpecie } from '../../actions/species';
import { InventoryContext } from '../../reducers/inventory';
import { NavigationContext } from '../../reducers/navigation';
import { SpeciesContext } from '../../reducers/species';
import { getSchema } from '../../repositories/default';
import { getInventory } from '../../repositories/inventory';
import dbLog from '../../repositories/logs';
import { getUserSpecies, searchSpeciesFromLocal } from '../../repositories/species';
import { Colors, Typography } from '../../styles';
import { LogTypes } from '../../utils/constants';
import { MULTI } from '../../utils/inventoryConstants';
import { IScientificSpecies } from '../../utils/schemaInterfaces';
import { ScientificSpeciesType } from '../../utils/ScientificSpecies/ScientificSpeciesTypes';
import { AlertModal, Header, SpeciesSyncError } from '../Common';
import IconSwitcher from '../Common/IconSwitcher';
import TreeCountModal from '../Common/TreeCountModal';
import MySpecies from './MySpecies';
import SearchSpecies from './SearchSpecies';

const DismissKeyBoard = ({ children }: { children: React.ReactNode }) => {
  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      {children}
    </TouchableWithoutFeedback>
  );
};

interface ManageSpeciesProps {
  onPressSpeciesSingle?: () => void;
  onPressBack?: () => void;
  registrationType: any;
  addSpecieToInventory: any;
  editOnlySpecieName: any;
  isSampleTree: any;
  isSampleTreeCompleted?: any;
  screen?: any;
  retainNavigationStack?: any;
  deleteSpeciesAndSampleTrees?: any;
  deleteSpecie?: any;
}

const ManageSpecies: React.FC<ManageSpeciesProps> = ({
  onPressSpeciesSingle,
  onPressBack,
  registrationType,
  addSpecieToInventory,
  editOnlySpecieName,
  isSampleTree,
  isSampleTreeCompleted,
  screen,
  retainNavigationStack,
  deleteSpeciesAndSampleTrees,
  deleteSpecie,
}) => {
  const navigation = useNavigation();
  const [inventory, setInventory] = useState<any>();
  const [specieList, setSpecieList] = useState<ScientificSpeciesType[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchList, setSearchList] = useState<ScientificSpeciesType[]>([]);
  const [showSearchSpecies, setShowSearchSpecies] = useState(false);
  const [showTreeCountModal, setShowTreeCountModal] = useState(false);
  const [treeCount, setTreeCount] = useState('');
  const [activeSpecie, setActiveSpecie] = useState<any>();
  const [deleteSpecieAlert, setDeleteSpecieAlert] = useState(false);
  const [speciesIndexToDelete, setSpeciesIndexToDelete] = useState<number>();
  const [showSpeciesSyncAlert, setShowSpeciesSyncAlert] = useState(false);

  const netInfo = useNetInfo();

  const route = useRoute();

  const { dispatch } = useContext(SpeciesContext);
  const { state } = useContext(InventoryContext);
  const {
    showInitialNavigationStack,
    setInitialNavigationScreen,
    setUpdateSpeciesSync,
  } = useContext(NavigationContext);

  useEffect(() => {
    // fetches all the species already added by user when component mount
    getUserSpecies().then((userSpecies: IScientificSpecies[]) => {
      if (registrationType) {
        let specieListWithUnknown: ScientificSpeciesType[] = [];
        if (userSpecies && userSpecies.length > 0) {
          specieListWithUnknown = [
            ...userSpecies,
            {
              guid: 'unknown',
              isUserSpecies: true,
              scientificName: i18next.t('label.select_species_unknown'),
              aliases: i18next.t('label.select_species_unknown'),
            },
          ];
        } else {
          specieListWithUnknown = [
            {
              guid: 'unknown',
              isUserSpecies: true,
              scientificName: i18next.t('label.select_species_unknown'),
              aliases: i18next.t('label.select_species_unknown'),
            },
          ];
        }
        setSpecieList(specieListWithUnknown);
      } else {
        setSpecieList(userSpecies);
      }
    });
  }, [registrationType, searchList]);

  useEffect(() => {
    if (searchText) {
      setShowSearchSpecies(true);
    } else {
      setShowSearchSpecies(false);
    }
  }, [searchText]);

  useEffect(() => {
    if (screen === 'SelectSpecies') {
      getInventory({ inventoryID: state.inventoryID }).then((inventoryData) => {
        setInventory(inventoryData);
      });
    }
  }, []);

  // used to navigate to main screen
  const onPressHome = () => {
    navigation.navigate('MainScreen');
  };

  // This function adds or removes the specie from User Species
  // ! Do not move this function to repository as state change is happening here to increase the performance
  const toggleUserSpecies = (guid: string, addSpecie = false) => {
    return new Promise((resolve) => {
      Realm.open(getSchema())
        .then((realm) => {
          realm.write(() => {
            let specieToToggle: any = realm.objectForPrimaryKey('ScientificSpecies', guid);
            if (addSpecie) {
              specieToToggle.isUserSpecies = true;
            } else {
              specieToToggle.isUserSpecies = !specieToToggle.isUserSpecies;
            }
            // copies the current search list in variable currentSearchList
            const currentSearchList = [...searchList];

            // sets the changes done by realm into the state
            setSearchList(currentSearchList);

            // logging the success in to the db
            dbLog.info({
              logType: LogTypes.MANAGE_SPECIES,
              message: `Specie with guid ${guid} ${
                specieToToggle.isUserSpecies ? 'added' : 'removed'
              }`,
            });
          });
          resolve(true);
        })
        .catch((err) => {
          console.error(`Error at /components/ManageSpecies/index, ${JSON.stringify(err)}`);
          // logging the error in to the db
          dbLog.error({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Error while adding or removing specie from user specie for specie id: ${guid}`,
            logStack: JSON.stringify(err),
          });
        });
    });
  };

  //This function handles search whenever any search text is entered
  const handleSpeciesSearch = (text: string) => {
    setSearchText(text);
    if (text && text.length > 2) {
      setShowSearchSpecies(true);
      searchSpeciesFromLocal(text).then((data) => {
        setSearchList([...data]);
      });
    } else if (!text) {
      setShowSearchSpecies(false);
      setSearchList([]);
    }
  };

  const handleSpeciePress = (specie: any) => {
    if (registrationType === MULTI && isSampleTreeCompleted) {
      setActiveSpecie(specie);
      setShowTreeCountModal(true);
    } else {
      addSpecieToInventory(JSON.stringify(specie), inventory);
    }
  };

  const handleTreeCountNextButton = () => {
    let specie: any = activeSpecie;
    specie.treeCount = Number(treeCount);

    if ((!treeCount || Number(treeCount) === 0) && inventory.sampleTrees.length > 0) {
      let sampleTrees = [...inventory.sampleTrees];
      sampleTrees.every((sampleTree, index: number) => {
        if (sampleTree.specieId === specie.guid) {
          setSpeciesToDelete(specie, setSpeciesIndexToDelete);
          setDeleteSpecieAlert(true);
          return false;
        } else if (index === sampleTrees.length - 1) {
          setSpeciesToDelete(specie, deleteSpecie);
          navigateAfterTreeCount();
        } else {
          return true;
        }
      });
    } else {
      addSpecieToInventory(JSON.stringify(specie));
      navigateAfterTreeCount();
    }
  };

  const setSpeciesToDelete = (specie: any, callback: any) => {
    for (const index in inventory?.species) {
      if (inventory?.species[index].id === specie.guid) {
        callback(Number(index));
        break;
      }
    }
  };

  const navigateAfterTreeCount = () => {
    setActiveSpecie(null);
    setTreeCount('');
    setShowTreeCountModal(false);
    if (retainNavigationStack && onPressBack) {
      onPressBack();
    } else {
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
    }
  };

  const navigateToSpecieInfo = (specie: ScientificSpeciesType) => {
    setSpecie(specie)(dispatch);
    navigation.navigate('SpecieInfo', {
      screen,
    });
  };

  const handleZeroSpeciesDelete = () => {
    deleteSpeciesAndSampleTrees(speciesIndexToDelete);
    navigateAfterTreeCount();
  };

  const handleSpeciesSyncPress = () => {
    setShowSpeciesSyncAlert(false);
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      setUpdateSpeciesSync(true);
      setInitialNavigationScreen('SpeciesLoading');
      showInitialNavigationStack();
    } else {
      setTimeout(
        () =>
          Snackbar.show({
            text: i18next.t('label.no_internet_connection'),
            duration: Snackbar.LENGTH_SHORT,
            backgroundColor: '#e74c3c',
          }),
        1000,
      );
    }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <DismissKeyBoard>
        <ScrollView style={{ flex: 1 }}>
          <Header
            closeIcon
            onBackPress={onPressBack ? onPressBack : onPressHome}
            headingText={
              registrationType
                ? i18next.t('label.select_species_header')
                : i18next.t('label.select_species_tree_species')
            }
            TitleRightComponent={
              route.name === 'ManageSpecies'
                ? () => (
                    <TouchableOpacity
                      style={{ padding: 10 }}
                      onPress={() => setShowSpeciesSyncAlert(true)}>
                      <IconSwitcher
                        name={'sync-alt'}
                        iconType={'FA5Icon'}
                        size={20}
                        color={Colors.TEXT_COLOR}
                      />
                    </TouchableOpacity>
                  )
                : () => <></>
            }
            style={{ paddingLeft: 25, paddingRight: route.name === 'ManageSpecies' ? 15 : 25 }}
          />
          <View style={styles.container}>
            <SpeciesSyncError />
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} style={styles.searchIcon} />
              <TextInput
                style={styles.searchText}
                placeholder={i18next.t('label.select_species_search_species')}
                onChangeText={handleSpeciesSearch}
                value={searchText}
                returnKeyType={'search'}
                autoCorrect={false}
              />
              {searchText ? (
                <TouchableOpacity
                  onPress={() => {
                    setSearchText('');
                  }}>
                  <Ionicons name="md-close" size={20} style={styles.closeIcon} />
                </TouchableOpacity>
              ) : (
                []
              )}
            </View>
            {showSearchSpecies ? (
              searchText.length < 3 ? (
                <Text style={styles.notPresentText}>
                  {i18next.t('label.select_species_search_atleast_3_characters')}
                </Text>
              ) : searchList && searchList.length > 0 ? (
                <SearchSpecies
                  searchList={searchList}
                  registrationType={registrationType}
                  onPressSpeciesSingle={onPressSpeciesSingle}
                  toggleUserSpecies={toggleUserSpecies}
                  addSpecieToInventory={handleSpeciePress}
                  editOnlySpecieName={editOnlySpecieName}
                  onPressBack={onPressBack}
                  clearSearchText={() => setSearchText('')}
                  isSampleTree={isSampleTree}
                />
              ) : (
                <Text style={styles.notPresentText}>
                  {i18next.t('label.select_species_search_specie_not_present', {
                    searchText,
                  })}
                </Text>
              )
            ) : (
              <MySpecies
                registrationType={registrationType}
                onPressSpeciesSingle={onPressSpeciesSingle}
                specieList={specieList}
                addSpecieToInventory={handleSpeciePress}
                editOnlySpecieName={editOnlySpecieName}
                onPressBack={onPressBack ? onPressBack : () => {}}
                isSampleTree={isSampleTree}
                navigateToSpecieInfo={navigateToSpecieInfo}
                screen={screen || 'ManageSpecies'}
              />
            )}
          </View>
        </ScrollView>
      </DismissKeyBoard>
      <TreeCountModal
        showTreeCountModal={showTreeCountModal}
        activeSpecie={activeSpecie}
        setTreeCount={setTreeCount}
        treeCount={treeCount}
        onPressTreeCountNextBtn={handleTreeCountNextButton}
        setShowTreeCountModal={setShowTreeCountModal}
      />
      <AlertModal
        visible={deleteSpecieAlert}
        heading={i18next.t('label.delete_species')}
        message={i18next.t('label.zero_tree_count_species_delete_sample_tree_warning')}
        showSecondaryButton={true}
        primaryBtnText={i18next.t('label.tree_review_delete')}
        secondaryBtnText={i18next.t('label.cancel')}
        onPressPrimaryBtn={() => handleZeroSpeciesDelete()}
        onPressSecondaryBtn={() => setDeleteSpecieAlert(false)}
      />
      <AlertModal
        visible={showSpeciesSyncAlert}
        heading={i18next.t('label.species_sync_update_alert_title')}
        message={i18next.t('label.species_sync_update_alert_message')}
        showSecondaryButton={true}
        primaryBtnText={i18next.t('label.yes')}
        secondaryBtnText={i18next.t('label.cancel')}
        onPressPrimaryBtn={() => handleSpeciesSyncPress()}
        onPressSecondaryBtn={() => setShowSpeciesSyncAlert(false)}
      />
    </SafeAreaView>
  );
};

export default ManageSpecies;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    backgroundColor: Colors.WHITE,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 5,
    marginTop: 24,
    backgroundColor: Colors.WHITE,
    shadowColor: '#00000024',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.39,
    shadowRadius: 8.3,
    elevation: 6,
  },
  searchIcon: {
    color: '#949596',
    paddingLeft: 19,
  },
  searchText: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontWeight: Typography.FONT_WEIGHT_REGULAR,
    fontSize: Typography.FONT_SIZE_14,
    paddingLeft: 12,
    flex: 1,
  },
  specieListItem: {
    paddingVertical: 20,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderColor: '#E1E0E061',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notPresentText: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontWeight: Typography.FONT_WEIGHT_REGULAR,
    fontSize: Typography.FONT_SIZE_14,
    paddingVertical: 20,
    alignSelf: 'center',
  },
  closeIcon: {
    justifyContent: 'flex-end',
    color: Colors.TEXT_COLOR,
    paddingRight: 20,
  },
});
