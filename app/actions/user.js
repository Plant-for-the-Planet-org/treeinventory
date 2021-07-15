import AsyncStorage from '@react-native-community/async-storage';
import Auth0 from 'react-native-auth0';
import Config from 'react-native-config';
import dbLog from '../repositories/logs';
import { addProjects } from '../repositories/projects';
import { resetAllSpecies } from '../repositories/species';
import { createOrModifyUserToken, deleteUser, modifyUserDetails } from '../repositories/user';
import { bugsnag } from '../utils';
import { addInventoryFromServer } from '../utils/addInventoryFromServer';
import { checkAndAddUserSpecies } from '../utils/addUserSpecies';
import { getAuthenticatedRequest, getExpirationTimeStamp, postRequest } from '../utils/api';
import { isInternetConnected } from '../utils/checkInternet';
import { LogTypes } from '../utils/constants';
import { CLEAR_USER_DETAILS, SET_INITIAL_USER_STATE, SET_USER_DETAILS } from './Types';

// creates auth0 instance while providing the auth0 domain and auth0 client id
const auth0 = new Auth0({ domain: Config.AUTH0_DOMAIN, clientId: Config.AUTH0_CLIENT_ID });

// stores the protocol and url used for api request

/* ============================== *\
      Auth0 functions - STARTS
\* ============================== */

/**
 * Used to login or signup into the app. After the user is authorized successfully the auth0 returns an access token
 * which is used in the app to authenticate the api calls. Then it creates a new user or replace the existing
 * accessToken, idToken and refreshToken in the realm DB using func [createOrModifyUserToken]. Followed by calling
 * func [setUserInitialState] to update the app's user state. Followed by calling func [getUserDetailsFromServer]
 * to get the user details.
 * @param {ActionDispatch} dispatch - requires dispatch function of user context to pass it to func [setUserInitialState]
 */
export const auth0Login = (dispatch) => {
  return new Promise((resolve, reject) => {
    auth0.webAuth
      .authorize(
        {
          scope: 'openid email profile offline_access',
          federated: true,
          prompt: 'login',
          audience: 'urn:plant-for-the-planet',
        },
        { ephemeralSession: true },
      )
      .then((credentials) => {
        const expirationTime = getExpirationTimeStamp(credentials.accessToken);

        // logs success info in DB
        dbLog.info({
          logType: LogTypes.USER,
          message: 'Login successful from auth0',
        });

        // creates the user after successful login by passing the credentials having accessToken, idToken
        // and refreshToken to store in DB
        createOrModifyUserToken({ ...credentials, expirationTime });

        // sets the accessToken and idToken in the user state of the app
        setUserInitialState(credentials)(dispatch);

        // fetches the user details from server by passing the accessToken which is used while requesting the API
        getUserDetailsFromServer(dispatch)
          .then((userDetails) => {
            // destructured and modified variable names which is used to set user state
            const {
              email,
              firstname: firstName,
              lastname: lastName,
              image,
              country,
              id: userId,
            } = userDetails;

            // dispatch function sets the passed user details into the user state
            setUserDetails({
              email,
              firstName,
              lastName,
              image,
              country,
              userId,
            })(dispatch);

            getAllProjects();
            checkAndAddUserSpecies().then(() => {
              addInventoryFromServer();
            });
            resolve(true);
          })
          .catch((err) => {
            reject(err);
          });
      })
      .catch((err) => {
        if (err?.error !== 'a0.session.user_cancelled') {
          dbLog.error({
            logType: LogTypes.USER,
            message: 'Error while logging in from auth0',
            logStack: JSON.stringify(err),
          });
          // if any error is found then deletes the user and clear the user app state
          deleteUser();
          clearUserDetails()(dispatch);
          bugsnag.notify(err);
        } else {
          dbLog.info({
            logType: LogTypes.USER,
            message: 'User cancelled auth0 login',
            logStack: JSON.stringify(err),
          });
        }
        reject(err);
      });
  });
};

/**
 * Logs out the user by clearing the session from auth0 then calls the deleteUser function to delete the user from DB
 * also calls the function [clearUserDetails] which dispatches type to clear the app's user state
 * @param {ActionDispatch} userDispatch - dispatch function of user context to pass it to func [clearUserDetails]
 * @returns {Promise<boolean>} - returns true after all the operations are successful else returns false
 */
