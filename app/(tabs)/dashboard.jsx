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
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzE03P1P_H33PRYpUyfZwcQx52WtSr2BdHjOih5356raNTCksJTlzduwysmUDbFZ3er/exec";

const getTypeColor = (type) => {
  switch(type.toUpperCase()) {
    case 'VIP': return '#FFD700';      // Gold
    case 'GENAD': return '#4169E1';    // Royal Blue
    case 'VISITORS': return '#50C878';  // Emerald
    default: return '#50C878';
  }
};

const getStatusColor = (statusCode) => {
  switch(statusCode) {
    case 'P': return '#50C878';  // Green for PAID
    case 'UP': return '#FF6B6B'; // Red for UNPAID
    case 'S': return '#FFA726';  // Orange for SPONSORED
    case 'F': return '#20B2AA';  // Teal for FREE
    default: return '#50C878';   // Default Green
  }
};

const getStatusIcon = (type, statusCode) => {
  if (type === 'VIP') return 'crown';
  if (type === 'GENAD') return 'account-tie';
  if (statusCode === 'UP') return 'alert-circle';
  return 'account-check';
};

// Remove the complex message formatting and simplify to core info
const getPaymentStatus = (statusCode, type) => {
  if (type === 'VISITORS') return 'FREE';
  switch(statusCode) {
    case 'P': return 'PAID';
    case 'UP': return 'UNPAID';
    case 'S': return 'SPONSORED';
    case 'F': return 'FREE';
    default: return 'FREE';
  }
};

// Update TimeRecordModal component
const TimeRecordModal = ({ visible, onClose, timeIn, qrId }) => {
  if (!qrId) return null;

  const [type, statusCode] = qrId.split('-');
  const baseColor = getTypeColor(type);
  const statusColor = getStatusColor(statusCode);
  const icon = getStatusIcon(type, statusCode);
  const paymentStatus = getPaymentStatus(statusCode, type);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={95} tint="dark" style={styles.modalContent}>
          <LinearGradient
            colors={[`${baseColor}40`, `${statusColor}40`]}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons 
              name={icon}
              size={50} 
              color={baseColor}
            />
            <Text style={[styles.modalTitle, { color: baseColor }]}>
              {type}
            </Text>
            <Text style={styles.qrIdText}>{qrId}</Text>
          </LinearGradient>

          <View style={styles.modalDetails}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
              <MaterialCommunityIcons 
                name={statusCode === 'UP' ? 'alert-circle' : 'check-circle'}
                size={20} 
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {paymentStatus}
              </Text>
            </View>

            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>Time In</Text>
              <Text style={styles.timeValue}>{timeIn}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: baseColor }]} 
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>Confirm</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
};

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

// Update UnpaidModal component with admin-focused messaging
const UnpaidModal = ({ visible, onClose, qrId }) => {
  const [type] = qrId ? qrId.split('-') : [''];
  const baseColor = '#FF6B6B';  // Red color for unpaid status

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={95} tint="dark" style={styles.modalContent}>
          <MaterialCommunityIcons 
            name="cash-remove" 
            size={50} 
            color={baseColor}
          />
          <Text style={[styles.modalTitle, { color: baseColor }]}>
            Unpaid Registration
          </Text>
          <View style={styles.modalDetails}>
            <View style={styles.unpaidDetailsBox}>
              <Text style={styles.unpaidIdLabel}>QR Code ID:</Text>
              <Text style={styles.unpaidIdValue}>{qrId}</Text>
              <View style={styles.unpaidTypeBadge}>
                <Text style={styles.unpaidTypeText}>{type}</Text>
              </View>
            </View>
            <Text style={[styles.unpaidMessage, { borderColor: `${baseColor}40` }]}>
              This {type} registration is unpaid.{'\n'}
              Direct the attendee to the payment counter.
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: baseColor }]} 
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>Acknowledge</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
};

// Replace the RegularModal component with this updated version
const RegularModal = ({ visible, onClose, qrId, timeIn }) => {
  if (!qrId) return null;

  const [_, statusCode, id] = qrId ? qrId.split('-') : ['', '', ''];
  const baseColor = '#4169E1';  // Royal Blue for Regular
  const statusColor = getStatusColor(statusCode);
  const paymentStatus = getPaymentStatus(statusCode, 'REGULAR');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={95} tint="dark" style={styles.modalContent}>
          <LinearGradient
            colors={[`${baseColor}40`, `${statusColor}40`]}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons 
              name="account-group" 
              size={50} 
              color={baseColor}
            />
            <Text style={[styles.modalTitle, { color: baseColor }]}>
              REGULAR
            </Text>
            <Text style={styles.qrIdText}>{qrId}</Text>
          </LinearGradient>

          <View style={styles.modalDetails}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
              <MaterialCommunityIcons 
                name={statusCode === 'UP' ? 'alert-circle' : 'check-circle'}
                size={20} 
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {paymentStatus}
              </Text>
            </View>

            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>Time In</Text>
              <Text style={styles.timeValue}>{timeIn}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: baseColor }]} 
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>Confirm</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
};

