import { Stack } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          presentation: 'card',
          animation: 'default',
          animationDuration: 200,
        }}
      >
        <Stack.Screen
          name="dashboard"
          options={{
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="qrgenerator"
          options={{
            gestureEnabled: true,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
