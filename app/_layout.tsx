import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { MenuProvider } from 'react-native-popup-menu';
import Toast from 'react-native-toast-message';
import toastConfig from './../configs/toastConfig';

  export default function RootLayout() {

    useFonts({
      'space' :require('./../assets/fonts/SpaceMono-Regular.ttf'),
      'outfit' :require('./../assets/fonts/Outfit-Regular.ttf'),
      'outfit-medium':require('./../assets/fonts/Outfit-Medium.ttf'),
      'outfit-bold' :require('./../assets/fonts/Outfit-Bold.ttf'),
      'basker' :require('./../assets/fonts/BaskervvilleSC-Regular.ttf'),
      'roboto' :require('./../assets/fonts/Roboto-Black.ttf'),
      'roboto-bold' :require('./../assets/fonts/Roboto-Bold.ttf'),
      'roboto-plain' :require('./../assets/fonts/Roboto-Light.ttf'),
      'encode-black' :require('./../assets/fonts/EncodeSansCondensed-Black.ttf'),
      'encode-bold' :require('./../assets/fonts/EncodeSansCondensed-Bold.ttf'),
      'encode-light' :require('./../assets/fonts/EncodeSansCondensed-Light.ttf'),
      'encode-regular' :require('./../assets/fonts/EncodeSansCondensed-Regular.ttf'),
      'gruppo' :require('./../assets/fonts/Gruppo-Regular.ttf'),
      'cormor-bold' :require('./../assets/fonts/CormorantGaramond-Bold.ttf'),
      'cormor-italic' :require('./../assets/fonts/CormorantGaramond-Italic.ttf'),
      'cormor-medium' :require('./../assets/fonts/CormorantGaramond-Medium.ttf'),
      'cormor-regular' :require('./../assets/fonts/CormorantGaramond-Regular.ttf'),
      'montserrat' :require('./../assets/fonts/Montserrat-VariableFont_wght.ttf'),
      'raleway' :require('./../assets/fonts/Raleway-VariableFont_wght.ttf'),
      'arsenal-bold' :require('./../assets/fonts/ArsenalSC-Bold.ttf'),
      'arsenal-regular' :require('./../assets/fonts/ArsenalSC-Regular.ttf'),
      'quicksand' :require('./../assets/fonts/Quicksand-VariableFont_wght.ttf'),
      'suse' :require('./../assets/fonts/SUSE-VariableFont_wght.ttf'),
      'pt-bold' :require('./../assets/fonts/PTSans-Bold.ttf'),
      'pt-bolditalic' :require('./../assets/fonts/PTSans-BoldItalic.ttf'),
      'pt-regular' :require('./../assets/fonts/PTSans-Regular.ttf'),
      'pt-italic' :require('./../assets/fonts/PTSans-Italic.ttf'),
      'nunito' :require('./../assets/fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf'),
    })// Define your screens here, and add them to the stack.

    return (
      <PaperProvider>
      <MenuProvider>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <Toast config={toastConfig} />
      </MenuProvider>
      </PaperProvider>
    );
  }
