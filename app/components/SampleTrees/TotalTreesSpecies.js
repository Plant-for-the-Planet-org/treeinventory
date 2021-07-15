import MapboxGL from '@react-native-mapbox-gl/maps';
import { useNavigation, useRoute } from '@react-navigation/core';
import bbox from '@turf/bbox';
import turfCenter from '@turf/center';
import i18next from 'i18next';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import Config from 'react-native-config';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import { Colors, Typography } from '_styles';
import { species_default } from '../../assets';
import { InventoryContext } from '../../reducers/inventory';
import { getInventory, updateInventory, updateLastScreen } from '../../repositories/inventory';
import dbLog from '../../repositories/logs';
import { getScientificSpeciesById } from '../../repositories/species';
import { LogTypes } from '../../utils/constants';
import getGeoJsonData from '../../utils/convertInventoryToGeoJson';
import { MULTI, OFF_SITE } from '../../utils/inventoryConstants';
import { AlertModal, Header, PrimaryButton, TopRightBackground } from '../Common';
import TreeCountModal from '../Common/TreeCountModal';
import SampleTreeMarkers from '../Common/SampleTreeMarkers';
import ManageSpecies from '../ManageSpecies';

MapboxGL.setAccessToken(Config.MAPBOXGL_ACCCESS_TOKEN);

