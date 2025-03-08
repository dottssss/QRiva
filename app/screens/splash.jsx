import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(tabs)/dashboard');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#ffffff', '#ffffff']}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/qrivalogo-splash.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 200,
    height: 200,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
