import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Typography } from '_styles';
import ImageCapturing from '../Common/ImageCapturing';
import MapMarking from '../Common/MapMarking';
import { getInventory, updateLastScreen } from '../../repositories/inventory';
import { InventoryContext } from '../../reducers/inventory';
import { MULTI, ON_SITE } from '../../utils/inventoryConstants';

const CreatePolygon = ({ route }) => {
  const { state } = useContext(InventoryContext);

  const [isMapMarkingState, setIsMapMarkingState] = useState(true);
  const [isCompletePolygon, setIsCompletePolygon] = useState(false);
  const [activeMarkerIndex, setActiveMarkerIndex] = useState(0);
  const [locateTree, setLocateTree] = useState(ON_SITE);

  useEffect(() => {
    checkIsEdit();
    if (state.inventoryID) {
      let data = { inventory_id: state.inventoryID, lastScreen: 'CreatePolygon' };
      updateLastScreen(data);
      getInventory({ inventoryID: state.inventoryID }).then((inventory) => {
        let coordinatesLength = inventory.polygons[0].coordinates.length;
        if (
          !inventory.polygons[0].coordinates[coordinatesLength - 1].imageUrl &&
          inventory.locateTree === ON_SITE
        ) {
          updateActiveMarkerIndex(coordinatesLength - 1);
          setIsMapMarkingState(false);
        }
      });
    }
    if (route?.params?.locateTree) {
      setLocateTree(route.params.locateTree);
    }
  }, []);

  const checkIsEdit = () => {
    if (route.params?.isEdit && state.inventoryID) {
      getInventory({ inventoryID: state.inventoryID }).then((inventory) => {
        setIsMapMarkingState(false);
        setActiveMarkerIndex(inventory.polygons[0].coordinates.length - 1);
        setLocateTree(inventory.locateTree);
      });
    }
  };

  const toggleState = () => {
    setIsMapMarkingState(!isMapMarkingState);
  };

  const updateActiveMarkerIndex = (index) => {
    setActiveMarkerIndex(index);
  };
  return (
    <View style={styles.container} fourceInset={{ bottom: 'never', top: 'never' }}>
      <View style={styles.container}>
        {isMapMarkingState ? (
          <MapMarking
            toggleState={toggleState}
            isCompletePolygon={isCompletePolygon}
            setIsCompletePolygon={setIsCompletePolygon}
            activeMarkerIndex={activeMarkerIndex}
            updateActiveMarkerIndex={updateActiveMarkerIndex}
            multipleLocateTree={locateTree}
            treeType={MULTI}
          />
        ) : (
          <ImageCapturing
            toggleState={toggleState}
            updateActiveMarkerIndex={updateActiveMarkerIndex}
            activeMarkerIndex={activeMarkerIndex}
            isCompletePolygon={isCompletePolygon}
            inventoryType={MULTI}
          />
        )}
      </View>
    </View>
  );
};
export default CreatePolygon;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addSpecies: {
    color: Colors.ALERT,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_18,
    lineHeight: Typography.LINE_HEIGHT_30,
  },
});
