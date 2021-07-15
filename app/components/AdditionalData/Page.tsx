import { useNavigation } from '@react-navigation/core';
import i18next from 'i18next';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import FeatherIcon from 'react-native-vector-icons/Feather';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import { Colors, Typography } from '../../styles';
import { marginTop24 } from '../../styles/design';
import SwipeDeleteRow from '../Common/SwipeDeleteRow';
import AdditionalDataButton from './AdditionalDataButton';
import ElementSwitcher from './ElementSwitcher';

interface IPageProps {
  pageNo: number;
  title: string;
  elements: any;
  formId: string;
  handleDeletePress: any;
  formOrder: number;
  updateFormElements: any;
  deleteElement: (elementIndex: any) => void;
  updateFormData: any;
  handleShowInputModal: any;
}

const { width } = Dimensions.get('window');

export default function Page({
  pageNo,
  title,
  elements,
  formId,
  handleDeletePress,
  formOrder,
  updateFormElements,
  deleteElement,
  handleShowInputModal,
}: IPageProps) {
  const defaultPageTitle = i18next.t('label.form_page', { pageNo });
  const [dragging, setDragging] = useState<boolean>(false);
  const [pageTitle, setPageTitle] = useState<string>(defaultPageTitle);

  const navigation = useNavigation();

  useEffect(() => {
    setPageTitle(title || defaultPageTitle);
  }, [title]);

  const handleButtonPress = () => {
    navigation.navigate('SelectElement', { formId, formOrder });
  };

  const renderItem = useCallback(
    ({ item, index, drag }: RenderItemParams<any>) => {
      const elementData = {
        ...item,
        index,
      };
      return (
        <SwipeDeleteRow
          style={marginTop24}
          onSwipe={() => deleteElement(index)}
          isDraggable
          drag={drag}
          dragging={dragging}
          setDragging={setDragging}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('AddEditElement', {
                elementType: item.type,
                formId,
                isModification: true,
                elementData,
              })
            }>
            <ElementSwitcher {...item} />
          </TouchableOpacity>
        </SwipeDeleteRow>
      );
    },
    [dragging, setDragging],
  );

  return (
    <View style={[styles.pageContainer, pageNo > 1 ? styles.newPage : {}]}>
      <View style={[styles.formHeading, styles.paddingLeft8]}>
        <TouchableOpacity style={styles.pageTitleContainer} onPress={handleShowInputModal}>
          <Text style={styles.formHeadingText}>{pageTitle}</Text>
          <FA5Icon name="pen" size={16} color={Colors.GRAY_LIGHTEST} style={styles.pageTitleIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteIcon} onPress={handleDeletePress}>
          <FeatherIcon name="trash-2" size={20} color={Colors.ALERT} />
        </TouchableOpacity>
      </View>
      <DraggableFlatList
        data={elements}
        renderItem={renderItem}
        keyExtractor={(item) => `elements-${item.id}`}
        onDragEnd={({ data }) => {
          setDragging(false);
          updateFormElements(data);
        }}
        scrollEnabled={false}
        contentContainerStyle={styles.pageContents}
        ListFooterComponent={() => (
          <AdditionalDataButton handleButtonPress={handleButtonPress} style={styles.marginLeft8} />
        )}
        dragHitSlop={{ right: -width + 50 + 36 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    paddingRight: 25,
    paddingLeft: 17,
    flexGrow: 1,
    paddingTop: 24,
  },
  newPage: {
    borderTopWidth: 2,
    borderTopColor: Colors.LIGHT_BORDER_COLOR,
    borderStyle: 'dashed',
    paddingTop: 40,
  },
  pageContents: { paddingBottom: 30 },
  formHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 24,
  },
  formHeadingText: {
    fontFamily: Typography.FONT_FAMILY_EXTRA_BOLD,
    fontSize: Typography.FONT_SIZE_22,
    color: Colors.TEXT_COLOR,
  },
  pageTitleIcon: { marginLeft: 10, paddingBottom: 5 },
  deleteIcon: {
    padding: 10,
  },
  paddingLeft8: {
    paddingLeft: 8,
  },
  marginLeft8: {
    marginLeft: 8,
  },
});
