import { bugsnag } from '../utils';
import Realm from 'realm';
import { LogTypes } from '../utils/constants';
import dbLog from '../repositories/logs';
import { getSchema } from './default';
import AsyncStorage from '@react-native-community/async-storage';
import { getBase64ImageFromURL, updateUserSpecie } from '../actions/species';

export const updateAndSyncLocalSpecies = (speciesData) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          speciesData.forEach((specie, index) => {
            realm.create(
              'ScientificSpecies',
              {
                guid: specie.guid,
                scientificName: specie.scientific_name,
                aliases: specie.scientific_name,
              },
              Realm.UpdateMode.Modified,
            );
            if (index === speciesData.length - 1) {
              // logging the success in to the db
              dbLog.info({
                logType: LogTypes.MANAGE_SPECIES,
                message: 'Successfully updated the Local Scientific species',
              });
              resolve(true);
            }
          });
        });
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: 'Error while updating the Local Scientific species',
          logStack: JSON.stringify(err),
        });
        console.error(
          `Error at /repositories/species/updateAndSyncLocalSpecies, ${JSON.stringify(err)}`,
        );
        bugsnag.notify(err);
        reject(err);
      });
  });
};

export const searchSpeciesFromLocal = (text) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        let species = realm.objects('ScientificSpecies');
        let searchedSpecies = species.filtered(`scientificName BEGINSWITH[c] '${text}'`);
        searchedSpecies = searchedSpecies.sorted('scientificName');
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Searching in Local Scientific species with text:${text}`,
        });
        resolve(searchedSpecies);
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Error while searching in Local Scientific species with text:${text}`,
          logStack: JSON.stringify(err),
        });
        console.error(
          `Error at /repositories/species/searchSpeciesFromLocal, ${JSON.stringify(err)}`,
        );
        bugsnag.notify(err);
        reject(err);
      });
  });
};

export const getUserSpecies = () => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        let species = realm.objects('ScientificSpecies');
        let userSpecies = species.filtered('isUserSpecies = true');
        userSpecies = userSpecies.sorted('scientificName');
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.MANAGE_SPECIES,
          message: 'Retrieved User Species from Local',
        });
        resolve(userSpecies);
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: 'Error while retrieving User Species from Local',
          logStack: JSON.stringify(err),
        });
        console.error(`Error at /repositories/species/getUserSpecies, ${JSON.stringify(err)}`);
        bugsnag.notify(err);
        reject(err);
      });
  });
};

/**
 * Gets all the user preferred species which are not synced with server.
 * It filters the [ScientificSpecies] model with conditions [isUserSpecies = true]
 * and [isUploaded = false]
 * @param {Array} alreadySyncedSpecies - contains the list of already synced user's preferred species
 */
export const updateAndGetUserSpeciesToSync = (alreadySyncedSpecies) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then(async (realm) => {
        if (alreadySyncedSpecies) {
          // iterates through all the user preferred species which are already synced and updates the same in DB

          for (const specie of alreadySyncedSpecies) {
            let base64Image = null;
            if (specie.image) {
              try {
                base64Image = await getBase64ImageFromURL(specie.image);
              } catch (err) {
                dbLog.error({
                  logType: LogTypes.OTHER,
                  message: 'Failed to get base64 image',
                  logStack: JSON.stringify(err),
                });
              }
            }
            // find the scientific specie using scientific specie guid and update the properties to
            // [isUploaded = true] and [isUserSpecies = true]
            realm.write(() => {
              let specieResult = realm.objectForPrimaryKey(
                'ScientificSpecies',
                specie.scientificSpecies,
              );
              if (specieResult) {
                specieResult.image = base64Image ? `data:image/jpeg;base64,${base64Image}` : '';
                specieResult.isUploaded = true;
                specieResult.isUserSpecies = true;
                specieResult.specieId = specie.id;
                specieResult.aliases = specie.aliases
                  ? specie.aliases
                  : specieResult.scientificName;

                if (specie.description) {
                  specieResult.description = specie.description;
                }
              }
            });

            // logging the success in to the db
            dbLog.info({
              logType: LogTypes.MANAGE_SPECIES,
              message: `Marked local specie with guid: ${specie.scientificSpecies} as isUserSpecies and isUploaded`,
            });
          }

          // calls the AsyncStorage function and stores [isInitialSyncDone] as ["true"]
          await AsyncStorage.setItem('isInitialSyncDone', 'true');
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: 'Updated all the local species with already synced species from server',
          });
        } else {
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: 'No synced species found from server',
          });
        }

        // fetches all the scientific species
        let species = realm.objects('ScientificSpecies');

        let speciesToAdd = species.filtered('isUserSpecies = true && isUploaded = false');

        let speciesToDelete = species.filtered('isUserSpecies = false && isUploaded = true');

        let speciesToUpdate = species.filtered(
          'isUserSpecies = true && isUploaded = true && isUpdated = false',
        );

        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.MANAGE_SPECIES,
          message: 'Fetched not uploaded user species from DB',
        });
        resolve({ speciesToAdd, speciesToDelete, speciesToUpdate });
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: 'Error while retrieving not uploaded user Species',
          logStack: JSON.stringify(err),
        });
        console.error(
          `Error at /repositories/species/updateAndGetUserSpeciesToSync, ${JSON.stringify(err)}`,
          err,
        );
        bugsnag.notify(err);
        reject(err);
      });
  });
};

