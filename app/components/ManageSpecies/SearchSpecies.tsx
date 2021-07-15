import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Typography } from '../../styles';
import Icon from 'react-native-vector-icons/Feather';
import { SINGLE } from '../../utils/inventoryConstants';
import { ScientificSpeciesType } from '../../utils/ScientificSpecies/ScientificSpeciesTypes';

interface SearchSpeciesProps {
  searchList: ScientificSpeciesType[];
  toggleUserSpecies: (guid: string, addSpecie?: boolean) => Promise<unknown>;
  registrationType: any;
  onPressSpeciesSingle: any;
  addSpecieToInventory: (specie: any) => void;
  editOnlySpecieName: any;
  onPressBack: (() => void) | undefined;
  clearSearchText: any;
  isSampleTree: boolean;
}

const SearchSpecies: React.FC<SearchSpeciesProps> = ({
  searchList,
  toggleUserSpecies,
  registrationType,
  onPressSpeciesSingle,
  addSpecieToInventory,
  editOnlySpecieName,
  onPressBack,
  clearSearchText,
  isSampleTree,
}) => {
  const renderSearchSpecieCard = ({
    item,
    index,
  }: {
    item: ScientificSpeciesType;
    index: number;
  }) => {
    const isCheck = item.isUserSpecies;

    const SpecieListItem = () => {
      return (
        <>
          <View>
            <Text
              style={{
                fontSize: Typography.FONT_SIZE_16,
                fontFamily: Typography.FONT_FAMILY_REGULAR,
              }}>
              {item.scientificName}
            </Text>
          </View>
          <TouchableOpacity
            key={index}
            onPress={() => {
              toggleUserSpecies(item.guid);
            }}>
            <Icon
              name={isCheck ? 'check-circle' : 'plus-circle'}
              size={25}
              color={isCheck ? Colors.PRIMARY : Colors.TEXT_COLOR}
            />
          </TouchableOpacity>
        </>
      );
    };

    return (
      <TouchableOpacity
        key={index}
        style={styles.specieListItem}
        onPress={() => {
          toggleUserSpecies(item.guid, true);
          if (registrationType || isSampleTree) {
            addSpecieToInventory(item);
          }
          if (editOnlySpecieName && (registrationType === SINGLE || isSampleTree) && onPressBack) {
            onPressBack();
          } else if (registrationType === SINGLE && !editOnlySpecieName) {
            onPressSpeciesSingle(item);
          }

          if (registrationType === SINGLE) {
            clearSearchText();
          }
        }}>
        <SpecieListItem />
      </TouchableOpacity>
    );
  };

  const memoizedRenderSearchSpecieCard = React.useMemo(() => renderSearchSpecieCard, [searchList]);

  return (
    <View style={{ flex: 1, paddingTop: 15 }}>
      <FlatList
        style={{ flex: 1 }}
        data={searchList}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.guid}
        renderItem={memoizedRenderSearchSpecieCard}
        keyboardShouldPersistTaps="always"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  specieListItem: {
    paddingVertical: 20,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderColor: '#E1E0E061',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default SearchSpecies;
