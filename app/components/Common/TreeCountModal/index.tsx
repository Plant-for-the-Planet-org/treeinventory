import i18next from 'i18next';
import React, { useState, useEffect } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, CommonStyles } from '../../../styles';
import { species_default } from '../../../assets';
import { Header } from '../';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getScientificSpeciesById } from '../../../repositories/species';

interface TreeCountModalProps {
  showTreeCountModal: boolean;
  setShowTreeCountModal: any;
  activeSpecie: any;
  setTreeCount: any;
  treeCount: string;
  onPressTreeCountNextBtn: any;
}

const TreeCountModal: React.FC<TreeCountModalProps> = ({
  showTreeCountModal,
  setShowTreeCountModal,
  activeSpecie,
  setTreeCount,
  treeCount,
  onPressTreeCountNextBtn,
}) => {
  let specieName = showTreeCountModal ? activeSpecie?.aliases : '';
  const [specie, setSpecie] = useState();

  useEffect(() => {
    if (activeSpecie?.id && showTreeCountModal) {
      getScientificSpeciesById(activeSpecie?.id).then((scientificSpecie) => {
        setSpecie(scientificSpecie);
      });
      setTreeCount(activeSpecie.treeCount);
    }
  }, [activeSpecie, showTreeCountModal]);
  return (
    <Modal visible={showTreeCountModal} transparent={true}>
      <View style={styles.modalBackground}>
        <View style={styles.inputModal}>
          <Ionicons
            name={'md-close'}
            size={30}
            color={Colors.TEXT_COLOR}
            onPress={() => {
              setShowTreeCountModal(false);
            }}
          />
          <Image
            source={
              activeSpecie?.image
                ? { uri: `${activeSpecie?.image}` }
                : specie?.image
                ? { uri: `${specie?.image}` }
                : species_default
            }
            style={{
              alignSelf: 'center',
              marginVertical: 20,
              width: 150,
              height: 100,
              borderRadius: 5,
              resizeMode: activeSpecie?.image || specie?.image ? null : 'contain',
            }}
          />
          <Header
            hideBackIcon
            subHeadingText={i18next.t('label.select_species_tree_count_modal_header')}
            textAlignStyle={{ textAlign: 'center' }}
          />
          <Header
            hideBackIcon
            subHeadingText={i18next.t('label.select_species_tree_count_modal_sub_header', {
              specieName,
            })}
            textAlignStyle={{ textAlign: 'center', fontStyle: 'italic' }}
          />
          <Header
            hideBackIcon
            subHeadingText={i18next.t('label.select_species_tree_count_modal_sub_header_2')}
            textAlignStyle={{ textAlign: 'center' }}
          />
        </View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
        style={styles.bgWhite}>
        <View style={CommonStyles.bottomInputContainer}>
          <Text style={CommonStyles.bottomInputLabel}>
            {i18next.t('label.select_species_modal_label')}
          </Text>
          <TextInput
            value={treeCount?.toString()}
            style={CommonStyles.bottomInputText}
            autoFocus
            placeholderTextColor={Colors.TEXT_COLOR}
            onChangeText={(text) => setTreeCount(text.replace(/[^0-9]/g, ''))}
            keyboardType={'number-pad'}
          />
          <MCIcon
            onPress={onPressTreeCountNextBtn}
            name={'arrow-right'}
            size={30}
            color={Colors.PRIMARY}
          />
        </View>
        <SafeAreaView />
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default TreeCountModal;

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  inputModal: {
    backgroundColor: Colors.WHITE,
    marginVertical: 30,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    width: '80%',
  },
  bgWhite: {
    backgroundColor: Colors.WHITE,
  },
});
