// used to set the inventory id of an inventory
export const SET_INVENTORY_ID = 'SET_INVENTORY_ID';

// used to delete the inventory id from the inventory state
export const DELETE_INVENTORY_ID = 'DELETE_INVENTORY_ID';

// used when the inventory is initiated
export const INITIATE_INVENTORY_STATE = 'INITIATE_INVENTORY_STATE';

// used to add a new inventory
export const ADD_INVENTORY = 'ADD_INVENTORY';

// used to update the value of pending count whenever a new registration is done or data of a tree is synced
export const UPDATE_PENDING_COUNT = 'UPDATE_PENDING_COUNT';

// used to update the value of progress count whenever a new registration is done or data of a tree is synced
export const UPDATE_PROGRESS_COUNT = 'UPDATE_PROGRESS_COUNT';

// used to update the value of upload count whenever the data of tree registration is synced
export const UPDATE_UPLOAD_COUNT = 'UPDATE_UPLOAD_COUNT';

// used to update the value of uploading in the state whenever the data sync to server starts or stops
export const IS_UPLOADING = 'IS_UPLOADING';

export const SET_LOADING = 'SET_LOADING';
export const SET_SIGNUP_LOADING = 'SET_SIGNUP_LOADING';

// Type used to show specie on SpecieInfo screen
export const SET_SPECIE = 'SET_SPECIE';

// Type used to clear specie state after navigated back from SpecieInfo screen
export const CLEAR_SPECIE = 'CLEAR_SPECIE';

// used when user is successfully logged in into the app this type is used to add tokens and set user as logged in
export const SET_INITIAL_USER_STATE = 'SET_INITIAL_USER_STATE';

// Type to set user details in user state of app. Used when the app starts and when there is no user data available in DB.
export const SET_USER_DETAILS = 'SET_USER_DETAILS';

// Type to reset the user state to initialState. Used when user is logged out or no user data is present
export const CLEAR_USER_DETAILS = 'CLEAR_USER_DETAILS';

// Type to show main screens navigation stack
export const SET_SKIP_TO_INVENTORY_OVERVIEW = 'SET_SKIP_TO_INVENTORY_OVERVIEW';
