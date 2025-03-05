import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import TabBarButton from './TabBarButton';

const TabBar = ({ state, descriptors, navigation }) => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const primaryColor= '#fff';
  const greyColor = '#fff';
  return (
    <View
      style={[
        styles.tabbar,
        { bottom: keyboardVisible ? -150 : 25 }, // Increased bottom margin
      ]}
    >

    {state.routes.map((route, index) => {
      const { options } = descriptors[route.key];
      const label =
        options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

          console.log('route name', route.name);

      const isFocused = state.index === index;

      const onPress = () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      };

      const onLongPress = () => {
        navigation.emit({
          type: 'tabLongPress',
          target: route.key,
        });
      };

      return(
        <TabBarButton
        key={route.name}
        style={[
          styles.tabbarItem,
          index === 0 && styles.leftTab,
          index === state.routes.length - 1 && styles.rightTab
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        isFocused={isFocused}
        routeName={route.name}
        color={isFocused ? primaryColor : greyColor}
        label={label}
        />
      )

      {/*return (
        <TouchableOpacity
        key={route.name}
        style={styles.tabbarItem}
          accessibilityRole="button"
          accessibilityState={isFocused ? { selected: true } : {}}
          accessibilityLabel={options.tabBarAccessibilityLabel}
          testID={options.tabBarTestID}
          onPress={onPress}
          onLongPress={onLongPress}
        >
        {
          icons[route.name]({
            color: isFocused? primaryColor : greyColor
          })
        }
        
          <Text style={{ color: isFocused ? primaryColor : greyColor, fontSize: 11 }}>
            {label}
          </Text>
        </TouchableOpacity>
      );*/}
    })}
  </View>
  )
}

const styles = StyleSheet.create({
  tabbar: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center', // Center the tabs
    alignItems: 'center',
    marginBottom: '5%', // Added margin bottom
    backgroundColor: '#292929',
    marginHorizontal: 70, // Reduced horizontal margin
    paddingHorizontal: 20, // Reduced padding
    paddingVertical: 8, // Added vertical padding
    borderRadius: 35,
    borderCurve: 'continuous',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.2, // Increased opacity
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Lighter border
    gap: 20, // Added gap between tabs
  },
  tabbarItem: {
    flex: 0, // Remove flex to allow natural width
    paddingHorizontal: 24, // Added horizontal padding
    paddingVertical: 8, // Added vertical padding
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftTab: {
    borderTopLeftRadius: 35,
    borderBottomLeftRadius: 35,
  },
  rightTab: {
    borderTopRightRadius: 35,
    borderBottomRightRadius: 35,
  }
});

export default TabBar