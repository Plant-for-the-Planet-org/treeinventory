import React, { memo, useRef, useState, useCallback, forwardRef } from 'react';
import { Animated, Easing, EasingFunction, StyleSheet, View, TextInput, Text } from 'react-native';
import { Colors, Typography } from '_styles';

type secureTextEntryType = true | false;
type autoCapitalizeType = 'characters' | 'words' | 'sentences' | 'none';

interface PropTypes {
  label?: string;
  onChangeText?: any;
  value?: string;
  secureTextEntry?: secureTextEntryType;
  autoCapitalize?: autoCapitalizeType;
  fontSize?: number;
  height?: number;
  duration?: number;
  easing?: EasingFunction;
  activeValueColor?: string;
  passiveValueColor?: string;
  activeLabelColor?: string;
  passiveLabelColor?: string;
  activeBorderColor?: string;
  passiveBorderColor?: string;
  fontFamily?: string;
  keyboardType?: string;
  rightText?: string;
  returnKeyType?: string;
  blurOnSubmit?: boolean;
  onSubmitEditing?: any;
  ref?: any;
  editable?: boolean;
}

interface CommonAnimatedPropsTypes {
  duration: number;
  useNativeDriver: boolean;
  easing: EasingFunction;
}

interface LabelStylePropTypes {
  isFocused: boolean;
  initialTopValue: number;
  activeLabelColor: string;
  passiveLabelColor: string;
}

interface InputStyleProps {
  padding: number;
  height: number;
  fontSize: number;
  isFocused: boolean;
  // activeBorderColor: string;
  // passiveBorderColor: string;
  activeValueColor: string;
  passiveValueColor: string;
  // keyboardType: string;
}

const OutlinedInput = ({
  label,
  onChangeText,
  value,
  secureTextEntry = false,
  autoCapitalize = 'none',
  fontSize = Typography.FONT_SIZE_16,
  height = 50,
  duration = 300,
  easing = Easing.inOut(Easing.ease),
  activeValueColor = Colors.TEXT_COLOR,
  passiveValueColor = Colors.TEXT_COLOR,
  activeLabelColor = Colors.PRIMARY,
  passiveLabelColor = Colors.GRAY_LIGHTEST,
  activeBorderColor = Colors.PRIMARY,
  passiveBorderColor = Colors.GRAY_LIGHT,
  fontFamily = Typography.FONT_FAMILY_REGULAR,
  keyboardType = 'default',
  rightText,
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
  ref,
  editable,
}: PropTypes) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const lineHeightValue: number = fontSize + 2;
  const initialTopValue: number = (height - lineHeightValue) / 2;
  const labelPositionEmptyValue: number = 0;
  const inputValueFontSize: number = fontSize;
  const padding: number = 8;
  const labelPositionFillValue: number = lineHeightValue / 2 + initialTopValue;
  const inputHeight: number = height;

  const labelPositionRef = useRef(
    new Animated.Value(value ? labelPositionFillValue : labelPositionEmptyValue),
  ).current;
  const fontSizeRef = useRef(new Animated.Value(value ? fontSize - 2 : fontSize)).current;
  const lineHeightRef = useRef(new Animated.Value(value ? lineHeightValue - 2 : lineHeightValue))
    .current;
  const zIndexRef = useRef(new Animated.Value(value ? 2 : -1)).current;

  const commonAnimatedProps: CommonAnimatedPropsTypes = {
    duration,
    useNativeDriver: false,
    easing,
  };

  const onBlur: () => void = useCallback(() => {
    setIsFocused(false);
    if (!value) {
      Animated.parallel([
        Animated.timing(labelPositionRef, {
          toValue: labelPositionEmptyValue,
          ...commonAnimatedProps,
        }),
        Animated.timing(fontSizeRef, {
          toValue: fontSize,
          ...commonAnimatedProps,
        }),
        Animated.timing(lineHeightRef, {
          toValue: lineHeightValue,
          ...commonAnimatedProps,
        }),
        Animated.timing(zIndexRef, {
          toValue: -1,
          ...commonAnimatedProps,
        }),
      ]).start();
    }
  }, [!!value]);

  const onFocus: () => void = useCallback(() => {
    setIsFocused(true);
    Animated.parallel([
      Animated.timing(labelPositionRef, {
        toValue: labelPositionFillValue,
        ...commonAnimatedProps,
      }),
      Animated.timing(fontSizeRef, {
        toValue: fontSize - 2,
        ...commonAnimatedProps,
      }),
      Animated.timing(lineHeightRef, {
        toValue: lineHeightValue - 2,
        ...commonAnimatedProps,
      }),
      Animated.timing(zIndexRef, {
        toValue: 2,
        ...commonAnimatedProps,
      }),
    ]).start();
  }, [!!value]);

  const animatedViewProps = {
    style: {
      position: 'absolute',
      bottom: labelPositionRef,
      left: 10,
      zIndex: zIndexRef,
      height,
    },
  };

  const animatedTextProps = {
    style: [
      LabelStyle({
        isFocused,
        initialTopValue,
        activeLabelColor,
        passiveLabelColor,
      }),
      { fontSize: fontSizeRef, lineHeight: lineHeightRef, fontFamily },
    ],
  };

  const inputProps = {
    secureTextEntry,
    value,
    onChangeText,
    onFocus,
    onBlur,
    autoCapitalize,
    isFocused,
    height: inputHeight,
    padding,
    paddingLeft: 15,
    fontSize: inputValueFontSize,
    returnKeyType,
    // activeBorderColor,
    // passiveBorderColor,
    keyboardType,
    blurOnSubmit,
    onSubmitEditing,
    ref,
    editable,
    style: [
      { fontFamily, flex: 1 },
      InputStyle({
        padding,
        height,
        fontSize,
        isFocused,
        // activeBorderColor,
        // passiveBorderColor,
        activeValueColor,
        passiveValueColor,
      }),
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.View {...animatedViewProps}>
        <Animated.Text {...animatedTextProps}>{label}</Animated.Text>
      </Animated.View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderRadius: 5,
          borderColor: isFocused ? activeBorderColor : passiveBorderColor,
        }}>
        <TextInput {...inputProps} />
        <Text
          style={{
            color: Colors.TEXT_COLOR,
            fontFamily,
            fontSize: Typography.FONT_SIZE_18,
            padding: 10,
            paddingRight: 20,
          }}>
          {rightText}
        </Text>
      </View>
    </View>
  );
};

const LabelStyle = ({
  isFocused,
  initialTopValue,
  activeLabelColor,
  passiveLabelColor,
}: LabelStylePropTypes) => ({
  fontStyle: 'normal',
  fontWeight: 'normal',
  color: isFocused ? activeLabelColor : passiveLabelColor,
  backgroundColor: '#FFFFFF',
  paddingRight: 5,
  paddingLeft: 5,
  top: initialTopValue,
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    marginRight: 5,
    backgroundColor: '#ffffff',
  },
});

const InputStyle = ({
  padding,
  height,
  fontSize,
  isFocused,
  activeValueColor,
  passiveValueColor,
}: // activeBorderColor,
// passiveBorderColor,
InputStyleProps) => ({
  padding,
  height,
  fontSize,
  // keyboardType,
  // borderWidth: 1,
  // borderColor: isFocused ? activeBorderColor : passiveBorderColor,
  // borderRadius: 6,
  color: isFocused ? activeValueColor : passiveValueColor,
});

export default memo(OutlinedInput);
