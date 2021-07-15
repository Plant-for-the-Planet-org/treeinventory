import i18next from 'i18next';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Menu, { MenuItem } from 'react-native-material-menu';
import { Colors, Typography } from '../../../styles';
import OutlinedInput from '../OutlinedInput';

interface IDropdownProps {
  label: string;
  defaultValue?: any;
  options?: any;
  onChange?: any;
  editable?: boolean;
  error?: string | boolean;
  style?: any;
  containerStyle?: any;
  backgroundLabelColor?: string;
  containerBackgroundColor?: string;
  selectedOption?: any;
}

const Dropdown = (props: IDropdownProps) => {
  const {
    defaultValue,
    editable,
    options,
    onChange,
    containerStyle = {},
    selectedOption: selectedOptionProps,
  } = props;
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<any>();

  useEffect(() => {
    setSelectedOption(selectedOptionProps || null);
  }, [selectedOptionProps]);

  const menuRef = useRef<any>();

  const showMenu = () => {
    if (menuRef?.current?.show) {
      menuRef.current.show();
      setShowOptions(true);
    }
  };

  const hideMenu = () => {
    if (menuRef?.current?.hide) {
      menuRef.current.hide();
      setShowOptions(false);
    }
  };

  const value = defaultValue ? i18next.t(defaultValue.value) : '';

  return (
    <View style={[styles.dropdownContainer, containerStyle]}>
      {!editable ? (
        <OutlinedInput
          {...{
            ...props,
            isDropdown: true,
            showOptions,
            value: selectedOption ? selectedOption.value : defaultValue ? defaultValue.value : '',
          }}
        />
      ) : (
        <Menu
          ref={menuRef}
          onHidden={() => setShowOptions(false)}
          style={{ maxHeight: 300 }}
          button={
            <TouchableOpacity onPress={showMenu}>
              <OutlinedInput
                {...{
                  ...props,
                  isDropdown: true,
                  showOptions,
                  value: selectedOption ? i18next.t(selectedOption.value) : value,
                }}
              />
            </TouchableOpacity>
          }>
          {options.map((option: any) => (
            <MenuItem
              key={option.key}
              disabled={option.disabled}
              onPress={() => {
                setSelectedOption(option);
                onChange(option);
                hideMenu();
              }}>
              <Text style={styles.optionText}>{i18next.t(option.value)}</Text>
            </MenuItem>
          ))}
        </Menu>
      )}
    </View>
  );
};

export default Dropdown;

const styles = StyleSheet.create({
  dropdownContainer: {
    position: 'relative',
    zIndex: 20000,
  },
  dropdownOptionsContainer: {
    left: 25,
    right: 25,
    top: 80,
    backgroundColor: Colors.WHITE,
    elevation: 10,
    borderRadius: 10,
  },
  option: {
    backgroundColor: Colors.WHITE,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionText: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_14,
    color: Colors.TEXT_COLOR,
  },
});
