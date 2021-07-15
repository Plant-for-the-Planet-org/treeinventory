import { accessTypes } from '../../utils/additionalData/constants';
import { appAdditionalDataForAPI } from '../../utils/additionalData/functions';
import {
  INCOMPLETE,
  INCOMPLETE_SAMPLE_TREE,
  PENDING_DATA_UPLOAD,
} from '../../utils/inventoryConstants';
import { version } from '../../../package.json';

// schema version
const schemaVersion = 11;

// SCHEMAS
const Coordinates = {
  name: 'Coordinates',
  properties: {
    latitude: 'double',
    longitude: 'double',
    imageUrl: 'string?',
    cdnImageUrl: 'string?',
    currentloclat: 'double',
    currentloclong: 'double',
    isImageUploaded: 'bool?',
    coordinateID: 'string?',
  },
};

const Polygons = {
  name: 'Polygons',
  properties: {
    isPolygonComplete: 'bool?',
    coordinates: 'Coordinates[]',
  },
};

const Species = {
  name: 'Species',
  properties: {
    aliases: 'string',
    treeCount: 'int',
    id: 'string?',
  },
};

const OfflineMaps = {
  name: 'OfflineMaps',
  primaryKey: 'name',
  properties: {
    areaName: 'string',
    size: 'int',
    name: 'string',
  },
};

const AdditionalDetail = {
  name: 'AdditionalDetail',
  properties: {
    key: 'string',
    value: 'string',
    // refer [dataTypes] from [additionalDataConstants]
    accessType: 'string',
  },
};

// used to record the sample trees
const SampleTrees = {
  name: 'SampleTrees',
  properties: {
    // stores the latitude of the tree
    latitude: 'double',
    // stores the longitude of the tree
    longitude: 'double',
    // stores the latitude of the device when location was marked
    deviceLatitude: 'double',
    // stores the longitude of the device when location was marked
    deviceLongitude: 'double',
    // stores accuracy of location when the location was marked
    locationAccuracy: 'double?',
    // URL of the image if picture was clicked
    imageUrl: 'string?',
    // CDN URL of the image if picture was clicked
    cdnImageUrl: 'string?',
    // specie id for this sample tree
    specieId: 'string?',
    // specie name of specie id for this sample tree
    specieName: 'string?',
    // diameter of selected specie
    specieDiameter: 'double?',
    // height of selected specie
    specieHeight: 'double?',
    // tag id of the tree if the tree has one
    tagId: 'string?',
    // current status of the tree. Refer to inventoryConstants for different status
    status: { type: 'string', default: 'INCOMPLETE' },
    // stores the date when the tree was planted
    plantationDate: 'date?',
    // stores the location id when the data upload is successful
    locationId: 'string?',
    // stores the tree type which is always sample tree
    treeType: { type: 'string', default: 'sample' },
    // stores the additional details for the registration
    additionalDetails: 'AdditionalDetail[]',
    // stores the app metadata. Needs to be stringified as it might contain nested array/objects
    appMetadata: 'string?',
  },
};

const Inventory = {
  name: 'Inventory',
  primaryKey: 'inventory_id',
  properties: {
    inventory_id: 'string',
    plantation_date: 'date?',
    treeType: 'string?',
    status: 'string?',
    projectId: 'string?',
    donationType: 'string?',
    locateTree: 'string?',
    lastScreen: 'string?',
    species: 'Species[]',
    polygons: 'Polygons[]',
    specieDiameter: 'double?',
    specieHeight: 'double?', // <*IMPORTANT*> ONLY FOR SINGLE TREE
    tagId: 'string?',
    registrationDate: 'date?',
    // stores the count of sample trees which are to be recorded
    sampleTreesCount: 'int?',
    // stores the sample trees having length equal to tree count
    sampleTrees: 'SampleTrees[]',
    // stores the number of sample trees which are already recorded
    completedSampleTreesCount: {
      type: 'int?',
      default: 0,
    },
    // stores the number of sample trees which are uploaded to server
    uploadedSampleTreesCount: {
      type: 'int?',
      default: 0,
    },
    // stores the location id of the plant location which is available
    // when the inventory data is uploaded
    locationId: 'string?',
    // stores the additional details for the registration
    additionalDetails: 'AdditionalDetail[]',
    // stores the app metadata. Needs to be stringified as it might contain nested array/objects
    appMetadata: 'string?',
  },
};

