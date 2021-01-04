import React, { createContext, useReducer } from 'react';
import {
  LocalInventoryActions,
  LoaderActions,
  SignUpLoader,
  SpeciesListAction,
  SpecieIdFromServer
} from '../Actions/Action';

const initialState = { inventoryID: undefined };
const store = createContext(initialState);
const { Provider } = store;

const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case LocalInventoryActions.SET_INVENTORY_ID:
        const newState = state;
        newState.inventoryID = action.payload;
        return newState;
      case LoaderActions.SET_LOADING:
        return {
          ...state,
          isLoading: action.payload,
        };
      case SignUpLoader.SET_SIGNUP_LOADER:
        return {
          ...state,
          isSignUpLoader: action.payload,
        };
      case SpeciesListAction.SET_SPECIES_LIST:
        return {
          ...state,
          species: action.payload,
        };
      case SpecieIdFromServer.SET_SPECIES_ID:
        return {
          ...state,
          specieId: action.payload,
        };
      default:
        throw new Error();
    }
  }, initialState);

  return <Provider value={{ state, dispatch }}>{children}</Provider>;
};

export { store, StateProvider };