/**
 * This function is used when specie is already uploaded on the server.
 * Used to add specie id to scientific species using scientific species guid
 * @param {string} scientificSpecieGuid - scientific specie guid to search from and update the specie id
 * @param {Object} specie - specie which is to be updated
 */
export const addSpecieIdFromSyncedSpecie = (scientificSpecieGuid, specie) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(async () => {
          // find the scientific specie using scientific specie guid and updates the specieId
          // modifies [isUploaded] and [isUserSpecies] to [true]
          let specieResult = realm.objectForPrimaryKey('ScientificSpecies', scientificSpecieGuid);
          specieResult.specieId = specie.id;
          specieResult.isUploaded = true;
          specieResult.isUserSpecies = true;
          if (!specieResult.isUpdated) {
            const specieData = {
              scientificSpecieGuid: specieResult.guid,
              specieId: specieResult.specieId,
              aliases: specieResult.aliases,
              description: specieResult.description,
              image: specieResult.image,
            };
            if (!specieResult.aliases || specieResult.aliases === specieResult.guid) {
              specieData.aliases = specie.aliases;
              specieResult.aliases = specie.aliases;
            }
            if (!specieResult.description && specie.description) {
              specieData.description = specie.description;
              specieResult.description = specie.description;
            }
            if (!specieResult.image && specie.image) {
              let base64Image;
              try {
                base64Image = await getBase64ImageFromURL(specie.image);
              } catch (err) {
                dbLog.error({
                  logType: LogTypes.OTHER,
                  message: 'Failed to get base64 image',
                  logStack: JSON.stringify(err),
                });
              }
              specieData.image = base64Image ? `data:image/jpeg;base64,${base64Image}` : '';
              specieResult.image = base64Image ? `data:image/jpeg;base64,${base64Image}` : '';
            }
            if (
              Object.prototype.hasOwnProperty.call(specieData, 'aliases') ||
              Object.prototype.hasOwnProperty.call(specieData, 'description') ||
              Object.prototype.hasOwnProperty.call(specieData, 'image')
            ) {
              updateUserSpecie(specieData).then(resolve).catch(reject);
            } else {
              specieResult.isUpdated = true;
            }
          }
        });
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Added specie id from already synced specie with scientific specie guid: ${scientificSpecieGuid} and specie id: ${specie.id}`,
        });
        resolve(true);
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Error while adding specie id from already synced specie with scientific specie guid: ${scientificSpecieGuid} and specie id: ${specie.id}`,
          logStack: JSON.stringify(err),
        });
        console.error(
          `Error at /repositories/species/addSpecieIdFromSyncedSpecie, ${JSON.stringify(err)}`,
        );
        bugsnag.notify(err);
        reject(err);
      });
  });
};

/**
 * This function is used when specie is deleted from the server.
 * Used to remove specie id from scientific species using scientific species guid and set
 * [isUploaded] and [isUserSpecies] to [false]
 * @param {string} scientificSpecieGuid - scientific specie guid to search from and update the specie id
 */
export const removeSpecieId = (scientificSpecieGuid) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          // find the scientific specie using scientific specie guid and updates the specieId to empty string,
          // modifies [isUploaded] and [isUserSpecies] to [false]
          let specieResult = realm.objectForPrimaryKey('ScientificSpecies', scientificSpecieGuid);
          specieResult.specieId = '';
          specieResult.isUploaded = false;
          specieResult.isUserSpecies = false;
          specieResult.isUpdated = true;
        });
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Removed specie id having scientific specie guid: ${scientificSpecieGuid}`,
        });
        resolve(true);
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Error while removing specie id having scientific specie guid: ${scientificSpecieGuid}`,
          logStack: JSON.stringify(err),
        });
        console.error(`Error at /repositories/species/removeSpecieId, ${JSON.stringify(err)}`);
        bugsnag.notify(err);
        reject(err);
      });
  });
};

export const updateSpecieData = ({ scientificSpecieGuid, aliases, description, image }) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          // find the scientific specie using scientific specie guid and updates the specieId to empty string,
          // modifies [isUploaded] and [isUserSpecies] to [false]
          let specieResult = realm.objectForPrimaryKey('ScientificSpecies', scientificSpecieGuid);
          if (aliases) {
            specieResult.aliases = aliases;
          }
          if (description) {
            specieResult.description = description;
          }
          if (image || image === '') {
            specieResult.image = `${image}`;
          }
        });
        changeIsUpdatedStatus({ scientificSpecieGuid, isUpdated: false });
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Added Aliases to a specie having scientific specie guid: ${scientificSpecieGuid}`,
        });
        resolve(true);
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Error while adding Aliases to a specie having scientific specie guid: ${scientificSpecieGuid}`,
          logStack: JSON.stringify(err),
        });
        console.error(`Error at /repositories/species/updateSpecieData, ${err}`);
        bugsnag.notify(err);
        reject(err);
      });
  });
};

