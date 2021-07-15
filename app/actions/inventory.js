import { getAuthenticatedRequest } from '../utils/api';
import {
  DELETE_INVENTORY_ID,
  INITIATE_INVENTORY_STATE,
  IS_UPLOADING,
  SET_INVENTORY_ID,
  UPDATE_PENDING_COUNT,
  UPDATE_UPLOAD_COUNT,
  UPDATE_PROGRESS_COUNT,
  SET_SKIP_TO_INVENTORY_OVERVIEW,
} from './Types';
import { PENDING_DATA_UPLOAD } from '../utils/inventoryConstants';
import { LogTypes } from '../utils/constants';
import dbLog from '../repositories/logs';

/**
 * This function dispatches type SET_INVENTORY_ID with payload inventoryId to add in inventory state
 * It requires the following param
 * @param {string} inventoryId - inventory id which should be added/updated in inventory state
 */
export const setInventoryId = (inventoryId) => async (dispatch) => {
  await dispatch({
    type: SET_INVENTORY_ID,
    payload: inventoryId,
  });
};

/**
 * This function dispatches type DELETE_INVENTORY_ID and deletes inventory id in inventory state
 */
export const deleteInventoryId = () => (dispatch) => {
  dispatch({
    type: DELETE_INVENTORY_ID,
  });
};
/**
 * This function dispatches type INITIATE_INVENTORY_STATE with payload inventory data to add in inventory state
 * It requires the following param
 * @param {Object} inventoryData - inventory data which should be added in allInventory of inventory state
 */
export const initiateInventoryState = (inventoryData) => (dispatch) => {
  dispatch({
    type: INITIATE_INVENTORY_STATE,
    payload: inventoryData,
  });
};

/**
 * This function dispatches type UPDATE_PENDING_COUNT or UPDATE_UPLOAD_COUNT with payload count to update the
 * count in inventory state. The dispatch type depends on the count type. If type is PENDING_DATA_UPLOAD then
 * [UPDATE_PENDING_COUNT] type is dispatched else [UPDATE_UPLOAD_COUNT] is dispatched
 *
 * It requires the following param
 * @param {Object} data - data which includes type of count to update and count itself to update in inventory state
 */
export const updateCount = (data) => (dispatch) => {
  dispatch({
    type: data.type === PENDING_DATA_UPLOAD ? UPDATE_PENDING_COUNT : UPDATE_UPLOAD_COUNT,
    payload: data.count,
  });
};

/**
 * This function dispatches type  UPDATE_PROGRESS_COUNT with payload count to update the
 * count in inventory state. The dispatch type depends on the count type.
 *
 * It requires the following param
 * @param {Object} data - data which includes type of count to update and count itself to update in inventory state
 */
export const updateProgressCount = (data) => (dispatch) => {
  dispatch({
    type: UPDATE_PROGRESS_COUNT,
    payload: data.count,
  });
};

/**
 * This function dispatches type IS_UPLOADING with payload as boolean value to update in inventory state
 * It requires the following param
 * @param {boolean} isUploading - used to update the uploading status in inventory state
 */
export const updateIsUploading = (isUploading) => (dispatch) => {
  dispatch({
    type: IS_UPLOADING,
    payload: isUploading,
  });
};

/**
 * This function dispatches type SET_SKIP_TO_INVENTORY_OVERVIEW with payload as boolean value to update in inventory state
 * It requires the following param
 * @param {boolean} skipToInventoryOverview - used to update the skipToInventoryOverview in inventory state
 */
export const setSkipToInventoryOverview = (skipToInventoryOverview) => (dispatch) => {
  dispatch({
    type: SET_SKIP_TO_INVENTORY_OVERVIEW,
    payload: skipToInventoryOverview,
  });
};

export const getAllInventoryFromServer = async (
  requestRoute = '/treemapper/plantLocations',
  allInventory = [],
) => {
  try {
    let data = await getAuthenticatedRequest(requestRoute, { 'x-accept-versions': '1.0.3' });
    let updatedAllInventory = data.data.items.concat(allInventory);
    if (data.data._links.next) {
      return await getAllInventoryFromServer(data.data._links.next, updatedAllInventory);
    } else {
      let exceptSampleTrees = updatedAllInventory.filter((inventory) => {
        return inventory.type !== 'sample' && inventory.captureStatus === 'complete';
      });
      let sampleTrees = updatedAllInventory.filter((inventory) => {
        return inventory.type === 'sample' && inventory.captureStatus === 'complete';
      });
      dbLog.info({
        logType: LogTypes.DATA_SYNC,
        message: 'Successfully fetched all Inventories From server',
      });
      return [exceptSampleTrees, sampleTrees];
    }
  } catch (err) {
    dbLog.error({
      logType: LogTypes.DATA_SYNC,
      message: 'Failed fetch Inventories From server',
      statusCode: err?.response?.status,
      logStack: JSON.stringify(err?.response),
    });
    return [];
  }
};
