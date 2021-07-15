import {
  addUserSpecie,
  getSpeciesList,
  deleteUserSpecie,
  updateUserSpecie,
} from '../actions/species';
import { bugsnag } from './index';
import dbLog from '../repositories/logs';
import {
  updateAndGetUserSpeciesToSync,
  addSpecieIdFromSyncedSpecie,
  removeSpecieId,
} from '../repositories/species';
import { LogTypes } from './constants';
import AsyncStorage from '@react-native-community/async-storage';
/**
 * This function first checks if the scientific species are updated in local DB then only checks
 * for already uploaded species of user from server and updates the status of same in local DB.
 * Followed by filtering out the species from local DB which are not uploaded/synced to server and
 * then creates the not uploaded user's species on server one by one.
 */
export const checkAndAddUserSpecies = async () => {
  try {
    // calls the function and stores whether species data was already loaded or not
    const isSpeciesLoaded = await AsyncStorage.getItem('isLocalSpeciesUpdated');

    // calls the function and stores whether species data was already loaded or not
    let isFirstUpdate = await AsyncStorage.getItem('isInitialSyncDone');

    // if string value of [isFirstUpdate] is ["true"] then sets [true] as boolean else [false]
    isFirstUpdate = isFirstUpdate !== 'true';

    return new Promise((resolve, reject) => {
      // checks and sync the species only if the local species are updated
      if (isSpeciesLoaded === 'true') {
        // gets all the user species synced on the server
        getSpeciesList()
          .then(async (alreadySyncedSpecies) => {
            // passes already synced species fetched from server to update the local species and gets the
            // local species which are not uploaded to server

            updateAndGetUserSpeciesToSync(isFirstUpdate ? alreadySyncedSpecies : null)
              .then((speciesToSync) => {
                // checks if [speciesToSync] is present and has data to iterate
                if (speciesToSync) {
                  // adds or deletes the species
                  modifyUserSpecies(speciesToSync, alreadySyncedSpecies).then(resolve);

                  // logging the success in to the db after all the species are synced
                  dbLog.info({
                    logType: LogTypes.MANAGE_SPECIES,
                    message: 'Syncing of all user species to server completed',
                  });
                } else {
                  resolve(true);
                  // logging the success in to the db
                  dbLog.info({
                    logType: LogTypes.MANAGE_SPECIES,
                    message: 'No new user species present to sync with server',
                  });
                }
              })
              .catch((err) => {
                console.error(
                  `Error at /utils/addUserSpecies/checkAndAddUserSpecies - getSpeciesList/updateAndGetUserSpeciesToSync, ${JSON.stringify(
                    err,
                  )}`,
                );
                reject(err);
              });
          })
          .catch((err) => {
            console.error(
              `Error at /utils/addUserSpecies/checkAndAddUserSpecies - getSpeciesList, ${JSON.stringify(
                err,
              )}`,
            );
            reject(err);
          });
      } else {
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.MANAGE_SPECIES,
          message: 'Cannot sync user species until scientific species are loaded in DB',
        });
        resolve(false);
      }
    });
  } catch (err) {
    console.error(`Error at /utils/addUserSpecies/checkAndAddUserSpecies, ${JSON.stringify(err)}`);
    dbLog.error({
      logType: LogTypes.MANAGE_SPECIES,
      message: 'Error while syncing user species to server',
      logStack: JSON.stringify(err),
    });
    bugsnag.notify(err);
  }
};

/**
 *
 * @param {string} scientificSpecieGuid - scientific species guid to search with
 * @param {Array} alreadySyncedSpecies - includes all the species which are already synced on server
 */
const addFromAlreadySyncedSpecies = (scientificSpecieGuid, alreadySyncedSpecies) => {
  // iterates through the already synced species and updates the specie id,
  // if scientific specie guid matches with already synced specie scientific species
  for (const specie of alreadySyncedSpecies) {
    if (specie.scientificSpecies === scientificSpecieGuid) {
      try {
        // updates specie id in DB
        addSpecieIdFromSyncedSpecie(scientificSpecieGuid, specie);
      } catch (err) {
        console.error(
          `Error at /utils/addUserSpecies/addFromAlreadySyncedSpecies, ${JSON.stringify(err)}`,
        );
      }
      break;
    }
  }
};

/**
 * Iterates through the list of [speciesToSync] to add or delete the specie on server and
 * update the status of the same in local DB
 * @param {Array} speciesToSync  - array of species that are not synced on the server
 * @param {Array} alreadySyncedSpecies - array of species which are already synced on the server
 */
