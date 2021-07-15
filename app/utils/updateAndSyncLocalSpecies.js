import RNFS, { DocumentDirectoryPath } from 'react-native-fs';
import { updateAndSyncLocalSpecies as updateAndSyncLocalSpeciesRepo } from '../repositories/species';
import { unzip } from 'react-native-zip-archive';
import { APIConfig } from '../actions/Config';
import AsyncStorage from '@react-native-community/async-storage';
import dbLog from '../repositories/logs';
import { LogTypes } from './constants';
import { bugsnag } from '../utils';
const { protocol, url } = APIConfig;

/**
 * Reads the target path passed as params and parse the file contents to update the species locally in DB.
 * Once the update is successful then mark adds an AsyncStorage property [isLocalSpeciesUpdated] with value [true]
 *
 * @param {string} jsonFilePath - used to read the file from file system and update the local species from the file contents
 */
const updateSpeciesFromFile = (jsonFilePath, setUpdatingSpeciesState) => {
  let isJsonCorrupted = false;
  return new Promise((resolve, reject) => {
    setUpdatingSpeciesState('READING_FILE');
    // reads the file content using the passed target path in utf-8 format
    RNFS.readFile(jsonFilePath, 'utf8')
      .then((speciesContent) => {
        // parses the content to make is feasible to read and update the contents in DB
        speciesContent = JSON.parse(speciesContent);

        // calls the function and pass the parsed content to update the species in local DB
        updateAndSyncLocalSpeciesRepo(speciesContent)
          .then(async () => {
            // adds an AsyncStorage item [isLocalSpeciesUpdated] with value [true], which helps to determine
            // whether species were already updated in local DB or not
            await AsyncStorage.setItem('isLocalSpeciesUpdated', 'true');
            setUpdatingSpeciesState('COMPLETED');
            resolve();
          })
          .catch((err) => {
            console.error(
              'Error at /utils/updateSpeciesFromFile/updateAndSyncLocalSpeciesRepo while updating local species',
              err,
            );
            reject(err);
          });
      })
      .catch((err) => {
        console.error(
          `Error at /utils/updateSpeciesFromFile while reading file at path ${jsonFilePath}`,
          err,
        );
        // deletes the JSON file if there is JSON Parse error
        if (err.message.includes('JSON Parse error')) {
          isJsonCorrupted = true;
          // deletes the JSON file
          RNFS.unlink(jsonFilePath)
            .then(() => {
              dbLog.info({
                logType: LogTypes.MANAGE_SPECIES,
                message: 'JSON file deleted due to parsing error',
              });
            })
            // `unlink` will throw an error, if the item to unlink does not exist
            .catch((err) => {
              console.error(
                `Error at /utils/updateSpeciesFromFile while deleting file at path ${jsonFilePath}`,
                err,
              );
              // logging the error in to the db
              dbLog.error({
                logType: LogTypes.MANAGE_SPECIES,
                message: `Error while deleting JSON file at path ${jsonFilePath} for updating local species`,
                logStack: JSON.stringify(err),
              });
            });
        }
        // logging the error in to the db
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Error while reading file at path ${jsonFilePath} for updating local species`,
          logStack: JSON.stringify(err),
        });
        reject(new Error({ err, isJsonCorrupted }));
      });
  });
};

/**
 * Used to download scientific species archive file and add the species in the local DB.
 * Checks if species are loaded or not.
 * If not then checks if JSON file is present, if present then adds the species by reading the file.
 * Else if JSON file not present then checks if ZIP file is present, if present then unzips the file,
 * reads the json and adds species to DB.
 * Else if ZIP file is also not present then downloads the zip file, unzip it, reads the json file and
 * adds the species in DB
 *
 * @param {SetStateAction} setUpdatingSpeciesState - sets the current progress state
 */
export default async function updateAndSyncLocalSpecies(setUpdatingSpeciesState) {
  try {
    // calls the function and stores whether species data was already loaded or not
    const isSpeciesLoaded = await AsyncStorage.getItem('isLocalSpeciesUpdated');

    // stores the path of the json file
    const jsonFilePath = `${DocumentDirectoryPath}/scientific_species.json`;

    // stores the path of zip file
    const zipFilePath = `${DocumentDirectoryPath}/species.zip`;

    // used to decide if scientific species archive should be downloaded or not. Defaults to false
    let doesZipPathExist = false;

    // checks whether the JSON file exist or not
    const doesJsonPathExist = await RNFS.exists(jsonFilePath);

    if (!doesJsonPathExist) {
      // checks whether the ZIP file exist or not
      doesZipPathExist = await RNFS.exists(zipFilePath);
    }

    return new Promise((resolve, reject) => {
      // If species data is not loaded then tries to update the realm DB using JSON file if present.
      // Else if unzip the file if already present and adds data in DB using JSON file.
      // Else tries to download the zip file, unzip it and loads into realm DB using JSON file
      if (isSpeciesLoaded !== 'true') {
        // if JSON file path exists then it reads the file and calls the [updateSpeciesFromFile] function
        // with JSON file path as param which is used to parse file content to update the data in realm DB
        // .
        // else if JSON file does not exists then calls the archive api to download the zip file then
        // extract and save it to document directory and calls the [updateSpeciesFromFile] function to
        // update data in DB
        if (doesJsonPathExist) {
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: 'Species are not updated but json file is already present',
          });

          updateSpeciesFromFile(jsonFilePath, setUpdatingSpeciesState)
            .then(() => {
              resolve();
            })
            .catch((error) => {
              console.error(
                'Error at /utils/updateAndSyncLocalSpecies - updateSpeciesFromFile',
                error.err.message,
              );

              if (error.isJsonCorrupted) {
                if (doesZipPathExist) {
                  dbLog.info({
                    logType: LogTypes.MANAGE_SPECIES,
                    message: 'JSON file is corrupted unzipping the archive file',
                  });

                  // calls the function to unzip and add the species data in realm DB
                  unzipAndAddSpeciesData(zipFilePath, jsonFilePath, setUpdatingSpeciesState)
                    .then(resolve)
                    .catch(reject);
                } else {
                  dbLog.info({
                    logType: LogTypes.MANAGE_SPECIES,
                    message:
                      'JSON file is corrupted and archive file is not present. Downloading archive file.',
                  });

                  downloadAndUpdateSpecies(zipFilePath, jsonFilePath, setUpdatingSpeciesState)
                    .then(resolve)
                    .catch(reject);
                }
              } else {
                reject(error);
              }
            });
        } else if (doesZipPathExist) {
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: 'Species are not updated but archive file is present',
          });

          // calls the function to unzip and add the species data in realm DB
          unzipAndAddSpeciesData(zipFilePath, jsonFilePath, setUpdatingSpeciesState)
            .then(resolve)
            .catch(reject);
        } else {
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: 'Species are not updated downloading archive file',
          });

          downloadAndUpdateSpecies(zipFilePath, jsonFilePath, setUpdatingSpeciesState)
            .then(resolve)
            .catch(reject);
        }
      } else {
        dbLog.info({
          logType: LogTypes.MANAGE_SPECIES,
          message: 'Species are already updated in realm DB',
        });
        resolve();
      }
    });
  } catch (err) {
    console.error('Error while checking file existence', err);
    dbLog.error({
      logType: LogTypes.MANAGE_SPECIES,
      message: 'Error while checking file existence',
      logStack: JSON.stringify(err),
    });
    bugsnag.notify(err);
  }
}

/**
 * Unzips the file and calls the [updateSpeciesFromFile] function to add species data in realm DB
 * @param {string} zipFilePath - path of zip file, used to unzip the file
 * @param {string} jsonFilePath - passed to [updateSpeciesFromFile] function to add species data in realm DB
 */
const unzipAndAddSpeciesData = (zipFilePath, jsonFilePath, setUpdatingSpeciesState) => {
  return new Promise((resolve, reject) => {
    setUpdatingSpeciesState('UNZIPPING_FILE');

    // unzips the downloaded file in document directory
    unzip(zipFilePath, DocumentDirectoryPath, 'UTF-8')
      .then(async () => {
        // this function updates the species in DB after reading the content of the file
        updateSpeciesFromFile(jsonFilePath, setUpdatingSpeciesState).then(resolve).catch(reject);
      })
      .catch((err) => {
        console.error('Error at /utils/unzipAndAddSpeciesData', err.message);

        // if there's error while unzipping the file
        if (err.message === 'Failed to extract file error in opening zip file') {
          // deletes the ZIP file
          RNFS.unlink(zipFilePath)
            .then(() => {
              dbLog.info({
                logType: LogTypes.MANAGE_SPECIES,
                message: 'Failed to extract file error in opening zip file. Deleted zip file',
              });
            })
            // `unlink` will throw an error, if the item to unlink does not exist
            .catch((err) => {
              console.error(
                `Error at /utils/unzipAndAddSpeciesData while deleting file at path ${zipFilePath}`,
                err,
              );
              // logging the error in to the db
              dbLog.error({
                logType: LogTypes.MANAGE_SPECIES,
                message: `Error while deleting ZIP file at path ${zipFilePath} for updating local species`,
                logStack: JSON.stringify(err),
              });
              bugsnag.notify(err);
            });
        } else {
          dbLog.error({
            logType: LogTypes.MANAGE_SPECIES,
            message: 'Error while unzipping or updating data in DB',
            logStack: JSON.stringify(err),
          });
          bugsnag.notify(err);
        }
        reject(err);
      });
  });
};

/**
 * Downloads the file and calls the [unzipAndAddSpeciesData] function to unzip and update the data in DB
 * @param {string} zipFilePath - path of zip file to store the downloaded file and also unzip it
 * @param {string} jsonFilePath - passed as param to [unzipAndAddSpeciesData] function
 */
const downloadAndUpdateSpecies = (zipFilePath, jsonFilePath, setUpdatingSpeciesState) => {
  return new Promise((resolve, reject) => {
    // downloads the zip file from the link and then after completion unzip the file
    // and updates th species in local DB

    RNFS.downloadFile({
      fromUrl: `${protocol}://${url}/treemapper/scientificSpeciesArchive`,
      toFile: zipFilePath,
      readTimeout: 300 * 1000, // allow max 5 minutes for downloading
      background: false,
      begin: () => {
        setUpdatingSpeciesState('DOWNLOADING');
      },
    })
      .promise.then(async (response) => {
        // if response is 200 then unzips the file and adds the species in local DB
        if (response.statusCode === 200) {
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message:
              'Scientific Species zip downloaded successfully, GET - /scientificSpeciesArchive',
            statusCode: response.statusCode,
          });

          // calls the function to unzip and add the species data in realm DB
          unzipAndAddSpeciesData(zipFilePath, jsonFilePath, setUpdatingSpeciesState)
            .then(resolve)
            .catch(reject);
        } else {
          dbLog.error({
            logType: LogTypes.MANAGE_SPECIES,
            message:
              'Error while downloading scientific species zip, GET - /scientificSpeciesArchive',
            statusCode: response.statusCode,
            logStack: JSON.stringify(response),
          });
          reject(new Error('Error while downloading scientific species zip'));
        }
      })
      .catch((err) => {
        // logs the error while downloading a file
        console.error('Error at /utils/updateAndSyncLocalSpecies - downloadFile', err);
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message:
            'Error while downloading scientific species zip, GET - /scientificSpeciesArchive',
          logStack: JSON.stringify(err),
        });
        reject(err);
      });
  });
};
