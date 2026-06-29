import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {IconSymbol, type IconName} from '../components/IconSymbol';
import {AtelierScreen} from '../screens/AtelierScreen';
import {ContextScreen} from '../screens/ContextScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {SocialScreen} from '../screens/SocialScreen';
import {VoiceToMemeScreen} from '../screens/VoiceToMemeScreen';
import {StatusRemixerScreen} from '../screens/StatusRemixerScreen';
import {ContextReaderScreen} from '../screens/ContextReaderScreen';
import {useAppTheme} from '../theme/ThemeProvider';
import {spacing, typography} from '../theme/theme';

type RootTabParamList = {
  Home: undefined;
  Context: undefined;
  Atelier: undefined;
  Social: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const ContextStack = createNativeStackNavigator();

function CreerStack() {
  return (
    <ContextStack.Navigator screenOptions={{headerShown: false}}>
      <ContextStack.Screen name="ContextMain" component={ContextScreen} />
      <ContextStack.Screen name="VoiceToMeme" component={VoiceToMemeScreen} />
      <ContextStack.Screen name="StatusRemixer" component={StatusRemixerScreen} />
      <ContextStack.Screen name="ContextReader" component={ContextReaderScreen} />
    </ContextStack.Navigator>
  );
}

const tabConfig = {
  Home: {icon: 'home', label: 'Home'},
  Context: {icon: 'context', label: 'Context'},
  Atelier: {icon: 'atelier', label: 'Atelier'},
  Social: {icon: 'social', label: 'Social'},
  Settings: {icon: 'settings', label: 'Settings'},
} satisfies Record<keyof RootTabParamList, {icon: IconName; label: string}>;

type TabIconProps = {
  routeName: keyof RootTabParamList;
  focused: boolean;
};

function TabIcon({routeName, focused}: TabIconProps) {
  const {colors} = useAppTheme();
  const config = tabConfig[routeName];

  return (
    <View style={styles.tabContent}>
      <IconSymbol
        name={config.icon}
        size={24}
        color={focused ? colors.text : colors.placeholder}
      />
      <Text
        style={[
          styles.tabLabel,
          {color: focused ? colors.text : colors.placeholder},
          focused ? styles.tabLabelActive : undefined,
        ]}>
        {config.label}
      </Text>
      <View
        style={[
          styles.indicator,
          focused ? {backgroundColor: colors.info} : undefined,
        ]}
      />
    </View>
  );
}

const commonScreenOptions = {
  headerShown: false,
  tabBarStyle: undefined,
  tabBarItemStyle: undefined,
  tabBarShowLabel: false,
};

const contextOptions = {
  tabBarIcon: ({focused}: {focused: boolean}) => (
    <TabIcon routeName="Context" focused={focused} />
  ),
};

const homeOptions = {
  tabBarIcon: ({focused}: {focused: boolean}) => (
    <TabIcon routeName="Home" focused={focused} />
  ),
};

const atelierOptions = {
  tabBarIcon: ({focused}: {focused: boolean}) => (
    <TabIcon routeName="Atelier" focused={focused} />
  ),
};

const socialOptions = {
  tabBarIcon: ({focused}: {focused: boolean}) => (
    <TabIcon routeName="Social" focused={focused} />
  ),
};

const settingsOptions = {
  tabBarIcon: ({focused}: {focused: boolean}) => (
    <TabIcon routeName="Settings" focused={focused} />
  ),
};

export function AppNavigator() {
  const {colors, isDark} = useAppTheme();
  const navigationTheme = {
    ...DarkTheme,
    dark: isDark,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.tabBar,
      border: colors.border,
      text: colors.text,
      primary: colors.info,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          ...commonScreenOptions,
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {backgroundColor: colors.tabBar, borderTopColor: colors.border},
          ],
          tabBarItemStyle: styles.tabItem,
          tabBarShowLabel: false,
        }}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={homeOptions}
        />
        <Tab.Screen
          name="Context"
          component={CreerStack}
          options={contextOptions}
        />
        <Tab.Screen
          name="Atelier"
          component={AtelierScreen}
          options={atelierOptions}
        />
        <Tab.Screen
          name="Social"
          component={SocialScreen}
          options={socialOptions}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={settingsOptions}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  tabItem: {
    height: 60,
  },
  tabContent: {
    width: 68,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    ...typography.micro,
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 2,
  },
});
