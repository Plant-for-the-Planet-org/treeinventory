import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import updateAndSyncLocalSpecies from '../../../utils/updateAndSyncLocalSpecies';
import RotatingView from '../RotatingView';
import Icon from 'react-native-vector-icons/FontAwesome5';
import AsyncStorage from '@react-native-community/async-storage';
import Snackbar from 'react-native-snackbar';
import { Colors, Typography } from '_styles';
import i18next from 'i18next';
import dbLog from '../../../repositories/logs';
import { LogTypes } from '../../../utils/constants';
import { NavigationContext } from '../../../reducers/navigation';
import { showInitialNavigationStack } from '../../../actions/navigation';
import { useNetInfo } from '@react-native-community/netinfo';

//Component which will be rendered on Mainscreen and Managespecies when species are not synced or downloaded
const SpeciesSyncError = () => {
  const [refreshAnimation, setRefreshAnimation] = useState(false);
  const [asyncStorageSpecies, setAsyncStorageSpecies] = useState(false);
  const [updatingSpeciesState, setUpdatingSpeciesState] = useState('');

  const { dispatch } = useContext(NavigationContext);

  const netInfo = useNetInfo();

  useEffect(() => {
    const setIsSpeciesUpdated = async () => {
      const species = await AsyncStorage.getItem('isLocalSpeciesUpdated');
      setAsyncStorageSpecies(species);
    };

    setIsSpeciesUpdated();
  }, []);

  //Syncs species if not downloaded already due to network error
  const speciesCheck = () => {
    updateAndSyncLocalSpecies(setUpdatingSpeciesState)
      .then(async () => {
        setRefreshAnimation(false);
        const species = await AsyncStorage.getItem('isLocalSpeciesUpdated');
        setAsyncStorageSpecies(species);
      })
      .catch((err) => {
        setRefreshAnimation(false);
        dbLog.error({
          logType: LogTypes.OTHER,
          message: 'Failed to sync species that are not downloaded already',
          logStack: JSON.stringify(err),
        });
        Snackbar.show({
          text: i18next.t('label.something_went_wrong'),
          duration: Snackbar.LENGTH_SHORT,
          backgroundColor: '#e74c3c',
        });
      });
  };

  const onPressRefreshIcon = () => {
    if (netInfo.isConnected && netInfo.isInternetReachable) {
      speciesCheck();
      showInitialNavigationStack()(dispatch);
      setRefreshAnimation(true);
    } else {
      Snackbar.show({
        text: i18next.t('label.no_internet_connection'),
        duration: Snackbar.LENGTH_SHORT,
        backgroundColor: '#e74c3c',
      });
    }
  };

  return (
    <View>
      {asyncStorageSpecies !== 'true' && asyncStorageSpecies !== false ? (
        <View style={styles.speciesZipWarning}>
          <View style={{ width: '80%', marginRight: 16, flex: 4 }}>
            <Text style={styles.speciesHeading}>{i18next.t('label.speciesSyncError_heading')}</Text>
            <Text style={styles.speciesText}>{i18next.t('label.speciesSyncError_text')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              onPressRefreshIcon();
            }}
            style={{
              padding: 10,
              backgroundColor: '#FFC400',
              borderRadius: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {refreshAnimation ? (
              <RotatingView isClockwise={true}>
                <Icon name="sync-alt" size={22} color="#FFF" />
              </RotatingView>
            ) : (
              <Icon name="sync-alt" size={22} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        []
      )}
    </View>
  );
};

export default SpeciesSyncError;

const styles = StyleSheet.create({
  speciesZipWarning: {
    marginTop: 26,
    borderRadius: 5,
    borderColor: '#FFC400',
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speciesHeading: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontSize: Typography.FONT_SIZE_14,
    color: Colors.TEXT_COLOR,
    paddingBottom: 8,
  },
  speciesText: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_12,
    color: Colors.TEXT_COLOR,
  },
});