export const modifyUserSpecies = (speciesToSync, alreadySyncedSpecies) => {
  let areSpeciesAdded = false;
  let areSpeciesDeleted = false;
  let areSpeciesUpdated = false;

  const areAllSpeciesUpdated = (resolve) => {
    if (areSpeciesAdded && areSpeciesDeleted && areSpeciesUpdated) {
      resolve(true);
    }
  };
  return new Promise((resolve) => {
    // iterates through the list of [speciesToSync] to add the specie on server and if result is success
    // then updates the [isUploaded] property in local DB to [true] else logs the error
    if (speciesToSync) {
      areSpeciesAdded = speciesToSync.speciesToAdd.length === 0;
      areSpeciesDeleted = speciesToSync.speciesToDelete.length === 0;
      areSpeciesUpdated = speciesToSync.speciesToUpdate.length === 0;

      areAllSpeciesUpdated(resolve);

      speciesToSync.speciesToAdd.forEach(async (specie, index) => {
        addUserSpecieToServer(specie, alreadySyncedSpecies)
          .then(() => {
            if (speciesToSync.speciesToAdd.length === 0) {
              areSpeciesAdded = true;
              areAllSpeciesUpdated(resolve);
            }
          })
          .catch((err) => console.error(err));
      });
      speciesToSync.speciesToDelete.forEach(async (specie, index) => {
        deleteUserSpecieFromServer(specie)
          .then(() => {
            if (speciesToSync.speciesToDelete.length === 0) {
              areSpeciesDeleted = true;
              areAllSpeciesUpdated(resolve);
            }
          })
          .catch((err) => console.error(err));
      });
      speciesToSync.speciesToUpdate.forEach(async (specie, index) => {
        if (specie.specieId) {
          updateUserSpecie({
            scientificSpecieGuid: specie.guid,
            specieId: specie.specieId,
            aliases: specie.aliases,
            description: specie.description,
            image: specie.image,
          })
            .then(() => {
              if (speciesToSync.speciesToUpdate.length === 0) {
                areSpeciesUpdated = true;
                areAllSpeciesUpdated(resolve);
              }
            })
            .catch((err) => {
              console.error('Failed to update specie with id', specie.specieId);
            });
        }
      });
    } else {
      resolve(true);
    }
  });
};

/**
 * Adds the specie to the server and if the specie is already present in the server
 * then updates in local DB using the [alreadySyncedSpecies] array
 *
 * @param {Object} specie - specie which is to be added to the server
 * @param {Array} alreadySyncedSpecies - array of already synced species present on server
 */
const addUserSpecieToServer = (specie, alreadySyncedSpecies) => {
  return new Promise((resolve, reject) => {
    let specieData = {
      scientificSpecies: specie.guid,
      aliases: specie.aliases ? specie.aliases : specie.scientificName,
    };
    if (specie.description) {
      specieData.description = specie.description;
    }
    if (specie.image) {
      specieData.imageFile = specie.image;
    }
    // calls the api function with user token and specie to add specie on the server
    addUserSpecie(specieData)
      .then((result) => {
        if (result) {
          addSpecieIdFromSyncedSpecie(specie.guid, result)
            .then((val) => {
              resolve(true);
            })
            .catch((err) => {
              console.error(
                `Error at /utils/addUserSpecies/addUserSpecieToServer, ${JSON.stringify(err)}`,
              );
              reject(err);
            });
        } else {
          resolve();
          // logging the warn in to the db
          dbLog.warn({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Got false result while trying to add specie with scientific specie guid: ${specie.guid}`,
          });
        }
      })
      .catch((err) => {
        if (
          err?.response?.status === 400 &&
          err.response.data?.errors &&
          err.response.data?.errors?.errors?.includes(
            'you already have defined a species based on the provided scientificSpecies id',
          )
        ) {
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Scientific specie guid: ${specie.guid} is already present on server.`,
          });
          if (alreadySyncedSpecies) {
            // used to find the already synced species using the scientific species and update the same in DB
            addFromAlreadySyncedSpecies(specie.guid, alreadySyncedSpecies)
              .then(resolve)
              .catch(reject);
          }
        } else {
          dbLog.error({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Failed to add user specie to server with scientific specie guid: ${specie.guid}`,
            logStack: JSON.stringify(err),
          });
          reject(err);
        }
      });
  });
};

/**
 * Calls the delete api function to delete the specie and if already present then updates the same in local DB
 *
 * @param {object} specie - user specie which is to be deleted from the server
 */
export const deleteUserSpecieFromServer = (specie) => {
  return new Promise((resolve, reject) => {
    // calls the api function with user token and specie to delete the specie from the server
    deleteUserSpecie(specie.specieId)
      .then((result) => {
        if (result) {
          removeSpecieId(specie.guid)
            .then(resolve)
            .catch((err) => {
              console.error('Error at /utils/addUserSpecies/deleteUserSpecieFromServer,', err);
              reject(err);
            });
        } else {
          // logging the warn in to the db
          dbLog.warn({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Got false result while trying to delete specie from server with specie guid: ${specie.specieId}`,
          });
          resolve();
        }
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: `User specie with specie id: ${specie.specieId} is already deleted from server`,
          });
          removeSpecieId(specie.guid)
            .then(resolve)
            .catch((err) => {
              console.error('Error at /utils/addUserSpecies/deleteUserSpecieFromServer,', err);
              reject(err);
            });
        } else {
          dbLog.error({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Failed to delete user specie from server with specie id: ${specie.specieId}`,
            logStack: JSON.stringify(err),
          });
          reject(err);
        }
      });
  });
};