export const auth0Logout = async (userDispatch = null) => {
  const isConnected = await isInternetConnected();

  return new Promise((resolve) => {
    if (!isConnected) {
      resolve(false);
      return;
    }
    auth0.webAuth
      .clearSession()
      .then(async () => {
        // deletes the user from DB
        await deleteUser();

        await resetAllSpecies();

        // removes [isInitialSyncDone] item from AsyncStorage
        await AsyncStorage.removeItem('isInitialSyncDone');

        if (userDispatch) {
          // clear the user details from the user state
          clearUserDetails()(userDispatch);
        }
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.USER,
          message: 'Logout successful',
        });
        resolve(true);
      })
      .catch((err) => {
        if (err?.error !== 'a0.session.user_cancelled') {
          console.error('Error at /actions/user/auth0Logout', err);
          dbLog.error({
            logType: LogTypes.USER,
            message: 'Error while Logging Out',
            logStack: JSON.stringify(err),
          });
          resolve(false);
          bugsnag.notify(err);
        } else {
          dbLog.info({
            logType: LogTypes.USER,
            message: 'User cancelled auth0 login',
            logStack: JSON.stringify(err),
          });
          resolve(false);
        }
      });
  });
};

/**
 * Calls the refreshToken function of auth module of auth0 by passing refreshToken and the calls the
 * function [createOrModifyUserToken] to store the updated tokens fetched from auth0
 * @param {string} refreshToken - used to fetch a new access token
 */
export const getNewAccessToken = async (refreshToken) => {
  const isConnected = await isInternetConnected();
  return new Promise((resolve) => {
    if (!isConnected) {
      resolve(false);
      return;
    }
    if (refreshToken) {
      // calls the refreshToken function of auth0 by passing the refreshToken
      auth0.auth
        .refreshToken({ refreshToken })
        .then((data) => {
          const expirationTime = getExpirationTimeStamp(data.accessToken);
          // calls the repo function which modifies the accessToken, idToken and refreshToken from the fetched data
          createOrModifyUserToken({ ...data, expirationTime });
          // logs the success to DB
          dbLog.info({
            logType: LogTypes.USER,
            message: 'New access token fetched successfully',
          });
          // resolves the access token
          resolve(data.accessToken);
        })
        .catch((err) => {
          auth0Logout();
          // logs the error in Db and notifies the same to bugsnag
          console.error('Error at /actions/user/getNewAccessToken', err);
          bugsnag.notify(err);
          dbLog.error({
            logType: LogTypes.USER,
            message: 'Error while fetching new access token',
            logStack: JSON.stringify(err),
          });
          resolve(false);
        });
    } else {
      auth0Logout();
      dbLog.error({
        logType: LogTypes.USER,
        message: 'No refresh token was passed',
      });
      resolve(false);
    }
  });
};

/* === Auth0 functions - ENDS === */

/* =================================== *\
      API server functions - STARTS
\* =================================== */

/**
 * This function is used to call the logout function if status code of api is 401 and returns a boolean value.
 * @param {Error} error - error of api response to check for 401 error code.
 * @returns {boolean} - returns true if user is logged out else returns false
 */
export const checkErrorCode = async (error, userDispatch = null) => {
  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return await auth0Logout(userDispatch);
  }
  if (error?.response?.status === 303) {
    modifyUserDetails({
      isSignUpRequired: true,
    });
  }
  return false;
};

/**
 * Fetches the detail of the user from the server using the accessToken and requesting the GET api - /app/profile
 * @param {string} userDispatch - used to clear the data if the error occurred will lead to logout
 */
