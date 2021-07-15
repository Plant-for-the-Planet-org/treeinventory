import { useNavigation, useRoute } from '@react-navigation/native';
import i18next from 'i18next';
import React, { useContext, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { Colors } from '../../styles';
import { InventoryContext } from '../../reducers/inventory';
import { updateInventory } from '../../repositories/inventory';
import dbLog from '../../repositories/logs';
import { LogTypes } from '../../utils/constants';
import { Header, PrimaryButton } from '../Common';
import ProjectList from './ProjectList';

interface SelectProjectProps {}

export default function SelectProject({}: SelectProjectProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const { state: inventoryState } = useContext(InventoryContext);

  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    if (route?.params?.selectedProjectId) {
      setSelectedProjectId(route?.params?.selectedProjectId);
    } else {
      setSelectedProjectId('');
    }
  }, [route]);

  const onProjectPress = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const onPressContinue = () => {
    updateInventory({
      inventory_id: inventoryState.inventoryID,
      inventoryData: { projectId: selectedProjectId },
    })
      .then(() => {
        dbLog.info({
          logType: LogTypes.INVENTORY,
          message: `Added project id ${selectedProjectId} to inventory ${inventoryState.inventoryID}`,
          referenceId: inventoryState.inventoryID,
        });
        navigation.goBack();
      })
      .catch((err) => {
        dbLog.info({
          logType: LogTypes.INVENTORY,
          message: `Error while adding project id ${selectedProjectId} to inventory ${inventoryState.inventoryID}`,
          referenceId: inventoryState.inventoryID,
          logStack: JSON.stringify(err),
        });
      });
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={styles.container}>
        <Header
          headingText={i18next.t('label.select_project')}
          subHeadingText={i18next.t('label.select_project_desc')}
        />

        <ProjectList
          isSelectable
          onProjectPress={onProjectPress}
          selectedProjectId={selectedProjectId}
        />
        <PrimaryButton
          onPress={onPressContinue}
          btnText={i18next.t('label.continue')}
          style={{ marginTop: 10 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
  },
});
