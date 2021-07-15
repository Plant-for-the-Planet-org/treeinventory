import AsyncStorage from '@react-native-community/async-storage';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { name as packageName, version } from '../../package';
import { APIConfig } from '../actions/Config';
import { checkErrorCode, getNewAccessToken } from '../actions/user';
import dbLog from '../repositories/logs';
import { getUserDetails } from '../repositories/user';
import { isInternetConnected } from './checkInternet';
import { LogTypes } from './constants';
import { bugsnag } from './index';

const { protocol, url: baseURL } = APIConfig;

// creates and axios instance with base url
const axiosInstance = axios.create({
  baseURL: `${protocol}://${baseURL}`,
});

// Add a request interceptor which adds the configuration in all the requests
axiosInstance.interceptors.request.use(
  async (config) => {
    // stores the session id present in AsyncStorage
    let sessionId: any = await AsyncStorage.getItem('session-id');

    // if session ID is empty in AsyncStorage then creates a new unique session ID and and sores in AsyncStorage
    if (!sessionId) {
      sessionId = uuidv4();
      await AsyncStorage.setItem('session-id', sessionId);
    }

    // if there's session id then adds the same into the header
    if (sessionId) {
      config.headers['X-SESSION-ID'] = sessionId;
    }
    // sets the content type to json
    config.headers['Content-Type'] = 'application/json';
    config.headers['User-Agent'] = packageName + '/' + Platform.OS + '/' + version;
    return config;
  },
  (error) => {
    console.error('Error while setting up axios request interceptor,', error);
  },
);

// Add a response interceptor which checks for error code for all the requests
axiosInstance.interceptors.response.use(undefined, async (err) => {
  // stores the original request (later used to retry the request)
  let originalRequest = err.config;
  const networkConnection = await isInternetConnected();

  // retries if err is 401 or 403 and if request is already not tried once
  if ((err?.response?.status === 403 || err?.response?.status === 401) && !originalRequest._retry) {
    originalRequest._retry = true;

    const userDetails = await getUserDetails();

    // gets new access token from refresh token and retries the request.
    if (userDetails && networkConnection) {
      const access_token = await getNewAccessToken(userDetails.refreshToken);
      originalRequest.headers['Authorization'] = 'Bearer ' + access_token;
      return axiosInstance(originalRequest);
    }
  } else {
    checkErrorCode(err);
    return Promise.reject(err);
  }
});

interface RequestParams {
  url: string;
  method?: string;
  isAuthenticated?: boolean;
  data?: any;
  header?: object;
}

const request = async ({
  url,
  method = 'GET',
  isAuthenticated = false,
  data = undefined,
  header = {},
}: RequestParams) => {
  const networkConnection = await isInternetConnected();

  return new Promise((resolve, reject) => {
    //  sets the options which is passed to axios to make the request
    let options: any = {
      method,
      url,
    };

    // if the method is either POST, PUT or DELETE and data is present then adds data property to options
    if ((method === 'POST' || method === 'PUT' || method === 'DELETE') && data) {
      options.data = data;
    }

    if (!networkConnection) {
      return new Error('No internet connection available.');
    }

    // if request needs to be authenticated the Authorization is added in headers.
    // if access token is not present then throws error for the same
    if (isAuthenticated) {
      getUserDetails().then(async (userDetails) => {
        if (!userDetails) {
          return new Error('User details are not available.');
        }

        const isTokenExpired = getCurrentUnixTimestamp() > userDetails.expirationTime;
        // if token is expired then fetches new using refresh token
        let accessToken =
          isTokenExpired && networkConnection
            ? await getNewAccessToken(userDetails.refreshToken)
            : userDetails.accessToken;

        // const accessToken = await getUserDetails();
        if (!accessToken) {
          return new Error('Access token is not available.');
        }
        // adds Authorization to headers in options
        options.headers = {
          Authorization: `Bearer ${accessToken}`,
          ...header,
        };

        // returns a promise with axios instance
        axiosInstance(options).then(resolve).catch(reject);
      });
    } else {
      // returns a promise with axios instance
      axiosInstance(options).then(resolve).catch(reject);
    }
  }).catch((err) => {
    console.error(`Error while making ${method} request,`, {
      url,
      isAuthenticated,
      err,
    });
    dbLog.error({
      logType: LogTypes.OTHER,
      message: `Error while making ${method} request with url: ${url}, isAuthenticated:${isAuthenticated}`,
      logStack: JSON.stringify({
        url,
        isAuthenticated,
        err,
      }),
    });
    bugsnag.notify(err);
    return Promise.reject(err);
  });
};

export const getCurrentUnixTimestamp = () => Math.floor(Date.now() / 1000);

export const getExpirationTimeStamp = (token: string) => {
  const decodedToken = jwtDecode(token);

  const { exp } = decodedToken;
  return exp;
};

// calls the [request] function with [url]
export const getRequest = (url: string, header: object = {}) => request({ url, header });

// calls the [request] function with [url] and [isAuthenticated = true]
export const getAuthenticatedRequest = (url: string, header: object = {}) =>
  request({ url, isAuthenticated: true, header });

// calls the [request] function with [url], [data], [method = 'POST'] and [isAuthenticated = false]
export const postRequest = (url: string, data: any, header: object = {}) =>
  request({ url, method: 'POST', isAuthenticated: false, data, header });

// calls the [request] function with [url], [data], [method = 'POST'] and [isAuthenticated = true]
export const postAuthenticatedRequest = (url: string, data: any, header: object = {}) =>
  request({ url, method: 'POST', isAuthenticated: true, data, header });

// calls the [request] function with [url], [data], [method = 'PUT'] and [isAuthenticated = false]
export const putRequest = (url: string, data: any, header: object = {}) =>
  request({ url, method: 'PUT', isAuthenticated: false, data, header });

// calls the [request] function with [url], [data], [method = 'PUT'] and [isAuthenticated = true]
export const putAuthenticatedRequest = (url: string, data: any, header: object = {}) =>
  request({ url, method: 'PUT', isAuthenticated: true, data, header });

// calls the [request] function with [url], [data], [method = 'DELETE'] and [isAuthenticated = false]
export const deleteRequest = (url: string, data = null, header: object = {}) =>
  request({ url, method: 'DELETE', isAuthenticated: false, data, header });

// calls the [request] function with [url], [data], [method = 'DELETE'] and [isAuthenticated = true]
export const deleteAuthenticatedRequest = (url: string, data = null, header: object = {}) =>
  request({ url, method: 'DELETE', isAuthenticated: true, data, header });
