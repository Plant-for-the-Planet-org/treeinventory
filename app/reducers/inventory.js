import React, { createContext, useReducer } from 'react';
import {
  ADD_INVENTORY,
  IS_UPLOADING,
  SET_INVENTORY_ID,
  UPDATE_PENDING_COUNT,
  UPDATE_UPLOAD_COUNT,
  INITIATE_INVENTORY_STATE,
  DELETE_INVENTORY_ID,
  UPDATE_PROGRESS_COUNT,
  SET_SKIP_TO_INVENTORY_OVERVIEW
} from '../actions/Types';

// stores the initial properties of the inventory state
const initialState = {
  inventoryID: null,
  pendingCount: 0,
  isInventoryUploading: false,
  allInventory: [],
  uploadCount: 0,
  isUploading: false,
  progressCount: 0,
  skipToInventoryOverview: false,
};

// Inventory reducer function which takes the state and action param
const inventoryReducer = (state = initialState, action) => {
  // used to switch between the action types
  switch (action.type) {
    // changes the inventory ID property of the state
    case SET_INVENTORY_ID:
      return {
        ...state,
        inventoryID: action.payload,
      };

    // changes the inventory ID property of the state to null
    case DELETE_INVENTORY_ID:
      return {
        ...state,
        inventoryID: null,
      };

    // adds new inventory to the allInventory array property of the state
    case ADD_INVENTORY:
      return {
        ...state,
        allInventory: [...state.allInventory, action.payload],
      };
    // changes the pending count depending of the type of value passed
    // if type is custom then uses the count passed in payload and replace the value
    // if decrement is passed then decrease the current value by 1 and vice versa if type is increment
    case UPDATE_PENDING_COUNT: {
      let count = state.pendingCount;
      if (action.payload === 'increment') {
        count = state.pendingCount + 1;
      } else if (action.payload === 'decrement') {
        count = state.pendingCount === 0 ? state.pendingCount : state.pendingCount - 1;
      } else {
        count = action.payload;
      }
      return {
        ...state,
        pendingCount: count,
      };
    }
    // changes the upload count depending of the type of value passed
    // if type is custom then uses the count passed in payload and replace the value
    // if decrement is passed then decrease the current value by 1 and vice versa if type is increment
    case UPDATE_UPLOAD_COUNT: {
      let count = state.uploadCount;
      if (action.payload === 'increment') {
        count = state.uploadCount + 1;
      } else if (action.payload === 'decrement') {
        count = state.uploadCount === 0 ? state.uploadCount : state.uploadCount - 1;
      } else {
        count = action.payload;
      }
      return {
        ...state,
        uploadCount: count,
      };
    }

    case UPDATE_PROGRESS_COUNT: {
      let count;
      if (action.payload === 'increment') {
        count = state.progressCount + 1;
      } else if (action.payload === 'decrement') {
        count = state.progressCount === 0 ? state.progressCount : state.progressCount - 1;
      } else {
        count = action.payload;
      }
      return {
        ...state,
        progressCount: count,
      };
    }

    // changes the value of isUploading by replacing with payload data
    case IS_UPLOADING:
      return {
        ...state,
        isUploading: action.payload,
      };
    // changes the value of isUploading by replacing with payload data
    case INITIATE_INVENTORY_STATE:
      return {
        ...state,
        allInventory: [...state.allInventory, action.payload],
      };

    // changes the skipToInventoryOverview value
    case SET_SKIP_TO_INVENTORY_OVERVIEW:
      return {
        ...state,
        skipToInventoryOverview: action.payload
      };
    default:
      return state;
  }
};

// Creates the context object for Inventory. Used by component to get the state and dispatch function of inventory
export const InventoryContext = createContext({
  state: initialState,
  dispatch: () => null,
});

// Create a provider for components to consume and subscribe to changes
export const InventoryContextProvider = ({ children }) => {
  // stores state and dispatch of inventory using the reducer and initialState
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  // returns a provider used by component to access the state and dispatch function of inventory
  return (
    <InventoryContext.Provider value={{ state, dispatch }}>{children}</InventoryContext.Provider>
  );
};
