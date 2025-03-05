import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { icons } from '../assets/icons';

const TabBarButton = (props) => {
    const {isFocused, label, routeName, color} = props;

    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.6);

    useEffect(() => {
        scale.value = withSpring(isFocused ? 1.2 : 1, {
            damping: 10,
            stiffness: 300
        });
        
        opacity.value = withTiming(isFocused ? 1 : 0.6, {
            duration: 200
        });
    }, [isFocused]);

    const animatedButtonStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            opacity: opacity.value
        };
    });

    return (
    <Pressable {...props} style={styles.container}>
        <Animated.View style={[styles.iconContainer, animatedButtonStyle]}>
        {
        icons[routeName]({
            color: isFocused ? '#fff' : '#A0A0A0'
        })
        }
        </Animated.View>
        
        <Text style={[
            styles.label, 
            { 
                color: isFocused ? '#fff' : '#A0A0A0',
                fontWeight: isFocused ? 'bold' : 'normal'
            }
        ]}>
            {label}
        </Text>
    </Pressable>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        padding: 7,
    },
    iconContainer: {
        padding: 2,
        borderRadius: 20,
    },
    label: {
        fontSize: 12,
        fontFamily: 'outfit',
        marginTop: 1,
    }
})

export default TabBarButton;