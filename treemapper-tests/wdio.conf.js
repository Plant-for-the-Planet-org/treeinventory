import Config from 'react-native-config';

exports.config = {
  user: Config.BROWSERSTACK_USERNAME,
  key: Config.BROWSERSTACK_ACCESS_KEY,

  updateJob: false,
  specs: ['./*.spec.js'],
  exclude: [],

  capabilities: [
    {
      project: 'First Webdriverio Android Project',
      build: 'Webdriverio Android',
      name: 'first_test',
      device: 'Google Pixel 3',
      os_version: '9.0',
      app: Config.BROWSERSTACK_APP_ID,
      'browserstack.debug': true,
    },
  ],

  logLevel: 'info',
  coloredLogs: true,
  screenshotPath: './errorShots/',
  baseUrl: '',
  waitforTimeout: 10000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 20000,
  },
};
