import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Button, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const WINDOW_HEIGHT = Dimensions.get('window').height;
const WINDOW_WIDTH = Dimensions.get('window').width;
const SCANNER_SIZE = WINDOW_WIDTH * 0.75;

const TimeRecordModal = ({ visible, onClose, timeIn, status }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalContainer}>
      <BlurView intensity={95} tint="dark" style={styles.modalContent}>
        <MaterialCommunityIcons name="check-circle" size={50} color="#50C878" />
        <Text style={styles.modalTitle}>Time In Recorded</Text>
        <View style={styles.modalDetails}>
          <Text style={styles.modalDetailLabel}>Status</Text>
          <Text style={styles.modalDetailValue}>{status?.toUpperCase()}</Text>
          <Text style={styles.modalDetailLabel}>Time</Text>
          <Text style={styles.modalDetailValue}>{timeIn}</Text>
        </View>
        <TouchableOpacity style={styles.modalButton} onPress={onClose}>
          <Text style={styles.modalButtonText}>Done</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  </Modal>
);

// Add new SecurityErrorModal component near other modal components
const SecurityErrorModal = ({ visible, onClose, timeIn, securityMessage }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalContainer}>
      <BlurView intensity={95} tint="dark" style={styles.modalContent}>
        <MaterialCommunityIcons name="alert-circle" size={50} color="#FFA726" />
        <Text style={[styles.modalTitle, styles.errorTitle]}>Already Scanned</Text>
        <View style={styles.modalDetails}>
          <Text style={styles.modalDetailLabel}>Previous Scan Time</Text>
          <Text style={styles.modalDetailValue}>{timeIn}</Text>
          <Text style={styles.securityMessage}>{securityMessage}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.modalButton, styles.errorButton]} 
          onPress={onClose}
        >
          <Text style={styles.modalButtonText}>Understood</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  </Modal>
);

