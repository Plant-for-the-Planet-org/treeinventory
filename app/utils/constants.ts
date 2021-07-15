interface ILogTypes {
  // log type used for inventory feature
  INVENTORY: 'INVENTORY';
  // log type used for maps feature
  MAPS: 'MAPS';
  // log type for manage species features
  MANAGE_SPECIES: 'MANAGE_SPECIES';
  // log type used while performing sync
  DATA_SYNC: 'DATA_SYNC';
  // log type used for user based functionality
  USER: 'USER';
  // log type used for managing projects
  PROJECTS: 'PROJECTS';
  // log type used for other functionality
  OTHER: 'OTHER';
  // log type used for additional data feature
  ADDITIONAL_DATA: 'ADDITIONAL_DATA';
}

export type TLogTypes =
  | 'INVENTORY'
  | 'MAPS'
  | 'MANAGE_SPECIES'
  | 'DATA_SYNC'
  | 'USER'
  | 'PROJECTS'
  | 'OTHER'
  | 'ADDITIONAL_DATA';

// defines the types of logs supported by the application
export const LogTypes: ILogTypes = {
  INVENTORY: 'INVENTORY',
  MAPS: 'MAPS',
  MANAGE_SPECIES: 'MANAGE_SPECIES',
  DATA_SYNC: 'DATA_SYNC',
  USER: 'USER',
  PROJECTS: 'PROJECTS',
  OTHER: 'OTHER',
  ADDITIONAL_DATA: 'ADDITIONAL_DATA',
};

// defines the log levels
interface ILogLevels {
  // this is used when the expected behaviour is correct
  INFO: 'INFO';
  // this is used when behaviour of the app is correct but some precaution or suspicious activity needs to be attended
  WARN: 'WARN';
  // this is used when some error occurred and needs to be attended on priority
  ERROR: 'ERROR';
}

export type TLogLevels = 'INFO' | 'WARN' | 'ERROR';

// defines the log levels
export const LogLevels: ILogLevels = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

// Diameter to Breast Height in meter(m) - used to decide at what height diameter should be measured
export const DBHInMeter = 1.3;

// multiplication factor to convert foot to meter
export const footToMeter: number = 0.3048;

// multiplication factor to convert meter to centimeter
export const meterToCentimeter: number = 100;

// multiplication factor to convert inch to centimeter
export const inchToCm: number = 2.54;

// multiplication factor to convert meter to foot
export const meterToFoot: number = 1 / footToMeter;

// multiplication factor to convert centimeter to inch
export const cmToInch: number = 1 / inchToCm;

// min diameter value in centimeter
export const diameterMinCm: number = 0.1;

// max diameter value in centimeter
export const diameterMaxCm: number = 10000;

// min height value in meter
export const heightMinM: number = 0.01;

// max height value in meter
export const heightMaxM: number = 200;

// min diameter value in inch
export const diameterMinInch: number = 0.03937;

// max diameter value in inch
export const diameterMaxInch: number = 3937.0079;

// min height value in foot
export const heightMinFoot: number = 0.0328;

// max height value in foot
export const heightMaxFoot: number = 656.1679;

// minimum ratio of height:diameter
export const minHeightDiameterRatio: number = 2 / 1;

// maximum ratio of height:diameter
export const maxHeightDiameterRatio: number = 160 / 1;

// countries which does not follow International System of Units for measurements
export const nonISUCountries = ['US', 'LR', 'MM'];