// Add new URLModal component after other modal components
const URLModal = ({ visible, onClose, url }) => {
  const handleOpenURL = async () => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this URL");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open URL");
    } finally {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={95} tint="dark" style={styles.modalContent}>
          <MaterialCommunityIcons 
            name="link" 
            size={50} 
            color="#4169E1"
          />
          <Text style={[styles.modalTitle, { color: '#4169E1' }]}>
            Website Detected
          </Text>
          <View style={styles.modalDetails}>
            <Text style={styles.urlText}>{url}</Text>
          </View>
          <View style={styles.urlButtonContainer}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#4169E1' }]} 
              onPress={handleOpenURL}
            >
              <Text style={styles.modalButtonText}>Open Website</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

// Add state for URL modal
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
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [showRegularModal, setShowRegularModal] = useState(false);
  const [showURLModal, setShowURLModal] = useState(false);
  const [detectedURL, setDetectedURL] = useState('');

  const handleBarCodeScanned = useCallback(async ({ data }) => {
    setScanned(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Check if it's a URL first
      if (data.startsWith('http://') || data.startsWith('https://') || data.startsWith('www.')) {
        const url = data.startsWith('www.') ? `https://${data}` : data;
        setDetectedURL(url);
        setShowURLModal(true);
        return;
      }

      const qrMatch = data.match(/^(VIP|GENAD|VISITORS|REGULAR)-([A-Z]+-)?(\d+)$/);
      
      if (qrMatch) {
        const [_, type, statusCodeWithHyphen, id] = qrMatch;
        const statusCode = type === 'VISITORS' ? 'F' : statusCodeWithHyphen?.replace('-', '') || 'P';

        // Check if status is UP (unpaid) and show UnpaidModal
        if (statusCode === 'UP') {
          setRecordedStatus(data); // Store QR ID
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setShowUnpaidModal(true);
          return;
        }

        console.log('Processing ID:', type, statusCode, id);
        
        const response = await axios({
          method: 'post',
          url: GOOGLE_APPS_SCRIPT_URL,
          data: { 
            uuid: JSON.stringify({
              type: 'uuid',
              data: data,
              status: statusCode
            })
          },
          headers: { 'Content-Type': 'application/json' }
        });

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

        setRecordedTime(response.data.timeIn);
        setRecordedStatus(data); // Pass full QR ID for modal display

        if (type === 'REGULAR') {
          setShowRegularModal(true);
        } else {
          setShowRecordModal(true);
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      // Handle other QR code types (text/URL)
      // ...existing code for other QR types...
    } catch (error) {
      console.log('\n=== Error Details ===');
      console.error('Error:', error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || error.message,
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
              <BlurView intensity={0} tint="dark" style={styles.bottomOverlay}>
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
          qrId={recordedStatus} // Pass the full QR ID
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

        <UnpaidModal
          visible={showUnpaidModal}
          onClose={() => {
            setShowUnpaidModal(false);
            setScanned(false);
          }}
          qrId={recordedStatus}
        />

        <RegularModal
          visible={showRegularModal}
          onClose={() => {
            setShowRegularModal(false);
            setScanned(false);
          }}
          qrId={recordedStatus}
          timeIn={recordedTime}
        />

        <URLModal
          visible={showURLModal}
          onClose={() => {
            setShowURLModal(false);
            setScanned(false);
          }}
          url={detectedURL}
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
  },
  modalHeader: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 20,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  timeLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 5,
  },
  timeValue: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 15,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  qrIdText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 5,
  },
  unpaidMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 15,
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  unpaidDetailsBox: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  unpaidIdLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  unpaidIdValue: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  unpaidTypeBadge: {
    backgroundColor: 'rgba(255,107,107,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  unpaidTypeText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  regularDetailsBox: {
    backgroundColor: 'rgba(65,105,225,0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(65,105,225,0.2)',
  },
  regularIdLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  regularIdValue: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 12,
  },
  regularStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  regularStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  urlText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    padding: 15,
    backgroundColor: 'rgba(65,105,225,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(65,105,225,0.2)',
  },
  urlButtonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});