export default function TotalTreesSpecies() {
  const [bounds, setBounds] = useState([]);
  const [isCameraRefVisible, setIsCameraRefVisible] = useState(false);
  const [centerCoordinate, setCenterCoordinate] = useState([]);
  const [showTreeCountModal, setShowTreeCountModal] = useState(false);
  const [treeCount, setTreeCount] = useState('');
  const [specie, setSpecie] = useState();
  const [specieIndex, setSpecieIndex] = useState();
  const [deleteSpecieAlert, setDeleteSpecieAlert] = useState(false);
  const [deleteSpeciesAlertDescription, setDeleteSpeciesAlertDescription] = useState(
    i18next.t('label.delete_species_delete_sample_tree_warning'),
  );

  const navigation = useNavigation();

  // reference for camera to focus on map
  const camera = useRef(null);

  const route = useRoute();

  // reference for map
  const map = useRef(null);
  const [showManageSpecies, setShowManageSpecies] = useState(false);
  const [isPointForMultipleTree, setIsPointForMultipleTree] = useState(false);
  const [inventory, setInventory] = useState();
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

  const { state: inventoryState } = useContext(InventoryContext);

  useEffect(() => {
    if (!route?.params?.redirectToOverview) {
      let data = {
        inventory_id: inventoryState.inventoryID,
        lastScreen: 'TotalTreesSpecies',
      };
      updateLastScreen(data);
    }
    initializeState();
  }, []);

  useEffect(() => {
    if (
      isCameraRefVisible &&
      bounds.length > 0 &&
      camera?.current?.fitBounds &&
      !isPointForMultipleTree
    ) {
      camera.current.fitBounds([bounds[0], bounds[1]], [bounds[2], bounds[3]], 30, 1000);
    }
    if (isCameraRefVisible && centerCoordinate.length > 0 && camera?.current?.setCamera) {
      let config = {
        centerCoordinate,
      };
      if (isPointForMultipleTree) {
        config.zoomLevel = 18;
      }
      camera.current.setCamera(config);
    }
  }, [isCameraRefVisible, bounds, centerCoordinate]);

  // initializes the state by updating state
  const initializeState = () => {
    if (inventoryState.inventoryID) {
      getInventory({ inventoryID: inventoryState.inventoryID }).then((inventoryData) => {
        setInventory(inventoryData);
        if (inventoryData.polygons.length > 0) {
          const geoJSONData = getGeoJsonData(inventoryData);
          if (
            inventoryData.polygons[0].coordinates.length === 1 &&
            inventoryData.polygons[0].isPolygonComplete
          ) {
            setIsPointForMultipleTree(true);
            setCenterCoordinate([
              inventoryData.polygons[0].coordinates[0].longitude,
              inventoryData.polygons[0].coordinates[0].latitude,
            ]);
          } else {
            setCenterCoordinate(turfCenter(geoJSONData.features[0]));

            setBounds(bbox(geoJSONData.features[0]));
          }

          setGeoJSON(geoJSONData);
        }
      });
    }
    setDeleteSpecieAlert(false);
    setShowTreeCountModal(false);
    setDeleteSpeciesAlertDescription(i18next.t('label.delete_species_delete_sample_tree_warning'));
  };

  const onPressDelete = (deleteSpecieIndex) => {
    setSpecieIndex(deleteSpecieIndex);
    let species = [...inventory.species];
    let sampleTrees = [...inventory.sampleTrees];
    const deleteSpecies = species[deleteSpecieIndex];
    sampleTrees.every((sampleTree, index) => {
      if (sampleTree.specieId === deleteSpecies.id) {
        setDeleteSpecieAlert(true);
        return false;
      } else if (index === sampleTrees.length - 1) {
        deleteSpecie(deleteSpecieIndex);
      } else {
        return true;
      }
    });
  };

  const deleteSpeciesAndSampleTrees = async (deleteSpeciesIndex) => {
    let species = [...inventory.species];
    let sampleTrees = [...inventory.sampleTrees];
    const deleteSpecies = species[deleteSpeciesIndex];

    // loops through sample trees and deletes all the sample trees which includes the species to be deleted
    for await (let sampleTree of [...inventory.sampleTrees]) {
      if (sampleTree.specieId === deleteSpecies.id) {
        sampleTrees.splice(sampleTrees.indexOf(sampleTree), 1);
      }
    }

    // deletes the species selected by the user
    const updatedSpecies = species.splice(deleteSpeciesIndex, 1);

    updateInventory({
      inventory_id: inventory.inventory_id,
      inventoryData: {
        species,
        sampleTrees,
        sampleTreesCount: sampleTrees.length < 5 ? Number(5) : sampleTrees.length,
        completedSampleTreesCount: sampleTrees.length,
      },
    })
      .then(() => {
        initializeState();

        dbLog.info({
          logType: LogTypes.INVENTORY,
          message: `Successfully deleted species and sampleTrees with id: ${updatedSpecies[0].id} for inventory with inventory_id: ${inventory.inventory_id}`,
        });
      })
      .catch((err) =>
        dbLog.error({
          logType: LogTypes.INVENTORY,
          message: `Failed to delete species and sampleTrees with id: ${updatedSpecies[0].id} for inventory with inventory_id: ${inventory.inventory_id}`,
          logStack: JSON.stringify(err),
        }),
      );
  };

  const deleteSpecie = (index) => {
    let species = [...inventory.species];
    const updatedSpecies = species.splice(index, 1);

    updateInventory({
      inventory_id: inventory.inventory_id,
      inventoryData: {
        species,
      },
    })
      .then(() => {
        initializeState();

        dbLog.info({
          logType: LogTypes.INVENTORY,
          message: `Successfully deleted specie with id: ${updatedSpecies[0].id} multiple tree having inventory_id: ${inventory.inventory_id}`,
        });
      })
      .catch((err) =>
        dbLog.error({
          logType: LogTypes.INVENTORY,
          message: `Failed to delete specie with id: ${updatedSpecies[0].id} multiple tree having inventory_id: ${inventory.inventory_id}`,
          logStack: JSON.stringify(err),
        }),
      );
  };

  const changeTreeCount = async () => {
    let species = [...inventory.species];
    if ((!treeCount || Number(treeCount) === 0) && inventory.sampleTrees.length > 0) {
      setSpecieIndex(specieIndex);
      let species = [...inventory.species];
      let sampleTrees = [...inventory.sampleTrees];
      const deleteSpecies = species[specieIndex];

      sampleTrees.every((sampleTree, index) => {
        if (sampleTree.specieId === deleteSpecies.id) {
          setDeleteSpecieAlert(true);
          setDeleteSpeciesAlertDescription(
            i18next.t('label.zero_tree_count_species_delete_sample_tree_warning'),
          );
          return false;
        } else if (index === sampleTrees.length - 1) {
          deleteSpecie(specieIndex);
        } else {
          return true;
        }
      });
    } else {
      if (!treeCount || Number(treeCount) === 0) {
        species.splice(specieIndex, 1);
      } else {
        species[specieIndex].treeCount = Number(treeCount);
      }

      await updateInventory({
        inventory_id: inventoryState.inventoryID,
        inventoryData: {
          species,
        },
      })
        .then(() => {
          setShowTreeCountModal(false);
          getInventory({ inventoryID: inventoryState.inventoryID }).then((inventoryData) => {
            setInventory(inventoryData);
          });
          dbLog.info({
            logType: LogTypes.INVENTORY,
            message: `Successfully changed tree count for specie with id: ${specie.guid} multiple tree having inventory_id: ${inventory.inventory_id}`,
          });
        })
        .catch((err) => {
          dbLog.error({
            logType: LogTypes.INVENTORY,
            message: `Failed to change tree count for specie with id: ${specie.guid} multiple tree having inventory_id: ${inventory.inventory_id}`,
            logStack: JSON.stringify(err),
          });
        });
    }
  };

  const addSpecieToInventory = (stringifiedSpecie) => {
    let specie = JSON.parse(stringifiedSpecie);

    let species = [...inventory.species];

    let deleteSpecieIndex;
    let updateSpecieIndex;
    for (const index in species) {
      if (species[index].id === specie.guid && specie.treeCount === 0) {
        deleteSpecieIndex = index;
        break;
      } else if (species[index].id === specie.guid && specie.treeCount > 0) {
        updateSpecieIndex = index;
      }
    }

    if (deleteSpecieIndex) {
      species.splice(deleteSpecieIndex, 1);
    } else if (updateSpecieIndex) {
      species[updateSpecieIndex].treeCount = specie.treeCount;
    } else if (specie.treeCount > 0) {
      species = [
        ...species,
        {
          aliases: specie.aliases ? specie.aliases : specie.scientificName,
          id: specie.guid,
          treeCount: specie.treeCount,
        },
      ];
    }

    updateInventory({
      inventory_id: inventory.inventory_id,
      inventoryData: {
        species,
      },
    })
      .then(() => {
        getInventory({ inventoryID: inventoryState.inventoryID }).then((inventoryData) => {
          setInventory(inventoryData);
        });
        dbLog.info({
          logType: LogTypes.INVENTORY,
          message: `Successfully added specie with id: ${specie.guid} multiple tree having inventory_id: ${inventory.inventory_id}`,
        });
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.INVENTORY,
          message: `Failed to add specie with id: ${specie.guid} multiple tree having inventory_id: ${inventory.inventory_id}`,
          logStack: JSON.stringify(err),
        });
        console.error(
          `Failed to add specie with id: ${specie.guid} multiple tree having inventory_id: ${inventory.inventory_id}`,
          err,
        );
      });
  };

  const renderMapView = () => {
    let shouldRenderShape = geoJSON.features[0].geometry.coordinates.length > 1;
    return (
      <MapboxGL.MapView
        showUserLocation={false}
        style={styles.mapContainer}
        ref={map}
        scrollEnabled={false}
        pitchEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}>
        <MapboxGL.Camera
          ref={(el) => {
            camera.current = el;
            setIsCameraRefVisible(!!el);
          }}
        />
        {shouldRenderShape && !isPointForMultipleTree && (
          <MapboxGL.ShapeSource id={'polygon'} shape={geoJSON}>
            <MapboxGL.LineLayer id={'polyline'} style={polyline} />
          </MapboxGL.ShapeSource>
        )}
        <SampleTreeMarkers geoJSON={geoJSON} isPointForMultipleTree={isPointForMultipleTree} />
      </MapboxGL.MapView>
    );
  };

  const handleContinuePress = () => {
    if (inventory?.completedSampleTreesCount > 0 || inventory?.locateTree === OFF_SITE) {
      navigation.navigate(
        inventory?.additionalDetails.length > 0 || route?.params?.redirectToOverview
          ? 'InventoryOverview'
          : 'AdditionalDataForm',
      );
    } else {
      navigation.navigate('SampleTreesCount');
    }
  };

  const getContinueButtonText = () => {
    if (inventory?.completedSampleTreesCount > 0 || inventory?.locateTree === OFF_SITE) {
      if (inventory?.additionalDetails.length > 0 || route?.params?.redirectToOverview) {
        return i18next.t('label.tree_review_continue_to_review');
      } else {
        return i18next.t('label.tree_review_continue_to_additional_data');
      }
    } else {
      return i18next.t('label.tree_review_continue_to_sampleTrees');
    }
  };

  if (showManageSpecies) {
    return (
      <>
        <ManageSpecies
          onPressBack={() => setShowManageSpecies(false)}
          registrationType={MULTI}
          addSpecieToInventory={addSpecieToInventory}
          isSampleTree={true}
          screen={'SelectSpecies'}
          isSampleTreeCompleted={true}
          retainNavigationStack={route?.params?.retainNavigationStack}
          deleteSpeciesAndSampleTrees={deleteSpeciesAndSampleTrees}
          deleteSpecie={deleteSpecie}
        />
        <AlertModal
          visible={deleteSpecieAlert}
          heading={i18next.t('label.delete_species')}
          message={deleteSpeciesAlertDescription}
          showSecondaryButton={true}
          primaryBtnText={i18next.t('label.tree_review_delete')}
          secondaryBtnText={i18next.t('label.cancel')}
          onPressPrimaryBtn={() => deleteSpeciesAndSampleTrees(specieIndex)}
          onPressSecondaryBtn={() => setDeleteSpecieAlert(false)}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.WHITE }}>
      <View style={styles.container}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <TopRightBackground />
          <View style={{ paddingHorizontal: 25 }}>
            <Header headingText={i18next.t('label.total_trees_header')} />
          </View>

          {/* container for description of what sample trees are and how to proceed */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              {i18next.t('label.add_all_trees_planted_on_site')}
            </Text>
          </View>
          {inventory && Array.isArray(inventory.species) && inventory.species.length > 0
            ? inventory.species.map((plantedSpecie, index) => (
              <TouchableOpacity
                onPress={() => {
                  setSpecie(plantedSpecie);
                  setSpecieIndex(index);
                  setShowTreeCountModal(true);
                }}
                key={index}>
                <SpecieListItem
                  item={plantedSpecie}
                  index={index}
                  key={`${plantedSpecie.id}`}
                  deleteSpecie={() =>
                    inventory.completedSampleTreesCount > 0
                      ? onPressDelete(index)
                      : deleteSpecie(index)
                  }
                  setSpecieIndex={setSpecieIndex}
                />
              </TouchableOpacity>
            ))
            : renderMapView()}
        </ScrollView>
        <View style={{ paddingHorizontal: 25 }}>
          <PrimaryButton
            onPress={() => setShowManageSpecies(true)}
            btnText={i18next.t('label.select_species_add_species')}
            theme={'primary'}
            testID={'sample_tree_count_continue'}
            accessibilityLabel={'sample_tree_count_continue'}
          />
          {inventory?.species?.length > 0 ? (
            <PrimaryButton
              onPress={handleContinuePress}
              btnText={getContinueButtonText()}
              theme={'white'}
              testID={'sample_tree_count_continue'}
              accessibilityLabel={'sample_tree_count_continue'}
            />
          ) : (
            []
          )}
        </View>
        <TreeCountModal
          showTreeCountModal={showTreeCountModal}
          setShowTreeCountModal={setShowTreeCountModal}
          treeCount={treeCount}
          setTreeCount={setTreeCount}
          activeSpecie={specie}
          onPressTreeCountNextBtn={changeTreeCount}
        />
        <AlertModal
          visible={deleteSpecieAlert}
          heading={i18next.t('label.delete_species')}
          message={deleteSpeciesAlertDescription}
          showSecondaryButton={true}
          primaryBtnText={i18next.t('label.tree_review_delete')}
          secondaryBtnText={i18next.t('label.cancel')}
          onPressPrimaryBtn={() => {
            deleteSpeciesAndSampleTrees(specieIndex);
          }}
          onPressSecondaryBtn={() => {
            setDeleteSpecieAlert(false);
            setDeleteSpeciesAlertDescription(
              i18next.t('label.delete_species_delete_sample_tree_warning'),
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

export const SpecieListItem = ({ item, index, deleteSpecie }) => {
  const [specieImage, setSpecieImage] = useState();
  const [species, setSpecies] = useState();
  useEffect(() => {
    getScientificSpeciesById(item?.id || item?.guid).then((specie) => {
      setSpecies(specie);
      setSpecieImage(specie.image);
    });
  }, [item]);
  return (
    <View
      key={index}
      style={{
        paddingVertical: 20,
        marginHorizontal: 25,
        borderBottomWidth: 1,
        borderColor: '#E1E0E061',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
      <View style={{ paddingRight: 20 }}>
        {specieImage ? (
          <Image
            source={{
              uri: `${specieImage}`,
            }}
            style={styles.imageView}
          />
        ) : (
          <Image
            source={species_default}
            style={{
              borderRadius: 8,
              resizeMode: 'contain',
              width: 100,
              height: 80,
            }}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: Typography.FONT_SIZE_16,
            fontFamily: Typography.FONT_FAMILY_REGULAR,
            color: Colors.TEXT_COLOR,
            fontStyle: 'italic',
          }}>
          {species?.guid === 'unknown' || species?.id === 'unknown'
            ? i18next.t('label.select_species_unknown')
            : item?.aliases}
        </Text>
        <Text
          style={{
            fontSize: Typography.FONT_SIZE_18,
            fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
            marginTop: 10,
            color: Colors.TEXT_COLOR,
          }}>
          {item?.treeCount}{' '}
          {item?.treeCount > 1 ? i18next.t('label.trees') : i18next.t('label.tree')}
        </Text>
      </View>
      {deleteSpecie ? (
        <TouchableOpacity
          onPress={() => {
            deleteSpecie(index);
          }}>
          <FAIcon name="minus-circle" size={20} color="#e74c3c" />
        </TouchableOpacity>
      ) : (
        []
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: Colors.WHITE,
    position: 'relative',
  },
  mapContainer: {
    backgroundColor: Colors.WHITE,
    height: 230,
    marginVertical: 40,
    paddingHorizontal: 25,
  },
  descriptionContainer: {
    marginTop: 40,
    paddingHorizontal: 25,
  },
  description: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_18,
    color: Colors.TEXT_COLOR,
  },
  descriptionMarginTop: {
    marginTop: 20,
  },
  treeCountSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 30,
  },
  treeCountSelection: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.LIGHT_BORDER_COLOR,
    padding: 10,
    minWidth: '28%',
  },
  treeCountSelectionActive: {
    borderWidth: 0,
    padding: 11,
    backgroundColor: Colors.PRIMARY,
  },
  treeCountSelectionText: {
    color: Colors.TEXT_COLOR,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_16,
    textAlign: 'center',
  },
  treeCountSelectionActiveText: {
    color: Colors.WHITE,
    fontFamily: Typography.FONT_FAMILY_BOLD,
  },
  imageView: {
    borderRadius: 8,
    resizeMode: 'cover',
    width: 100,
    height: 80,
    backgroundColor: Colors.TEXT_COLOR,
  },
});

const polyline = { lineWidth: 2, lineColor: Colors.BLACK };
