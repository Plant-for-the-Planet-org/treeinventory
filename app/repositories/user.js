import { bugsnag } from '../utils';
import { LogTypes } from '../utils/constants';
import dbLog from './logs';
import { getSchema } from './default';
import Realm from 'realm';

export const getUserToken = () => {
  return new Promise((resolve) => {
    Realm.open(getSchema())
      .then((realm) => {
        // Gets the user data from the DB
        const User = realm.objectForPrimaryKey('User', 'id0001');
        if (User) {
          const accessToken = User.accessToken;

          // returns accessToken
          resolve(accessToken);

          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.USER,
            message: 'Successfully retrieved User Token',
          });
        } else {
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.USER,
            message: 'No user present to get the token',
          });
          resolve(false);
        }
      })
      .catch((err) => {
        console.error(`Error: /repositories/getUserToken -> ${JSON.stringify(err)}`);
        dbLog.error({
          logType: LogTypes.USER,
          message: 'Error while retrieving User Token',
          logStack: JSON.stringify(err),
        });
        bugsnag.notify(err);
        resolve(false);
      });
  });
};

export const isLogin = () => {
  return new Promise((resolve) => {
    Realm.open(getSchema())
      .then((realm) => {
        const User = realm.objectForPrimaryKey('User', 'id0001');
        if (User) {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch((err) => {
        console.error(`Error at /repositories/user/isLogin, ${JSON.stringify(err)}`);
        dbLog.error({
          logType: LogTypes.USER,
          message: 'Error while checking login',
          logStack: JSON.stringify(err),
        });
      });
  });
};

export const getUserDetails = () => {
  return new Promise((resolve) => {
    Realm.open(getSchema())
      .then((realm) => {
        const User = realm.objectForPrimaryKey('User', 'id0001');
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.USER,
          message: 'Successfully retrieved User details',
        });
        resolve(User);
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.USER,
          message: 'Error while retrieving User details',
          logStack: JSON.stringify(err),
        });
        resolve(false);
      });
  });
};

/**
 * Creates or modifies the accessToken, idToken and refreshToken of user in the database.
 * @param {object} tokenData - should have accessToken, idToken, refreshToken to update in user's data
 * @returns {boolean} - can be used to check if the operation was successful or not
 */
export const createOrModifyUserToken = ({ accessToken, idToken, refreshToken, expirationTime }) => {
  return new Promise((resolve) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          realm.create(
            'User',
            {
              id: 'id0001',
              accessToken,
              idToken,
              refreshToken,
              expirationTime,
            },
            'modified',
          );
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.USER,
            message: 'Successfully created user in DB',
          });
          resolve(true);
        });
      })
      .catch((err) => {
        console.error(
          `Error at /repositories/user/createOrModifyUserToken, ${JSON.stringify(err)}`,
        );

        dbLog.error({
          logType: LogTypes.USER,
          message: 'Error while creating user in DB',
          logStack: JSON.stringify(err),
        });
        bugsnag.notify(err);
        resolve(false);
      });
  });
};

/**
 * Deletes the user from the database.
 * @returns {boolean} - can be used to check if the operation was successful or not
 */
export const deleteUser = () => {
  return new Promise((resolve) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          const user = realm.objectForPrimaryKey('User', 'id0001');
          if (user) {
            realm.delete(user);
            // logging the success in to the db
            dbLog.info({
              logType: LogTypes.USER,
              message: 'Successfully deleted user from DB',
            });
          }
          resolve(true);
        });
      })
      .catch((err) => {
        console.error(`Error at /repositories/user/deleteUser, ${JSON.stringify(err)}`);

        dbLog.error({
          logType: LogTypes.USER,
          message: 'Error while deleting user from DB',
          logStack: JSON.stringify(err),
        });
        bugsnag.notify(err);
        resolve(false);
      });
  });
};

/**
 * Modifies the details passed to update in user's data.
 * @param {object} userDetails - should only have User schema data to update user's data
 * @returns {boolean} - can be used to check if the operation was successful or not
 */
export const modifyUserDetails = (userDetails) => {
  return new Promise((resolve) => {
    Realm.open(getSchema())
      .then((realm) => {
        realm.write(() => {
          realm.create(
            'User',
            {
              id: 'id0001',
              ...userDetails,
            },
            'modified',
          );
        });
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.USER,
          message: 'Successfully modified user details in DB',
        });
        resolve(true);
      })
      .catch((err) => {
        console.error(`Error at /repositories/user/modifyUserDetails, ${JSON.stringify(err)}`);

        dbLog.error({
          logType: LogTypes.USER,
          message: 'Error while modifying user details in DB',
          logStack: JSON.stringify(err),
        });
        bugsnag.notify(err);
        resolve(false);
      });
  });
};

export const getUserInformation = () => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        const User = realm.objectForPrimaryKey('User', 'id0001');
        if (User) {
          // logging the success in to the db
          dbLog.info({
            logType: LogTypes.USER,
            message: 'Successfully retrieved User Information',
          });
          resolve({
            email: User.email,
            firstName: User.firstName,
            lastName: User.lastName,
            country: User.country,
            idLogEnabled: User.idLogEnabled,
          });
        } else {
          resolve({ email: '', firstName: '', lastName: '' });
        }
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.USER,
          message: 'Error while retrieving user details',
          logStack: JSON.stringify(err),
        });
      });
  });
};

export const setActivityLog = (bool) => {
  return new Promise((resolve, reject) => {
    Realm.open(getSchema())
      .then((realm) => {
        // const User = realm.objectForPrimaryKey('User', 'id0001');
        realm.write(() => {
          realm.create('User', { id: 'id0001', idLogEnabled: bool }, 'modified');
        });
        // logging the success in to the db
        dbLog.info({
          logType: LogTypes.USER,
          message: `Successfully toggled ${bool ? 'on' : 'off'} Activity Log`,
        });
        resolve();
      })
      .catch((err) => {
        dbLog.error({
          logType: LogTypes.USER,
          message: 'Error while changing isLogEnabled value',
          logStack: JSON.stringify(err),
        });
      });
  });
};
