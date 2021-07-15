import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography } from '../../../styles';

interface IPrimaryButtonProps {
  btnText: string;
  theme?: any;
  halfWidth?: any;
  style?: any;
  onPress: any;
  disabled?: any;
  textStyle?: any;
  testID?: string;
  accessibilityLabel?: string;
}

const PrimaryButton = ({
  btnText,
  theme,
  halfWidth,
  style,
  onPress,
  disabled,
  textStyle,
  testID,
  accessibilityLabel,
}: IPrimaryButtonProps) => {
  const isWhiteTheme = theme == 'white';
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      accessible={true}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        isWhiteTheme && styles.whiteTheme,
        halfWidth && styles.halfWidth,
        disabled && styles.disabledCont,
        style,
      ]}>
      <Text style={[styles.btnText, isWhiteTheme && styles.primaryText, textStyle]}>{btnText}</Text>
    </TouchableOpacity>
  );
};
export default PrimaryButton;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 18,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    marginBottom: 10,
    width: '100%',
  },
  whiteTheme: {
    backgroundColor: Colors.WHITE,
    borderColor: Colors.PRIMARY,
    borderWidth: 1,
  },
  primaryText: {
    color: Colors.PRIMARY,
  },
  btnText: {
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  halfWidth: {
    width: '47%',
  },
  disabledCont: {
    backgroundColor: Colors.DISABLE,
  },
});