const User = {
  name: 'User',
  primaryKey: 'id',
  properties: {
    id: 'string?',
    accessToken: 'string?',
    idToken: 'string?',
    email: 'string?',
    firstName: 'string?',
    lastName: 'string?',
    image: 'string?',
    country: 'string?',
    isLogEnabled: 'bool?',
    userId: 'string?',
    userType: 'string?',
    refreshToken: 'string?',
    isSignUpRequired: 'bool?',
    type: 'string?',
    displayName: 'string?',
    // stores the expiry time of token in seconds
    expirationTime: 'int?',
  },
};

//  used to store the logs of a feature or a flow
const ActivityLogs = {
  name: 'ActivityLogs',
  primaryKey: 'id',
  properties: {
    // id of the log
    id: 'string',
    // id of the feature or flow this log is linked to. (optional)
    referenceId: 'string?',
    // defines the type of log. Refer to constants - LogTypes
    logType: 'string',
    // defines the log level. Refer constants - LogLevels
    logLevel: 'string',
    // time at which the log was created or modified
    timestamp: 'date',
    // text which is to be logged
    message: 'string',
    // version of tree mapper app
    appVersion: 'string',
    // status code for api request (optional)
    statusCode: 'string?',
    // used to show extra details if available (optional)
    logStack: 'string?',
  },
};

// used to store all the available scientific species extracted from zip
const ScientificSpecies = {
  name: 'ScientificSpecies',
  primaryKey: 'guid',
  properties: {
    // stores the guid of scientific specie
    guid: 'string',
    // stores the name of scientific specie and indexed for better search
    scientificName: { type: 'string', indexed: true },
    // used to check if this specie is preferred by user or not. Default to [false]
    isUserSpecies: { type: 'bool', default: false },
    // used to check whether this specie is synced to server or not. Defaults to [false]
    // This property is used with [isUserSpecies]
    isUploaded: { type: 'bool', default: false },
    // stores the specieId which is uploaded on server
    specieId: 'string?',
    aliases: { type: 'string', default: '' },
    image: { type: 'string', default: '' },
    description: { type: 'string', default: '' },
    isUpdated: { type: 'bool', default: true },
  },
};

// used to store all the available scientific species extracted from zip
const Projects = {
  name: 'Projects',
  primaryKey: 'id',
  properties: {
    id: 'string',
    slug: 'string',
    allowDonations: 'bool',
    countPlanted: 'int',
    countTarget: 'int',
    currency: 'string',
    image: 'string',
    country: 'string',
    name: 'string',
    treeCost: 'double',
  },
};

// dropdown options for dropdown field
const DropdownOption = {
  name: 'DropdownOption',
  embedded: true,
  properties: {
    key: 'string',
    value: 'string',
  },
};

// Element Type - Dropdown
const Dropdown = {
  name: 'Dropdown',
  primaryKey: 'id',
  properties: {
    id: 'string',
    parentId: {
      type: 'string',
      indexed: true,
    },
    defaultValue: 'string?',
    isRequired: {
      type: 'bool',
      default: false,
    },
    dropdownOptions: 'DropdownOption[]',
  },
};

// Element Type - Input
const Input = {
  name: 'Input',
  primaryKey: 'id',
  properties: {
    id: 'string',
    parentId: {
      type: 'string',
      indexed: true,
    },
    defaultValue: 'string?',
    isRequired: {
      type: 'bool',
      default: false,
    },
    type: 'string',
    regexValidation: 'string?',
  },
};

// Element Type - YesNo
const YesNo = {
  name: 'YesNo',
  primaryKey: 'id',
  properties: {
    id: 'string',
    parentId: {
      type: 'string',
      indexed: true,
    },
    defaultValue: {
      type: 'bool',
      default: false,
    },
    isRequired: {
      type: 'bool',
      default: false,
    },
  },
};

