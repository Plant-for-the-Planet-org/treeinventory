import { useNavigation } from '@react-navigation/native';
import i18next from 'i18next';
import React, { useContext, useEffect, useState, useRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { Colors, Typography } from '_styles';
import { InventoryContext } from '../../reducers/inventory';
import { updateInventory, updateLastScreen } from '../../repositories/inventory';
import { AlertModal, Header, PrimaryButton, TopRightBackground } from '../Common';

/**
 * Maps/Shows the button to select the sample tree count which user is going to add
 * @prop @param sampleTreesCount - array of tree count to map/show on UI
 * @prop @param selectedTreeCount - count of tree for selected option
 */
const TreeNumberSelection = ({ sampleTreesCount, selectedTreeCount, setSelectedTreeCount }) => {
  const [isCustomSelected, setIsCustomSelected] = useState(false);
  const customInputRef = useRef(null);
  return (
    <View style={styles.treeCountSelectionContainer}>
      {/* if sample tree count is present and has length greater than zero then maps the array */}
      {sampleTreesCount &&
        sampleTreesCount.length > 0 &&
        sampleTreesCount.map((treeCount, index) => {
          // used to show the selected tree count selected by user
          const isSelected = treeCount === selectedTreeCount;
          return (
            <TouchableOpacity
              onPress={() => {
                setIsCustomSelected(false);
                setSelectedTreeCount(treeCount);
              }}
              key={`tree-number-selection-${index}`}>
              <View
                style={[
                  styles.treeCountSelection,
                  isSelected ? styles.treeCountSelectionActive : {},
                ]}>
                <Text
                  style={[
                    styles.treeCountSelectionText,
                    isSelected ? styles.treeCountSelectionActiveText : {},
                  ]}>
                  {treeCount + '\n'}{' '}
                  {treeCount === 1 ? i18next.t('label.tree') : i18next.t('label.trees')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      <TouchableOpacity
        onPress={() => {
          setIsCustomSelected(true);
          setSelectedTreeCount(null);
          customInputRef.current.focus();
        }}>
        <View
          style={[
            styles.treeCountInputSelection,
            isCustomSelected ? styles.treeCountSelectionActive : {},
          ]}>
          <TextInput
            value={selectedTreeCount}
            style={
              [
                styles.customTreeCount,
                { borderBottomColor: isCustomSelected ? 'white' : Colors.TEXT_COLOR },
                // isCustomSelected
                //   ? { borderBottomColor: 'white' }
                //   : { borderBottomColor: Colors.TEXT_COLOR },
              ]
              // borderBottomColor: isCustomSelected ? 'white' : Colors.TEXT_COLOR,
            }
            selectionColor={'white'}
            keyboardType={'numeric'}
            onFocus={() => {
              setIsCustomSelected(true);
              setSelectedTreeCount(null);
            }}
            textAlign={'center'}
            ref={customInputRef}
            onChangeText={(text) => {
              setSelectedTreeCount(text.replace(/,./g, '').replace(/[^0-9]/g, ''));
            }}
          />
          <Text
            style={[
              styles.treeCountSelectionText,
              isCustomSelected ? styles.treeCountSelectionActiveText : {},
            ]}>
            {i18next.t('label.trees')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// shows the sample tree initial screen where user selects the number of sample trees to record.
export default function SampleTreesCount() {
  // used to show the tree count selection option with values of array as number of trees to select
  const sampleTreesCount = ['5', '10', '20'];

  // used to set the selected tree count
  const [selectedTreeCount, setSelectedTreeCount] = useState(null);
  const [inputError, setInputError] = useState(false);
  // gets the inventory state to get the inventory id selected currently
  const { state } = useContext(InventoryContext);

  // used for navigation
  const navigation = useNavigation();
  const dimensionRegex = /^\d{0,3}(\.\d{0})?$/;

  // sets the sample tree count in the inventory schema and the navigates to map marking of sample trees
  const onPressContinue = () => {
    if (Number(selectedTreeCount) > 4 && dimensionRegex.test(selectedTreeCount)) {
      updateInventory({
        inventory_id: state.inventoryID,
        inventoryData: {
          sampleTreesCount: Number(selectedTreeCount),
        },
      });
      navigation.navigate('RecordSampleTrees');
    } else {
      setInputError(true);
    }
  };

  // changes the inventory last screen to sample trees count
  useEffect(() => {
    let data = {
      inventory_id: state.inventoryID,
      lastScreen: 'SampleTreesCount',
    };
    setSelectedTreeCount('5');
    updateLastScreen(data);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.WHITE }}>
      <View style={styles.container}>
        <ScrollView style={{}} showsVerticalScrollIndicator={false}>
          <TopRightBackground style={{ paddingHorizontal: 0, resizeMode: 'cover' }} />
          <View style={{ paddingHorizontal: 25 }}>
            <Header headingText={i18next.t('label.sample_trees')} />
            {/* container for description of what sample trees are and how to proceed */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>
                {i18next.t('label.next_step_to_measure_sample_trees_text')}
              </Text>
              <Text style={[styles.description, styles.descriptionMarginTop]}>
                {i18next.t('label.recommend_at_least_sample_trees')}
              </Text>
              <Text style={[styles.description, styles.descriptionMarginTop]}>
                {i18next.t('label.sample_one_tree_for_each_species')}
              </Text>
              <Text
                style={[
                  styles.description,
                  styles.descriptionMarginTop,
                  { fontFamily: Typography.FONT_FAMILY_BOLD },
                ]}>
                {i18next.t('label.how_many_sample_trees_to_record')}
              </Text>
            </View>

            {/* container for sample tree count selection options */}
            <TreeNumberSelection
              sampleTreesCount={sampleTreesCount}
              selectedTreeCount={selectedTreeCount}
              setSelectedTreeCount={setSelectedTreeCount}
            />
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 25, marginTop: 10 }}>
          <PrimaryButton
            onPress={onPressContinue}
            btnText={i18next.t('label.continue')}
            theme={'primary'}
            testID={'sample_tree_count_continue'}
            accessibilityLabel={'sample_tree_count_continue'}
          />
        </View>
        <AlertModal
          heading={i18next.t('label.invalid_tree_count')}
          message={i18next.t('label.enter_valid_tree_count')}
          visible={inputError}
          showSecondaryButton={false}
          primaryBtnText={i18next.t('label.ok')}
          onPressPrimaryBtn={() => setInputError(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingHorizontal: 25,
    backgroundColor: Colors.WHITE,
    position: 'relative',
  },

  descriptionContainer: {
    marginTop: 40,
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    // alignItems: 'stretch',
    marginVertical: 30,
  },
  treeCountSelection: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.LIGHT_BORDER_COLOR,
    padding: 10,
    marginBottom: 15,
    minWidth: '45%',
  },
  treeCountInputSelection: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.LIGHT_BORDER_COLOR,
    padding: 10,
    paddingTop: 3,
    marginBottom: 15,
    minWidth: '45%',
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
  customTreeCount: {
    borderBottomWidth: 1,
    paddingVertical: 0,
    alignSelf: 'center',
    width: 70,
    color: Colors.WHITE,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_16,
  },
});