export default function QRScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const navigateToGenerator = useCallback(() => {
    router.push('/qrgenerator');
  }, []);

  const swipeGesture = useMemo(() => 
    Gesture.Pan()
      .activeOffsetX([-20, 20])
      .onEnd((event) => {
        if (event.velocityX < -500) {
          runOnJS(navigateToGenerator)();
        }
      }),
    [navigateToGenerator]
  );

  useEffect(() => {
    if (scanned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnimation, {
            toValue: SCANNER_SIZE,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(scanLineAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      scanLineAnimation.setValue(0);
      scanLineAnimation.stopAnimation();
    }
  }, [scanned, scanLineAnimation]);

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordedTime, setRecordedTime] = useState(null);
  const [recordedStatus, setRecordedStatus] = useState(null);
  const [showSecurityError, setShowSecurityError] = useState(false);
  const [securityErrorDetails, setSecurityErrorDetails] = useState(null);

  const handleBarCodeScanned = useCallback(async ({ data }) => {
    setScanned(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(data);
        console.log('Parsed QR Data:', parsedData);

        if (!parsedData.type || parsedData.type !== 'uuid') {
          throw new Error('Not a UUID QR code');
        }

        const googleAppsScriptURL = "https://script.google.com/macros/s/AKfycbx1_b7r4eBH5-BQzg-cizb4-iCasjJQ-b8QD2-4XuWhNzNK8Rt-J0lJm7QZWQj70WyzHQ/exec";

        console.log('Sending request with UUID data:', {
          uuid: data // Send the entire QR data as uuid
        });

        const response = await axios({
          method: 'post',
          url: googleAppsScriptURL,
          data: { uuid: data }, // Send raw QR data
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('Response from server:', response.data);

        if (!response.data.success) {
          if (response.data.alreadyScanned) {
            setSecurityErrorDetails({
              timeIn: response.data.timeIn,
              securityMessage: response.data.securityMessage
            });
            setShowSecurityError(true);
            return;
          }
          throw new Error(response.data.message || 'Failed to process Time In');
        }

        const timeIn = response.data.timeIn;
        const status = parsedData.status;
        
        setRecordedTime(timeIn);
        setRecordedStatus(status);
        setShowRecordModal(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      } catch (parseError) {
        // Handle URL QR codes
        if (data.startsWith('http://') || data.startsWith('https://') || data.startsWith('www.')) {
          Alert.alert(
            "URL Detected",
            "Would you like to open this link?",
            [
              {
                text: "Cancel",
                onPress: () => setScanned(false),
                style: "cancel"
              },
              {
                text: "Open",
                onPress: async () => {
                  try {
                    const url = data.startsWith('www.') ? `https://${data}` : data;
                    const supported = await Linking.canOpenURL(url);
                    
                    if (supported) {
                      await Linking.openURL(url);
                    } else {
                      Alert.alert("Error", "Cannot open this URL");
                    }
                  } catch (error) {
                    Alert.alert("Error", "Failed to open URL");
                  } finally {
                    setScanned(false);
                  }
                }
              }
            ]
          );
          return;
        }

        // Handle plain text QR codes
        Alert.alert(
          "Text Content",
          data,
          [
            { 
              text: "Copy",
              onPress: async () => {
                await Clipboard.setStringAsync(data);
                Toast.show({
                  type: 'success',
                  text1: 'Copied to clipboard',
                  position: 'bottom'
                });
                setScanned(false);
              }
            },
            {
              text: "Close",
              onPress: () => setScanned(false),
              style: "cancel"
            }
          ]
        );
      }
    } catch (error) {
      console.log('\n=== Error Details ===');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error?.response?.data?.message || error.message);
      console.error('Error Stack:', error.stack);
      console.error('Full Error:', error);
      
      Alert.alert(
        "Error",
        error?.response?.data?.message || error.message || "Failed to process Time In",
        [{ text: "OK", onPress: () => setScanned(false) }]
      );
    }
  }, []);

  if (!permission || !permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          {!permission ? "Requesting camera permission..." : "Camera access denied"}
        </Text>
        {permission && !permission.granted && (
          <Button 
            onPress={requestPermission} 
            title="Grant permission" 
            color="#007AFF" 
          />
        )}
      </View>
    );
  }

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={{ flex: 1 }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={'back'}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: ['qr'],
          }}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
            style={styles.overlay}
          >
            <BlurView intensity={25} tint="dark" style={styles.topOverlay}>
              <MaterialCommunityIcons 
                name={scanned ? "qrcode-scan" : "qrcode"} 
                size={32} 
                color={scanned ? "#FFA726" : "#fff"} 
                style={styles.headerIcon} 
              />
              <Text style={styles.headerText}>QR Scanner</Text>
              <Text style={[styles.subHeaderText, scanned && styles.processingText]}>
                {scanned ? 'Processing QR Code...' : 'Position the QR Code within the frame'}
              </Text>
            </BlurView>

            <View style={styles.scanArea}>
              <View style={styles.scannerWindow}>
                {scanned && (
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [{ translateY: scanLineAnimation }],
                      },
                    ]}
                  />
                )}
                <View style={[styles.corner, styles.cornerTL, scanned && styles.processingCorner]} />
                <View style={[styles.corner, styles.cornerTR, scanned && styles.processingCorner]} />
                <View style={[styles.corner, styles.cornerBL, scanned && styles.processingCorner]} />
                <View style={[styles.corner, styles.cornerBR, scanned && styles.processingCorner]} />
              </View>
            </View>

            <View style={styles.bottomContainer}>
              <BlurView intensity={25} tint="dark" style={styles.bottomOverlay}>
                <View style={[styles.statusContainer, scanned && styles.processingContainer]}>
                  <View style={[styles.statusDot, scanned && styles.statusDotProcessing]} />
                  <Text style={styles.statusText}>
                    {scanned ? 'Processing...' : 'Scanner Active'}
                  </Text>
                </View>
              </BlurView>

              <BlurView intensity={25} tint="dark" style={styles.bottomIndicator}>
                <View style={styles.indicatorContainer}>
                  <View style={styles.pageIndicator}>
                    <View style={[styles.dot, styles.activeDot]} />
                    <Text style={[styles.indicatorText, styles.activeText]}>Scanner</Text>
                  </View>
                  <View style={styles.pageIndicator}>
                    <View style={styles.dot} />
                    <Text style={styles.indicatorText}>QR Generator</Text>
                  </View>
                </View>
              </BlurView>
            </View>
          </LinearGradient>
        </CameraView>

        <TimeRecordModal
          visible={showRecordModal}
          onClose={() => {
            setShowRecordModal(false);
            setScanned(false);
          }}
          timeIn={recordedTime}
          status={recordedStatus}
        />

        <SecurityErrorModal
          visible={showSecurityError}
          onClose={() => {
            setShowSecurityError(false);
            setScanned(false);
          }}
          timeIn={securityErrorDetails?.timeIn}
          securityMessage={securityErrorDetails?.securityMessage}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  message: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
  },
  permissionText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topOverlay: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerIcon: {
    marginBottom: 12,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  subHeaderText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  scanArea: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerWindow: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    borderRadius: 20,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderColor: '#00E676',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: '#FFA726',
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  bottomContainer: {
    width: '100%',
    gap: 10, // Add spacing between elements
  },
  bottomOverlay: {
    width: '100%',
    paddingVertical: 15, // Reduced padding
    alignItems: 'center',
    
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  statusDotProcessing: {
    backgroundColor: '#FFA726', // Orange color for processing state
    shadowColor: '#FFA726',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676',
    marginRight: 8,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  processingText: {
    color: '#FFA726',
    fontWeight: '600',
  },
  processingCorner: {
    borderColor: '#FFA726',
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  processingContainer: {
    backgroundColor: 'rgba(255,166,38,0.2)', // FFA726 with opacity
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: '80%',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 30,
  },
  modalDetails: {
    width: '100%',
    gap: 8,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  modalDetailValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: '#50C878',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 20,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomIndicator: {
    width: '100%',
    paddingVertical: 15, // Reduced padding
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 5,
  },
  pageIndicator: {
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeDot: {
    backgroundColor: '#50C878',
    shadowColor: '#50C878',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  indicatorText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  activeText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorTitle: {
    color: '#FFA726',
  },
  errorButton: {
    backgroundColor: '#FFA726',
  },
  securityMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
  }
});
