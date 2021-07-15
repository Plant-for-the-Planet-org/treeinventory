import React from 'react';
import MCIIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';

interface IIconSwitcherProps {
  name: string;
  size: number;
  color: string;
  style?: any;
  iconType: 'MCIIcon' | 'FA5Icon';
}

const IconSwitcher = ({ name, size, color, style = {}, iconType }: IIconSwitcherProps) => {
  switch (iconType) {
    case 'MCIIcon':
      return <MCIIcon name={name} size={size} color={color} style={style} />;
    case 'FA5Icon':
      return <FA5Icon name={name} size={size} color={color} style={style} />;
    default:
      return <></>;
  }
};

export default IconSwitcher;