// Stores details of a single field which then is stores in form fields list
const Element = {
  name: 'Element',
  primaryKey: 'id',
  properties: {
    id: 'string',
    key: 'string',
    name: 'string',
    type: 'string',
    treeType: 'string[]',
    registrationType: 'string[]',
    // refer [dataTypes] from [additionalDataConstants]
    accessType: { type: 'string', default: 'private' },
  },
};

// Stores all the forms(multi steps) created by the user
const Form = {
  name: 'Form',
  primaryKey: 'id',
  properties: {
    id: 'string',
    order: 'int',
    // stores list of all the elements for a form
    elements: 'Element[]',
    title: 'string?',
    description: 'string?',
  },
};

// Stores all the metadata added by the user from Metadata UI
const Metadata = {
  name: 'Metadata',
  primaryKey: 'id',
  properties: {
    id: 'string',
    key: 'string',
    value: 'string',
    order: 'int',
    // refer [dataTypes] from [additionalDataConstants]
    accessType: { type: 'string', default: 'private' },
  },
};

const migration = (oldRealm: any, newRealm: any) => {
  if (oldRealm.schemaVersion < schemaVersion) {
    const oldInventoryObject = oldRealm.objects('Inventory');
    const newInventoryObject = newRealm.objects('Inventory');

    for (const index in oldInventoryObject) {
      if (
        oldInventoryObject[index].inventory_id &&
        (oldInventoryObject[index].status === INCOMPLETE ||
          oldInventoryObject[index].status === INCOMPLETE_SAMPLE_TREE ||
          oldInventoryObject[index].status === PENDING_DATA_UPLOAD)
      ) {
        const appVersion =
          oldInventoryObject[index].status === PENDING_DATA_UPLOAD ? '1.0.2' : version;
        // adds all the data from old inventory except APP accessType
        newInventoryObject[index].additionalDetails = oldInventoryObject[
          index
        ].additionalDetails.filter(
          (d: any) => d.accessType === accessTypes.PRIVATE || d.accessType === accessTypes.PUBLIC,
        );

        // adds app version to additional details
        newInventoryObject[index].additionalDetails.push({
          key: 'appVersion',
          value: appVersion,
          accessType: accessTypes.APP,
        });

        const appMetadata = appAdditionalDataForAPI({ data: oldInventoryObject[index] });
        // overrides the appVersion
        appMetadata.appVersion = appVersion;

        // adds appMetadata which is used to send data to API
        newInventoryObject[index].appMetadata = JSON.stringify(appMetadata);

        for (const sampleIndex in oldInventoryObject[index].sampleTrees) {
          const sampleTree = oldInventoryObject[index].sampleTrees[sampleIndex];

          // adds all the data from old inventory except APP accessType
          newInventoryObject[index].sampleTrees[
            sampleIndex
          ].additionalDetails = sampleTree.additionalDetails.filter(
            (d: any) => d.accessType === accessTypes.PRIVATE || d.accessType === accessTypes.PUBLIC,
          );

          // adds app version to additional details
          newInventoryObject[index].sampleTrees[sampleIndex].additionalDetails.push({
            key: 'appVersion',
            value: appVersion,
            accessType: accessTypes.APP,
          });

          const sampleAppMetadata = appAdditionalDataForAPI({
            data: sampleTree,
            isSampleTree: true,
          });
          // overrides the appVersion
          sampleAppMetadata.appVersion = appVersion;

          // adds appMetadata which is used to send data to API
          newInventoryObject[index].sampleTrees[sampleIndex].appMetadata = JSON.stringify(
            sampleAppMetadata,
          );
        }
      }
    }
  }
};

export default {
  schema: [
    Coordinates,
    Polygons,
    User,
    OfflineMaps,
    Species,
    Inventory,
    ScientificSpecies,
    ActivityLogs,
    SampleTrees,
    Projects,
    DropdownOption,
    Dropdown,
    Input,
    YesNo,
    Element,
    Form,
    Metadata,
    AdditionalDetail,
  ],
  schemaVersion,
  migration,
};