export const getUserDetailsFromServer = (userDispatch) => {
  return new Promise((resolve, reject) => {
    getAuthenticatedRequest('/app/profile')
      .then((data) => {
        // destructured and modified variable names which is used to set user state
        const {
          email,
          firstname: firstName,
          lastname: lastName,
          image,
          country,
          id: userId,
          type,
          displayName,
        } = data.data;

        // calls modifyUserDetails function to add user's email, firstName, lastName, userId, image, accessToken and country in DB
        modifyUserDetails({
          email,
          firstName,
          lastName,
          image,
          country,
          userId,
          type,
          displayName,
        });

        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.USER,
          message: 'Successfully retrieved User Information from Server',
          statusCode: data.status,
        });
        resolve(data.data);
      })
      .catch(async (err) => {
        // calls this function to check for the error code and either logout the user or ask to signup
        await checkErrorCode(err, userDispatch);
        console.error(
          'Error at /actions/user/getUserDetailsFromServer: GET - /app/profile,',
          err.response,
          err,
        );

        dbLog.error({
          logType: LogTypes.USER,
          message: 'Failed to retrieve User Information from Server',
          statusCode: err?.response?.status,
          logStack: err?.response ? JSON.stringify(err?.response) : JSON.stringify(err),
        });
        reject(err);
      });
  });
};

export const SignupService = (payload, dispatch) => {
  // try {
  return new Promise((resolve, reject) => {
    postRequest('/app/profile', payload)
      .then(async (res) => {
        const { status, data } = res;
        if (status === 200) {
          await modifyUserDetails({
            firstName: data.firstname,
            lastName: data.lastname,
            email: data.email,
            displayName: data.displayName,
            country: data.country,
            userId: data.id,
            isSignUpRequired: false,
          });
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.USER,
            message: 'Successfully Signed up',
            statusCode: status,
          });
          resolve(data);
        }
      })
      .catch((err) => {
        console.error(
          `Error at /actions/user/SignupService: POST - /app/profile, ${JSON.stringify(
            err.response,
          )}`,
        );
        // logs the error of the failed request in DB
        dbLog.error({
          logType: LogTypes.USER,
          message: 'Failed to Sign up',
          statusCode: err?.response?.status,
          logStack: err?.response ? JSON.stringify(err?.response) : JSON.stringify(err),
        });
        // if any error is found then deletes the user and clear the user app state
        deleteUser();
        clearUserDetails()(dispatch);
        reject(err);
      });
  });
};

/**
 * Fetches all the projects of the user
 */
export const getAllProjects = () => {
  return new Promise((resolve, reject) => {
    getAuthenticatedRequest('/app/profile/projects')
      .then(async (res) => {
        const { status, data } = res;
        if (status === 200) {
          await addProjects(data);
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.USER,
            message: 'Successfully Fetched all projects: GET - /app/profile/projects',
            statusCode: status,
          });
          resolve(true);
        }
      })
      .catch((err) => {
        console.error(
          'Error at /actions/user/getAllProjects: GET - /app/profile/projects,',
          err.response ? err.response : err,
        );
        // logs the error of the failed request in DB
        dbLog.error({
          logType: LogTypes.USER,
          message: 'Error while fetching projects',
          statusCode: err?.response?.status,
          logStack: err?.response ? JSON.stringify(err?.response) : JSON.stringify(err),
        });
        reject(err);
      });
  });
};

/* === API server functions - ENDS === */

/* ================================== *\
      Dispatch functions - STARTS
\* ================================== */

/**
 * dispatches type SET_INITIAL_USER_STATE with payload as loginData to add user tokens in the user state of the app
 * @param {object} loginData - used to add the tokens in the user state of the app. The object should have accessToken and idToken
 */
export const setUserInitialState = (loginData) => (dispatch) => {
  dispatch({
    type: SET_INITIAL_USER_STATE,
    payload: loginData,
  });
};

/**
 * dispatches type SET_USER_DETAILS with payload as userDetails to add user details in the user state of the app
 * @param {object} userDetails - used to add details of user in the app state. The object should include
 *                               accessToken?, idToken?, firstName, lastName, image, userId, email, country
 */
export const setUserDetails = (userDetails) => (dispatch) => {
  dispatch({
    type: SET_USER_DETAILS,
    payload: userDetails,
  });
};

/**
 * dispatches type CLEAR_USER_DETAILS to clear user details and reset to initial state from the user state of the app
 */
export const clearUserDetails = () => (dispatch) => {
  dispatch({
    type: CLEAR_USER_DETAILS,
  });
};

/* === Dispatch functions - ENDS === */
