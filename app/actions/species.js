import RNFS from 'react-native-fs';
import i18next from '../languages/languages';
import dbLog from '../repositories/logs';
import { changeIsUpdatedStatus } from '../repositories/species';
import { bugsnag } from '../utils';
import {
  deleteAuthenticatedRequest,
  getAuthenticatedRequest,
  postAuthenticatedRequest,
  putAuthenticatedRequest,
} from '../utils/api';
import { LogTypes } from '../utils/constants';
import { SET_SPECIE, CLEAR_SPECIE } from './Types';
import { APIConfig } from './Config';

const { protocol, cdnUrl } = APIConfig;

/**
 * This function dispatches type SET_SPECIE with payload specie to show specie detail on SpecieInfo screen
 * It requires the following param
 * @param {Object} specie - specie which is to be shown or updated
 */
export const setSpecie = (specie) => (dispatch) => {
  dispatch({
    type: SET_SPECIE,
    payload: specie,
  });
};

/**
 * This function dispatches type CLEAR_SPECIE to clear the species after navigated back from SpecieInfo screen
 */
export const clearSpecie = () => (dispatch) => {
  dispatch({
    type: CLEAR_SPECIE,
  });
};

/**
 * Fetches all the species of the user
 */
export const getSpeciesList = () => {
  return new Promise((resolve, reject) => {
    // makes an authorized GET request on /species to get the species list.
    getAuthenticatedRequest('/treemapper/species')
      .then((res) => {
        const { data, status } = res;
        // checks if the status code is 200 the resolves the promise with the fetched data
        if (status === 200) {
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: 'Fetched species list, GET - /species',
            statusCode: status,
          });
          resolve(data);
        } else {
          resolve(false);
        }
      })
      .catch((err) => {
        // logs the error
        console.error(`Error at /actions/species/getSpeciesList, ${JSON.stringify(err.response)}`);
        // logs the error of the failed request in DB
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: 'Failed fetch of species list, GET - /species',
          statusCode: err?.response?.status,
          logStack: JSON.stringify(err?.response),
        });
        bugsnag.notify(err);
        reject(err);
      });
  });
};

/**
 * Adds a scientific specie to user's preferred species
 * @param {object} specieData - contains scientificSpecies as property having scientific specie id and
 *                              aliases as property (a name given by user to that scientific specie)
 */
export const addUserSpecie = (specieData) => {
  return new Promise((resolve, reject) => {
    // makes an authorized POST request on /species to add a specie of user.
    postAuthenticatedRequest('/treemapper/species', specieData)
      .then((res) => {
        const { data, status } = res;

        // checks if the status code is 200 the resolves the promise with the fetched data
        if (status === 200) {
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Successfully added user specie to server with scientific specie guid: ${specieData.scientificSpecies}, POST - /species`,
            statusCode: status,
          });
          resolve(data);
        } else {
          // logging the success in to the db
          dbLog.warn({
            logType: LogTypes.MANAGE_SPECIES,
            message: 'Got success response from server other than status code 200, POST - /species',
            statusCode: status,
          });
          resolve(false);
        }
      })
      .catch((err) => {
        // logs the error
        console.error(`Error at /actions/species/addUserSpecie, ${JSON.stringify(err?.response)}`);
        // logs the error of the failed request in DB
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Failed to add scientific species having id ${specieData.scientificSpecies}, POST - /species`,
          statusCode: err?.response?.status,
          logStack: JSON.stringify(err?.response),
        });
        reject(err);
      });
  });
};

/**
 * Delete the user specie from the server using the specie id
 * @param {object} specieId - specie id of user saved species which is use to delete specie from server
 */
export const deleteUserSpecie = (specieId) => {
  return new Promise((resolve, reject) => {
    // makes an authorized DELETE request on /species to delete a specie of user.
    deleteAuthenticatedRequest(`/treemapper/species/${specieId}`)
      .then((res) => {
        const { status } = res;

        // checks if the status code is 204 then resolves the promise
        if (status === 204) {
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Successfully deleted user specie from server with specie id: ${specieId}, DELETE - /species`,
            statusCode: status,
          });
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch((err) => {
        // logs the error
        console.error(
          `Error at /actions/species/deleteUserSpecie, ${JSON.stringify(err?.response)}, ${err}`,
        );
        // logs the error of the failed request in DB
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Failed to delete user species having id ${specieId}, DELETE - /species`,
          statusCode: err?.response?.status,
          logStack: JSON.stringify(err?.response),
        });
        reject(err);
      });
  });
};

export const updateUserSpecie = ({
  scientificSpecieGuid,
  specieId,
  aliases,
  description,
  image,
}) => {
  return new Promise((resolve, reject) => {
    const data = { aliases, description, imageFile: image };
    // makes an authorized DELETE request on /species to delete a specie of user.
    putAuthenticatedRequest(`/treemapper/species/${specieId}`, data)
      .then((res) => {
        const { status } = res;
        // checks if the status code is 204 then resolves the promise
        if (status === 200) {
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.MANAGE_SPECIES,
            message: `Updated specie with specie id ${specieId}, PUT - /treemapper/species`,
            statusCode: status,
          });
          changeIsUpdatedStatus({ scientificSpecieGuid, isUpdated: true });
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch((err) => {
        // logs the error of the failed request in DB
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Failed to update specie with specie id ${specieId}, PUT - /treemapper/species`,
          statusCode: err?.response?.status,
          logStack: JSON.stringify(err?.response),
        });
        reject(err);
      });
  });
};

export const UpdateSpeciesImage = (image, speciesId, SpecieGuid) => {
  return new Promise((resolve, reject) => {
    let body = {
      imageFile: `data:image/jpeg;base64,${image}`,
    };

    putAuthenticatedRequest(`/treemapper/species/${speciesId}`, body)
      .then((res) => {
        const { status } = res;
        if (status === 200) {
          changeIsUpdatedStatus({ scientificSpecieGuid: SpecieGuid, isUpdated: true });
          resolve(true);
        }
      })
      .catch((err) => {
        // logs the error of the failed request in DB
        dbLog.error({
          logType: LogTypes.MANAGE_SPECIES,
          message: `Failed to update specie Image with specie id ${speciesId}, PUT - /treemapper/species/${speciesId}`,
          statusCode: err?.response?.status,
          logStack: JSON.stringify(err?.response),
        });
        reject(err);
      });
  });
};

export const getBase64ImageFromURL = async (specieImage) => {
  return new Promise((resolve, reject) => {
    if (cdnUrl) {
      RNFS.downloadFile({
        fromUrl: `${protocol}://${cdnUrl}/media/cache/species/default/${specieImage}`,
        toFile: `${RNFS.DocumentDirectoryPath}/${specieImage}`,
      }).promise.then((response) => {
        if (response.statusCode === 200) {
          RNFS.readFile(`${RNFS.DocumentDirectoryPath}/${specieImage}`, 'base64')
            .then((data) => {
              resolve(data);
              RNFS.unlink(`${RNFS.DocumentDirectoryPath}/${specieImage}`).catch((err) => {
                reject(err);
                // `unlink` will throw an error, if the item to unlink does not exist
                console.error(err.message);
              });
            })
            .catch((err) => {
              dbLog.error({
                logType: LogTypes.MANAGE_SPECIES,
                message: 'Error while reading file image',
                logStack: JSON.stringify(err),
              });
              reject(err);
            });
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};
