import { StackActions } from '@react-navigation/native';
import i18next from 'i18next';
import jwtDecode from 'jwt-decode';
import React, { useContext, useEffect, useState } from 'react';
import {
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as RNLocalize from 'react-native-localize';
import Snackbar from 'react-native-snackbar';
import Ionicons from 'react-native-vector-icons/FontAwesome';
import { Colors, Typography } from '../../styles';
import { APIConfig } from '../../actions/Config';
import { startSignUpLoading, stopLoading, stopSignUpLoading } from '../../actions/loader';
import { auth0Logout, SignupService } from '../../actions/user';
import { LoadingContext } from '../../reducers/loader';
import { UserContext } from '../../reducers/user';
import { getUserDetails } from '../../repositories/user';
import { handleFilter } from '../../utils/CountryDataFilter';
import { Header, Loader, PrimaryButton } from '../Common';
import Modal from '../Common/Modal';
import OutlinedInput from '../Common/OutlinedInput';

const { protocol, cdnUrl } = APIConfig;

// TODO:i18n - if this file is used, please add translations
const SignUp = ({ navigation }) => {
  const [accountType, setAccountType] = useState('tpo');
  const [lastname, setLastName] = useState('');
  const [firstname, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [nameOfOrg, setNameOfOrg] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [getNews, setGetNews] = useState(false);
  const [authDetail, setAuthDetails] = useState({});
  const [oAuthAccessToken, setAuthAccessToken] = useState('');
  const [firstNameError, setFirstNameError] = useState(false);
  const [lastNameError, setLastNameError] = useState(false);
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [zipCodeError, setZipCodeError] = useState(false);
  const [city, setCity] = useState('');
  const [cityError, setCityError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [completeCheck, setCompleteCheck] = useState(false);
  const [country, setCountry] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const { state: loadingState, dispatch: loadingDispatch } = useContext(LoadingContext);
  const { dispatch: userDispatch } = useContext(UserContext);
  const lang = RNLocalize.getLocales()[0];

  const toggleSwitchPublish = () => setIsPrivate((previousState) => !previousState);
  const toggleSwitchContact = () => setGetNews((previousState) => !previousState);

  const SelectType = (type) => {
    let name;
    switch (type) {
      case 'individual':
        name = i18next.t('label.individual');
        break;
      case 'tpo':
        name = i18next.t('label.tpo_title');
        break;
      case 'education':
        name = i18next.t('label.education_title');
        break;
      case 'company':
        name = i18next.t('label.company');
        break;
      default:
        name = i18next.t('label.tpo');
        break;
    }
    return name;
  };

  const checkValidation = (name) => {
    if (name === 'individual') {
      if (lastname && firstname && country) {
        setCompleteCheck(true);
      } else {
        setCompleteCheck(false);
      }
    } else if (name === 'education' || name === 'company') {
      if (lastname && firstname && nameOfOrg && country) {
        setCompleteCheck(true);
      } else {
        setCompleteCheck(false);
      }
    } else if (name === 'tpo') {
      if (lastname && firstname && nameOfOrg && zipCode && city && address && country) {
        setCompleteCheck(true);
      } else {
        setCompleteCheck(false);
      }
    }
  };

  const submitDetails = () => {
    let countryName;
    countryName = country.countryCode;
    let locale = authDetail.locale === undefined ? lang.languageCode : authDetail.locale;
    let userData;
    if (accountType === '') {
      Snackbar.show({
        text: i18next.t('label.select_role_type'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }

    if (firstname === '') {
      setFirstNameError(true);
      Snackbar.show({
        text: i18next.t('label.enter_first_name'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }

    if (lastname === '') {
      setLastNameError(true);
      Snackbar.show({
        text: i18next.t('label.enter_last_name'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }
    if (accountType === 'tpo') {
      if (city === '') {
        setCityError(true);
        Snackbar.show({
          text: i18next.t('label.enter_city_name'),
          duration: Snackbar.LENGTH_SHORT,
        });
      }
      if (zipCode === '') {
        setZipCodeError(true);
        Snackbar.show({
          text: i18next.t('label.enter_zipcode'),
          duration: Snackbar.LENGTH_SHORT,
        });
      }
      if (address === '') {
        setAddressError(true);
        Snackbar.show({
          text: i18next.t('label.enter_address'),
          duration: Snackbar.LENGTH_SHORT,
        });
      }
      if (nameOfOrg === '') {
        setNameError(true);
        Snackbar.show({
          text: i18next.t('label.enter_organisation_name'),
          duration: Snackbar.LENGTH_SHORT,
        });
      }
      if (completeCheck) {
        userData = {
          firstname,
          lastname,
          getNews,
          isPrivate,
          country: countryName,
          locale,
          city,
          zipCode,
          address,
          oAuthAccessToken,
          type: accountType,
          name: nameOfOrg,
        };
      }
    } else if (accountType === 'education' || accountType === 'company') {
      if (nameOfOrg === '') {
        setNameError(true);
        Snackbar.show({
          text: i18next.t('label.enter_organisation_name'),
          duration: Snackbar.LENGTH_SHORT,
        });
      }
      if (firstname && lastname && accountType && nameOfOrg) {
        setCompleteCheck(true);
        userData = {
          firstname,
          lastname,
          getNews,
          isPrivate,
          country: countryName,
          locale,
          oAuthAccessToken,
          type: accountType,
          name: nameOfOrg,
        };
      }
    } else {
      if (firstname && lastname && accountType) {
        setCompleteCheck(true);
        userData = {
          firstname,
          lastname,
          getNews,
          isPrivate,
          country: countryName,
          locale,
          oAuthAccessToken,
          type: accountType,
        };
      }
    }

    if (completeCheck) {
      startSignUpLoading()(loadingDispatch);
      SignupService(userData, userDispatch)
        .then(() => {
          stopSignUpLoading()(loadingDispatch);
          navigation.navigate('MainScreen');
        })
        .catch((err) => {
          alert(err.response.data.message);
          console.error(err.response.data.message, 'err');
          stopSignUpLoading()(loadingDispatch);
          navigation.dispatch(StackActions.popToTop());
        });
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      getUserDetails().then(async (userDetails) => {
        if (userDetails?.isSignUpRequired) {
          await auth0Logout(userDispatch);
        }
      });
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    stopLoading()(loadingDispatch);
    getUserDetails().then((User) => {
      if (User) {
        let decode = jwtDecode(User.idToken);
        setAuthAccessToken(User.accessToken);
        setAuthDetails(decode);
        setEmail(decode.email);
        setCountry(handleFilter(lang.countryCode)[0]);
      }
    });
  }, []);

  useEffect(() => {
    checkValidation(accountType);
  }, [accountType, lastname, firstname, nameOfOrg, address, city, zipCode, country]);

  const openModal = (data) => {
    setModalVisible(data);
  };

  const userCountry = (data) => {
    setCountry(data);
    setModalVisible(!modalVisible);
  };

  const checkAndAlert = (error) => {
    if (error) {
      return Colors.ALERT;
    }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      {loadingState.isSignUpLoading ? (
        <Loader isLoaderShow={true} />
      ) : (
        <View style={styles.container}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <Header headingText={i18next.t('label.signup')} closeIcon />
            <Text style={styles.accountTypeHeader}>{i18next.t('label.account_type')}</Text>
            <View style={styles.selectRoleBtnsContainer}>
              <View
                style={[
                  styles.roleBtnContainer,
                  styles.marginRight,
                  accountType === 'individual' ? styles.activeRoleContainer : null,
                ]}>
                <TouchableOpacity onPress={() => setAccountType('individual')}>
                  <Text
                    style={accountType === 'individual' ? styles.accountTypeText : styles.roleText}>
                    {i18next.t('label.individual')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.roleBtnContainer,
                  styles.marginLeft,
                  accountType === 'company' ? styles.activeRoleContainer : null,
                ]}>
                <TouchableOpacity onPress={() => setAccountType('company')}>
                  <Text
                    style={accountType === 'company' ? styles.accountTypeText : styles.roleText}>
                    {i18next.t('label.company')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.selectRoleBtnsContainer}>
              <View
                style={[
                  [
                    styles.roleBtnContainer,
                    accountType === 'tpo' ? styles.activeRoleContainer : null,
                  ],
                  styles.justifyCenter,
                  styles.marginRight,
                ]}>
                <TouchableOpacity onPress={() => setAccountType('tpo')}>
                  <Text style={[accountType === 'tpo' ? styles.accountTypeText : styles.roleText]}>
                    {i18next.t('label.tpo_title')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.roleBtnContainer,
                  styles.marginLeft,
                  styles.justifyCenter,
                  accountType === 'education' ? styles.activeRoleContainer : null,
                ]}>
                <TouchableOpacity onPress={() => setAccountType('education')}>
                  <Text
                    style={[
                      accountType === 'education' ? styles.accountTypeText : styles.roleText,
                      styles.schoolText,
                    ]}>
                    {i18next.t('label.education_title')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View
              style={{
                flex: 1,
                flexDirection: 'column',
                // justifyContent: 'space-between',
                marginVertical: 10,
              }}>
              <View style={{ marginVertical: 14 }}>
                <OutlinedInput
                  value={firstname}
                  onChangeText={(text: string) => setFirstName(text)}
                  label={i18next.t('label.firstname')}
                  returnKeyType={completeCheck ? 'done' : 'next'}
                  error={firstNameError}
                  blurOnSubmit={false}
                />
              </View>
              <View style={{ marginVertical: 14 }}>
                <OutlinedInput
                  value={lastname}
                  onChangeText={(text: string) => setLastName(text)}
                  label={i18next.t('label.lastname')}
                  returnKeyType={completeCheck ? 'done' : 'next'}
                  error={lastNameError}
                  blurOnSubmit={false}
                />
              </View>
            </View>
            <View>
              <Text>{i18next.t('label.country')}</Text>
              <View style={styles.countryContainer}>
                <Image
                  source={{
                    // not using currencyCountryFlag any more as we have flags for every country
                    uri:
                      country && cdnUrl
                        ? `${protocol}://${cdnUrl}/media/images/flags/png/256/${country.countryCode}.png`
                        : null,
                  }}
                  resizeMode="contain"
                  style={styles.countryFlag}
                />
                <View>
                  <TouchableOpacity
                    onPress={() => setModalVisible(!modalVisible)}
                    style={{ paddingLeft: 15 }}>
                    <View>
                      <Text
                        style={{ paddingBottom: 8, fontFamily: Typography.FONT_FAMILY_REGULAR }}>
                        {country ? country.countryName : i18next.t('label.select_country')}
                      </Text>
                      <View style={{ flexDirection: 'row' }}>
                        <Text
                          style={{
                            color: Colors.PRIMARY,
                            fontFamily: Typography.FONT_FAMILY_REGULAR,
                          }}>
                          {i18next.t('label.change')}
                        </Text>
                        <Ionicons
                          name="angle-right"
                          size={25}
                          color={Colors.PRIMARY}
                          style={styles.iconStyle}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {modalVisible ? (
              <Modal visible={modalVisible} openModal={openModal} userCountry={userCountry} />
            ) : null}
            {accountType === 'company' || accountType === 'tpo' || accountType === 'education' ? (
              <View style={styles.emailContainer}>
                <OutlinedInput
                  value={nameOfOrg}
                  onChangeText={(text: string) => setNameOfOrg(text)}
                  label={i18next.t('label.tpo_title_organisation', {
                    roleText: SelectType(accountType),
                  })}
                  returnKeyType={completeCheck ? 'done' : 'next'}
                  error={nameError}
                  blurOnSubmit={completeCheck}
                />
              </View>
            ) : null}
            <View style={[styles.emailContainer, styles.primaryColor]}>
              <OutlinedInput
                value={email}
                onChangeText={(text: string) => setEmail(text)}
                editable={false}
              />
            </View>
            {accountType === 'tpo' ? (
              <View>
                <View style={styles.emailContainer}>
                  <OutlinedInput
                    value={address}
                    onChangeText={(text: string) => setAddress(text)}
                    label={i18next.t('label.address')}
                    returnKeyType={completeCheck ? 'done' : 'next'}
                    error={addressError}
                    blurOnSubmit={completeCheck}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={styles.inputContainer}>
                    <OutlinedInput
                      value={city}
                      onChangeText={(text: string) => setCity(text)}
                      label={i18next.t('label.city')}
                      returnKeyType={completeCheck ? 'done' : 'next'}
                      error={cityError}
                      blurOnSubmit={completeCheck}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <OutlinedInput
                      value={zipCode}
                      onChangeText={(text: string) => setZipCode(text)}
                      label={i18next.t('label.zipcode')}
                      returnKeyType={completeCheck ? 'done' : 'next'}
                      error={zipCodeError}
                    />
                  </View>
                </View>
              </View>
            ) : null}
            <View style={styles.switchContainer}>
              <Text style={styles.switchContainerText}>{i18next.t('label.isPrivate')}</Text>
              <Switch
                trackColor={{ false: Colors.LIGHT_BORDER_COLOR, true: '#d9e7c0' }}
                thumbColor={isPrivate ? Colors.PRIMARY : Colors.WHITE}
                value={isPrivate}
                onValueChange={toggleSwitchPublish}
                ios_backgroundColor={isPrivate ? Colors.PRIMARY : Colors.GRAY_LIGHT}
              />
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.switchContainerText}>{i18next.t('label.getNews')}</Text>
              <Switch
                trackColor={{ false: Colors.LIGHT_BORDER_COLOR, true: '#d9e7c0' }}
                thumbColor={getNews ? Colors.PRIMARY : Colors.WHITE}
                value={getNews}
                onValueChange={toggleSwitchContact}
                ios_backgroundColor={getNews ? Colors.PRIMARY : Colors.GRAY_LIGHT}
              />
            </View>
            <View style={styles.getNewsText}>
              <PrimaryButton
                btnText={i18next.t('label.create_profile')}
                onPress={submitDetails}
                disabled={completeCheck ? false : true}
              />
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};
export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    backgroundColor: Colors.WHITE,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.WHITE,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  cont: {
    flex: 1,
  },
  selectRoleBtnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  roleBtnContainer: {
    height: Platform.OS === 'ios' ? 100 : 80,
    borderWidth: 2,
    flex: 1,
    borderRadius: 10,
    borderColor: Colors.LIGHT_BORDER_COLOR,
    justifyContent: 'flex-end',
  },
  roleText: {
    margin: 14,
    color: Colors.BLACK,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_18,
  },
  switchContainerText: {
    flex: 1,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_16,
    width: '80%',
  },
  switchContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
  },
  primaryText: {
    color: Colors.PRIMARY,
  },
  justifyCenter: {
    justifyContent: 'center',
  },
  activeRoleContainer: {
    borderColor: Colors.PRIMARY,
  },
  marginRight: { marginRight: 5 },
  marginLeft: { marginLeft: 5 },
  value: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: 20,
    flex: 1,
    paddingVertical: 10,
    borderBottomWidth: 2,
  },
  borderBottomRed: {
    borderBottomColor: 'red',
  },
  borderBottomBlack: {
    borderBottomColor: Colors.TEXT_COLOR,
  },
  label: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_14,
    lineHeight: Typography.LINE_HEIGHT_30,
    color: Colors.TEXT_COLOR,
  },
  inputContainer: {
    width: '46.7%',
    marginVertical: 14,
  },
  emailContainer: {
    width: '100%',
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    marginVertical: 14,
  },
  primaryColor: { color: Colors.PRIMARY },
  getNewsText: {
    // paddingTop: 60,
    marginTop: 130,
  },
  accountTypeText: {
    margin: 14,
    color: Colors.PRIMARY,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_18,
    flexWrap: 'wrap',
  },
  accountTypeHeader: {
    paddingTop: 30,
    paddingBottom: 8,
    color: Colors.BLACK,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  textStyle: {
    color: Colors.PRIMARY,
  },
  inputColor: {
    color: Colors.GRAY_LIGHT,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: 20,
    // color: Colors.TEXT_COLOR,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    flex: 1,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: Colors.GRAY_LIGHT,
  },
  emailLabel: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_14,
    lineHeight: Typography.LINE_HEIGHT_30,
    color: Colors.GRAY_LIGHT,
  },
  countryContainer: {
    width: '100%',
    paddingTop: 13,
    paddingBottom: 14,
    color: Colors.PRIMARY,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    flexDirection: 'row',
  },
  countryValue: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_20,
    color: Colors.TEXT_COLOR,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    flex: 1,
    paddingVertical: 10,
  },
  iconStyle: {
    paddingLeft: 7,
    // paddingBottom: 10,
    // paddingHorizontal: 15
  },
  countryFlag: {
    height: 50,
    width: 50,
    borderRadius: 6,
  },
  schoolText: {
    paddingTop: 28,
  },
});
