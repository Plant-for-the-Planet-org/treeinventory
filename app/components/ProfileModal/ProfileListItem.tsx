import i18next from 'i18next';
import React, { useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  ImageSourcePropType,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Octicons from 'react-native-vector-icons/Octicons';
import { Colors, Typography } from '../../styles';

interface ProfileListItemProps {
  media: string | ImageSourcePropType;
  mediaType: string;
  text: string;
  onPressFunction?: (event?: GestureResponderEvent) => void;
  containerStyle?: any;
  mediaStyle?: any;
}

export default function ProfileListItem({
  media,
  mediaType,
  text,
  onPressFunction,
  containerStyle,
  mediaStyle,
}: ProfileListItemProps) {
  // const [isEnabled, setIsEnabled] = useState();
  const [modalVisible, setModalVisible] = useState(false);
  // useEffect(() => {
  //   getUserInformation().then((data) => {
  //     setIsEnabled(data.idLogEnabled);
  //   });
  // }, []);

  // const toggleSwitch = () => {
  //   setIsEnabled((previousState) => !previousState);
  //   setActivityLog(!isEnabled);
  // };

  const ActivityLogInfo = () => {
    return (
      <Modal transparent visible={modalVisible}>
        <View
          style={{
            // position: 'absolute',
            padding: 20,
            backgroundColor: '#fff',
            borderRadius: 10,
            borderWidth: 1,
            bottom: -80,
          }}>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Icon name={'times'} size={20} color={Colors.PRIMARY} />
          </TouchableOpacity>
          <Text>{i18next.t('label.logs_daily_activity')}</Text>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.profileSection, containerStyle ? containerStyle : {}]}>
      {mediaType === 'image' ? (
        <Image source={media} style={[styles.imgIcon, mediaStyle ? mediaStyle : {}]} />
      ) : mediaType === 'icon' ? (
        <Icon name={media} size={20} color={Colors.TEXT_COLOR} style={styles.avatar} />
      ) : mediaType === 'octicon' ? (
        <Octicons name={media} size={20} color={Colors.TEXT_COLOR} style={styles.avatar} />
      ) : (
        <Ionicons name={media} size={20} color={Colors.TEXT_COLOR} style={styles.avatar} />
      )}
      <TouchableOpacity
        onPress={onPressFunction ? onPressFunction : () => {}}
        style={[styles.nameAndEmailContainer, { position: 'relative' }]}>
        <Text style={styles.userName}>{i18next.t(`label.${text}`)}</Text>
        {mediaType === 'ionicon' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* <TouchableOpacity
              onPress={() => {
                setModalVisible(!modalVisible);
              }}
            >
              <Ionicons
                name={'information-circle-outline'}
                size={18}
                style={{ paddingHorizontal: 8 }}
              />
            </TouchableOpacity> */}
            {/* <Switch
              trackColor={{ false: '#767577', true: '#d4e7b1' }}
              thumbColor={isEnabled ? Colors.PRIMARY : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              // onValueChange={toggleSwitch}
              value={isEnabled}
            /> */}
          </View>
        ) : (
          []
        )}
        {/* <ActivityLogInfo/> */}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginHorizontal: 20,
  },
  nameAndEmailContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingLeft: 13,
    flexDirection: 'row',
  },
  userName: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_14,
    lineHeight: Typography.LINE_HEIGHT_30,
    color: Colors.TEXT_COLOR,
  },
  imgIcon: {
    width: 20,
    height: 20,
    marginHorizontal: 20,
  },
});
