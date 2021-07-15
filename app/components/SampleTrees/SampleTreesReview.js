import i18next from 'i18next';
import React, { useEffect, useState, useContext } from 'react';
import { FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNFS from 'react-native-fs';
import { CommonActions, useIsFocused } from '@react-navigation/native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { Colors, Typography } from '_styles';
import { single_tree_png } from '../../assets';
import { cmToInch, meterToFoot, nonISUCountries } from '../../utils/constants';
import Label from '../Common/Label';
import { getUserInformation } from '../../repositories/user';
import { APIConfig } from '../../actions/Config';
import { setSkipToInventoryOverview } from '../../actions/inventory';
import { InventoryContext } from '../../reducers/inventory';
import { getInventory, updateInventory, updateLastScreen } from '../../repositories/inventory';
import { INCOMPLETE, INCOMPLETE_SAMPLE_TREE } from '../../utils/inventoryConstants';

const { protocol, cdnUrl } = APIConfig;

const SampleTreeListItem = ({ sampleTree, totalSampleTrees, index, navigation, countryCode }) => {
  const imageURIPrefix = Platform.OS === 'android' ? 'file://' : '';
  let imageSource = sampleTree.imageUrl
    ? { uri: `${imageURIPrefix}${RNFS.DocumentDirectoryPath}/${sampleTree.imageUrl}` }
    : sampleTree.cdnImageUrl
      ? {
        uri: `${protocol}://${cdnUrl}/media/cache/coordinate/thumb/${sampleTree.cdnImageUrl}`,
      }
      : single_tree_png;

  const specieHeight = nonISUCountries.includes(countryCode)
    ? sampleTree.specieHeight * meterToFoot
    : sampleTree.specieHeight;
  const specieDiameter = nonISUCountries.includes(countryCode)
    ? sampleTree.specieDiameter * cmToInch
    : sampleTree.specieDiameter;

  const heightUnit = nonISUCountries.includes(countryCode)
    ? i18next.t('label.select_species_feet')
    : 'm';
  const diameterUnit = nonISUCountries.includes(countryCode)
    ? i18next.t('label.select_species_inches')
    : 'cm';

  return (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate('SingleTreeOverview', {
          isSampleTree: true,
          sampleTreeIndex: index,
          totalSampleTrees,
        });
      }}>
      <View style={styles.specieListItemContainer}>
        <Image source={imageSource} style={styles.image} resizeMode={'stretch'} />
        <View style={styles.specieListTextContainer}>
          <Text style={styles.specieListHeading}>
            {`${sampleTree.specieName}${sampleTree.tagId ? ' • ' + sampleTree.tagId : ''}`}
          </Text>
          <Text style={styles.subHeadingText}>
            #{index + 1} • {Math.round(specieHeight * 100) / 100} {heightUnit} •{' '}
            {Math.round(specieDiameter * 100) / 100} {diameterUnit}
          </Text>
        </View>
        <FAIcon name="angle-right" size={30} color={Colors.GRAY_DARK} />
      </View>
    </TouchableOpacity>
  );
};

export default function SampleTreesReview({
  sampleTrees,
  totalSampleTrees,
  navigation,
  inventoryDispatch,
}) {
  const [countryCode, setCountryCode] = useState('');
  const [inventory, setInventory] = useState();
  const { state } = useContext(InventoryContext);
  const isFocused = useIsFocused();
  useEffect(() => {
    getUserInformation().then((data) => {
      setCountryCode(data.country);
    });
    getInventory({ inventoryID: state.inventoryID }).then((inventoryData) => {
      setInventory(inventoryData);
    });
  }, [isFocused]);

  const addSampleTree = () => {
    updateInventory({
      inventory_id: state.inventoryID,
      inventoryData: {
        sampleTreesCount:
          inventory.sampleTreesCount === inventory.completedSampleTreesCount
            ? inventory.sampleTreesCount + 1
            : inventory.sampleTreesCount,
      },
    }).then(() => {
      let data = {
        inventory_id: inventory.inventory_id,
        lastScreen: 'RecordSampleTrees',
      };
      updateLastScreen(data);
      setSkipToInventoryOverview(true)(inventoryDispatch);
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
    });
  };
  return (
    <View style={{ marginBottom: 24 }}>
      <Label
        leftText={i18next.t('label.sample_trees')}
        rightText={
          inventory?.status === INCOMPLETE || inventory?.status === INCOMPLETE_SAMPLE_TREE
            ? i18next.t('label.add_another')
            : []
        }
        onPressRightText={addSampleTree}
      />
      <FlatList
        data={sampleTrees}
        renderItem={({ item: sampleTree, index }) => {
          return (
            <SampleTreeListItem
              sampleTree={sampleTree}
              totalSampleTrees={totalSampleTrees}
              index={index}
              navigation={navigation}
              countryCode={countryCode}
            />
          );
        }}
        keyExtractor={(item, index) => `location-${index}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  specieListItemContainer: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.GRAY_LIGHT,
  },
  specieListTextContainer: {
    justifyContent: 'center',
    marginHorizontal: 16,
    flex: 1,
  },
  specieListHeading: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
    marginBottom: 6,
  },
  subHeadingText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  image: {
    height: 60,
    width: 60,
    borderRadius: 6,
  },
});