export const addLocalImage = (scientificSpecieGuid, image) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          // find the scientific specie using scientific specie guid and updates the specieId to empty string,
          // modifies [isUploaded] and [isUserSpecies] to [false]
          let specieResult = realm.objectForPrimaryKey('ScientificSpecies', scientificSpecieGuid);
          specieResult.image = `data:image/jpeg;base64,${image}`;
          specieResult.isUpdated = false;
          // specieResult.description = description;
        });
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Added Local Image to a specie having scientific specie guid: ${scientificSpecieGuid}`,
        });
        resolve(true);
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Error while adding Local Image to a specie having scientific specie guid: ${scientificSpecieGuid}`,
          logStack: JSON.stringify(err),
        });
        console.error(`Error at /repositories/species/addLocalImage, ${JSON.stringify(err)}`);
        bugsnag.notify(err);
        reject(err);
      });
  });
};

export const changeIsUpdatedStatus = ({ scientificSpecieGuid, isUpdated }) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          let specieResult = realm.objectForPrimaryKey('ScientificSpecies', scientificSpecieGuid);
          if (isUpdated !== undefined) {
            specieResult.isUpdated = isUpdated;
          }
        });
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Changed update status of specie having scientific specie guid: ${scientificSpecieGuid}`,
        });
        resolve(true);
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Error while Changing update status of specie having scientific specie guid: ${scientificSpecieGuid}`,
          logStack: JSON.stringify(err),
        });
        console.error(`Error at /repositories/species/changeIsUpdatedStatus, ${err}`);
        bugsnag.notify(err);
        reject(err);
      });
  });
};

// This function adds or removes the specie from User Species
export const toggleUserSpecies = (guid, addSpecie = false) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          let specieToToggle = realm.objectForPrimaryKey('ScientificSpecies', guid);
          if (addSpecie) {
            specieToToggle.isUserSpecies = true;
          } else {
            specieToToggle.isUserSpecies = !specieToToggle.isUserSpecies;
          }

          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Specie with guid ${guid} ${
              specieToToggle.isUserSpecies ? 'added' : 'removed'
            }`,
          });
        });
        resolve();
      })
      .catch((err) => {
        console.error('Error at /repositories/species/toggleUserSpecies, ', err);
        // logging the error in to the db
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Error while adding or removing specie from user specie for specie id: ${guid}`,
          logStack: JSON.stringify(err),
        });
        reject(err);
      });
  });
};

// This function removes the user species which are not uploaded or updated
export const shouldSpeciesUpdate = () => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          // fetches all the scientific species
          let species = realm.objects('ScientificSpecies');

          let speciesToAdd = species.filtered('isUserSpecies = true && isUploaded = false');

          let speciesToDelete = species.filtered('isUserSpecies = false && isUploaded = true');

          let speciesToUpdate = species.filtered(
            'isUserSpecies = true && isUploaded = true && isUpdated = false',
          );

          const shouldSpeciesSync =
            speciesToAdd.length > 0 || speciesToDelete.length > 0 || speciesToUpdate.length > 0;

          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Specie sync is ${shouldSpeciesSync ? '' : 'not'} required`,
          });
          resolve(shouldSpeciesSync);
        });
      })
      .catch((err) => {
        console.error('Error at /repositories/species/isSpeciesToUpdate,', err);
        // logging the error in to the db
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: 'Error while checking if species sync is required',
          logStack: JSON.stringify(err),
        });
        reject(err);
      });
  });
};

// This function removes the user species which are not uploaded or updated
export const resetAllSpecies = () => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          // fetches all the scientific species
          let species = realm.objects('ScientificSpecies').filtered('isUserSpecies = true');

          for (let specie of species) {
            specie.isUpdated = true;
            specie.isUploaded = false;
            specie.description = '';
            specie.specieId = '';
            specie.image = '';
            specie.isUserSpecies = false;
          }

          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: 'Reset of all species done',
          });
          resolve(true);
        });
      })
      .catch((err) => {
        console.error('Error at /repositories/species/resetAllSpecies,', err);
        // logging the error in to the db
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: 'Error while resetting all user species',
          logStack: JSON.stringify(err),
        });
        reject(err);
      });
  });
};

export const getScientificSpeciesById = (id) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        if (id !== 'unknown') {
          let specie = realm.objectForPrimaryKey('ScientificSpecies', id);
          resolve(specie);
        } else {
          resolve({
            aliases: 'Unknown',
            description: '',
            guid: 'unknown',
            image: '',
            isUpdated: true,
            isUploaded: true,
            isUserSpecies: true,
            scientificName: 'Unknown',
          });
        }
      })
      .catch((err) => {
        console.error('Error at /repositories/species/getScientificSpeciesById,', err);
        // logging the error in to the db
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Error while retrieving specie with guid ${id}`,
          logStack: JSON.stringify(err),
        });
        reject(err);
      });
  });
};
