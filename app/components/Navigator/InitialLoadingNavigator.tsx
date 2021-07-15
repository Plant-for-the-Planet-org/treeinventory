import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import InitialLoading from '../InitialLoading';
import { NavigationContext } from '../../reducers/navigation';

const Stack = createStackNavigator();

export default function InitialLoadingNavigator() {
  const { initialNavigationScreen } = useContext(NavigationContext);
  return (
    <Stack.Navigator initialRouteName={initialNavigationScreen || 'MigratingDB'} headerMode="none">
      <Stack.Screen name="MigratingDB" component={InitialLoading} />
      <Stack.Screen name="SpeciesLoading" component={InitialLoading} />
    </Stack.Navigator>
  );
}
