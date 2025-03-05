import { StyleSheet, Text, View } from 'react-native';

const toastConfig = {
    success: (internalToast) => (
        <View style={[styles.toast, styles.success]}>
        <Text style={styles.text}>{internalToast.text1}</Text>
        <Text style={styles.text}>{internalToast.text2}</Text>
        </View>
    ),
    error: (internalToast) => (
        <View style={[styles.toast, styles.error]}>
        <Text style={styles.text}>{internalToast.text1}</Text>
        <Text style={styles.text}>{internalToast.text2}</Text>
        </View>
    ),
    // Define other toast types here if needed
    };

    const styles = StyleSheet.create({
    toast: {
        padding: 12,
        borderRadius: 17,
        margin: 10,

    },
    success: {
        backgroundColor: '#dff0d8',
    },
    error: {
        backgroundColor: '#f44336',
    },
    text: {
        color: '#000',
        fontSize: 14, // Adjust font size here
    },
    });

export default toastConfig;
