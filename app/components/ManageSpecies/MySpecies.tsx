import i18next from 'i18next';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors, Typography } from '../../styles';
import { empty, species_default } from '../../assets';
import { SINGLE } from '../../utils/inventoryConstants';
import { ScientificSpeciesType } from '../../utils/ScientificSpecies/ScientificSpeciesTypes';

interface MySpeciesProps {
  registrationType: any;
  onPressSpeciesSingle: () => void;
  specieList: ScientificSpeciesType[];
  addSpecieToInventory: (specie: ScientificSpeciesType) => void;
  editOnlySpecieName: any;
  onPressBack: () => void;
  isSampleTree: boolean;
  navigateToSpecieInfo: (specie: ScientificSpeciesType) => void;
  screen: string;
}

const MySpecies: React.FC<MySpeciesProps> = ({
  registrationType,
  onPressSpeciesSingle,
  specieList,
  addSpecieToInventory,
  editOnlySpecieName,
  onPressBack,
  isSampleTree,
  navigateToSpecieInfo,
  screen,
}) => {
  const renderSpecieCard = ({ item, index }: { item: ScientificSpeciesType; index: number }) => {
    return (
      <SpecieCard
        item={item}
        index={index}
        registrationType={registrationType}
        onPressSpecies={onPressSpeciesSingle}
        addSpecieToInventory={addSpecieToInventory}
        editOnlySpecieName={editOnlySpecieName}
        onPressBack={onPressBack}
        isSampleTree={isSampleTree}
        navigateToSpecieInfo={navigateToSpecieInfo}
        screen={screen}
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View>
        <Text
          style={{
            paddingTop: 25,
            paddingBottom: 15,
            fontFamily: Typography.FONT_FAMILY_BOLD,
            fontSize: Typography.FONT_SIZE_16,
          }}>
          {i18next.t('label.select_species_my_species')}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        {specieList && specieList.length !== 0 ? (
          <FlatList
            style={{ flex: 1 }}
            data={specieList}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.guid}
            renderItem={renderSpecieCard}
            keyboardShouldPersistTaps="always"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 20 }}>
            <SvgXml
              xml={empty}
              style={{
                bottom: 10,
              }}
            />
            <Text style={styles.headerText}>
              {i18next.t('label.select_species_looks_empty_here')}
            </Text>
            <Text style={styles.subHeadingText}>
              {i18next.t('label.select_species_add_species_desscription')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

interface SpecieCardProps {
  item: any;
  index: number;
  registrationType?: any;
  onPressSpecies: any;
  addSpecieToInventory?: (specie: ScientificSpeciesType) => void;
  editOnlySpecieName?: any;
  onPressBack?: any;
  isSampleTree: any;
  navigateToSpecieInfo?: (specie: ScientificSpeciesType) => void;
  screen?: string;
  isSampleTreeSpecies?: boolean;
}

export const SpecieCard: React.FC<SpecieCardProps> = ({
  item,
  index,
  registrationType,
  onPressSpecies,
  addSpecieToInventory,
  editOnlySpecieName,
  onPressBack,
  isSampleTree,
  navigateToSpecieInfo,
  screen,
  isSampleTreeSpecies,
}) => {
  return (
    <TouchableOpacity
      key={index}
      style={{
        flex: 1,
        paddingTop: 20,
        paddingBottom: 20,
        paddingRight: 10,
        borderBottomWidth: 1,
        borderColor: '#E1E0E061',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      onPress={() => {
        if (isSampleTree && isSampleTreeSpecies) {
          onPressSpecies(item);
        } else if ((registrationType || isSampleTree) && addSpecieToInventory) {
          addSpecieToInventory(item);
          if (editOnlySpecieName && (registrationType === SINGLE || isSampleTree)) {
            onPressBack();
          } else if (registrationType === SINGLE && !editOnlySpecieName) {
            onPressSpecies(item);
          }
        } else if (screen === 'ManageSpecies' && navigateToSpecieInfo) {
          navigateToSpecieInfo(item);
        }
      }}>
      <View style={{ paddingRight: 18 }}>
        {item.image ? (
          <Image
            source={{
              uri: `${item.image}`,
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
            fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
            paddingBottom: 6,
          }}>
          {(item.guid !== 'unknown' || item.id === 'unknown') ? item.aliases : i18next.t('label.select_species_unknown')}
        </Text>
        <Text
          style={{
            fontSize: Typography.FONT_SIZE_12,
            fontFamily: Typography.FONT_FAMILY_REGULAR,
          }}>
          {(item.guid !== 'unknown' || item.id === 'unknown') ? item.scientificName : i18next.t('label.select_species_unknown')}
        </Text>
      </View>
      {item.guid !== 'unknown' && screen === 'SelectSpecies' && navigateToSpecieInfo ? (
        <TouchableOpacity onPress={() => navigateToSpecieInfo(item)}>
          <Ionicons name="information-circle-outline" size={20} />
        </TouchableOpacity>
      ) : (
        []
      )}
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  headerText: {
    fontFamily: Typography.FONT_FAMILY_EXTRA_BOLD,
    fontSize: Typography.FONT_SIZE_27,
    lineHeight: Typography.LINE_HEIGHT_40,
    color: Colors.TEXT_COLOR,
    paddingTop: 10,
    paddingBottom: 15,
  },
  subHeadingText: {
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    fontSize: Typography.FONT_SIZE_18,
    lineHeight: Typography.LINE_HEIGHT_24,
    color: Colors.TEXT_COLOR,
    paddingLeft: 25,
    paddingRight: 25,
    textAlign: 'center',
  },
  imageView: {
    borderRadius: 8,
    resizeMode: 'cover',
    width: 100,
    height: 80,
    backgroundColor: Colors.TEXT_COLOR,
  },
});

export default MySpecies;
