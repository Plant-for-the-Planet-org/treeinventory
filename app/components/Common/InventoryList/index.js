import React, { useContext } from 'react';
import i18next from 'i18next';
import { TouchableOpacity, FlatList } from 'react-native';
import InventoryCard from '../InventoryCard';
import { useNavigation } from '@react-navigation/native';
import { InventoryContext } from '../../../reducers/inventory';
import { setInventoryId } from '../../../actions/inventory';
import {
  INCOMPLETE,
  INCOMPLETE_SAMPLE_TREE,
  OFF_SITE,
  SINGLE,
  SYNCED,
} from '../../../utils/inventoryConstants';

export default function InventoryList({ inventoryList, accessibilityLabel, countryCode }) {
  const navigation = useNavigation();

  const { dispatch } = useContext(InventoryContext);

  const onPressInventory = (item) => {
    setInventoryId(item.inventory_id)(dispatch);
    if (item.status !== INCOMPLETE && item.status !== INCOMPLETE_SAMPLE_TREE) {
      if (item.treeType === SINGLE) {
        navigation.navigate('SingleTreeOverview');
      } else {
        navigation.navigate('InventoryOverview');
      }
    } else {
      navigation.navigate(item.lastScreen);
    }
  };
  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      data={inventoryList}
      keyExtractor={(item, index) => `inventory-${index}`}
      renderItem={({ item }) => {
        let imageURL;
        let cdnImageUrl;
        let isOffSitePoint = false;
        if (
          item.polygons[0] &&
          item.polygons[0].coordinates &&
          item.polygons[0].coordinates.length
        ) {
          imageURL = item.polygons[0].coordinates[0].imageUrl;
          cdnImageUrl = item.polygons[0].coordinates[0].cdnImageUrl;
          isOffSitePoint = item.polygons[0].coordinates.length === 1;
        }
        let locateTreeAndType = '';
        let title = '';
        if (item.locateTree === OFF_SITE) {
          locateTreeAndType = i18next.t('label.tree_inventory_off_site');
        } else {
          locateTreeAndType = i18next.t('label.tree_inventory_on_site');
        }
        if (item.treeType === SINGLE) {
          title =
            `1 ${item.species.length > 0 ? `${item.species[0].aliases} ` : ''}` +
            i18next.t('label.tree_inventory_tree');
          locateTreeAndType += ' - ' + i18next.t('label.tree_inventory_point');
        } else {
          let totalTreeCount = 0;
          let species = item.species;

          for (let i = 0; i < species.length; i++) {
            const oneSpecies = species[i];
            totalTreeCount += Number(oneSpecies.treeCount);
          }
          title = `${totalTreeCount} ` + i18next.t('label.tree_inventory_trees');
          locateTreeAndType += ` - ${
            isOffSitePoint
              ? i18next.t('label.tree_inventory_point')
              : i18next.t('label.tree_inventory_polygon')
          }`;
        }
        let data = {
          title: title,
          subHeading: locateTreeAndType,
          date: i18next.t('label.inventory_overview_date', {
            date: item.registrationDate,
          }),
          imageURL,
          cdnImageUrl,
          status: item.status,
          treeType: item.treeType,
          diameter: item.specieDiameter,
          height: item.specieHeight,
          tagId: item.tagId,
          countryCode: countryCode,
        };

        return (
          <TouchableOpacity
            onPress={() => onPressInventory(item)}
            accessible={true}
            accessibilityLabel={accessibilityLabel}
            testID="upload_inventory_list">
            <InventoryCard
              icon={
                item.status === INCOMPLETE || item.status === INCOMPLETE_SAMPLE_TREE
                  ? null
                  : item.status === SYNCED
                    ? 'cloud-check'
                    : 'cloud-outline'
              }
              data={data}
            />
          </TouchableOpacity>
        );
      }}
    />
  );
}
