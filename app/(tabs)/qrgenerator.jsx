import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import QRCode from 'react-native-qrcode-svg';
import { runOnJS } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

// Update the ForwardedQRCode component to include status display
const ForwardedQRCode = React.forwardRef(({ status, ...props }, ref) => (
  <View style={[styles.qrWrapper, props.wrapperStyle]}>
    <LinearGradient
      colors={['rgba(80,200,120,0.1)', 'rgba(65,88,208,0.1)']}
      style={styles.qrBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Decorative Corners */}
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />

      <QRCode
        {...props}
        getRef={ref}
        logoSize={30}
        logoBackgroundColor="white"
        logoBorderRadius={8}
        logoMargin={4}
      />
      
      {/* Status Overlay - Updated for better QR compatibility */}
      {status && (
        <View style={styles.qrStatusOverlay}>
          <LinearGradient
            colors={
              status === 'vip' ? ['rgba(255,215,0,0.8)', 'rgba(255,165,0,0.8)'] :
              status === 'staff' ? ['rgba(65,88,208,0.8)', 'rgba(80,200,120,0.8)'] :
              ['rgba(80,200,120,0.8)', 'rgba(65,88,208,0.8)']
            }
            style={styles.qrStatusBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons 
              name={
                status === 'vip' ? 'crown' :
                status === 'staff' ? 'badge-account' :
                'account'
              }
              size={12} // Reduced size
              color="#fff"
            />
            <Text style={styles.qrStatusText}>
              {status?.toUpperCase()}
            </Text>
          </LinearGradient>
        </View>
      )}
    </LinearGradient>
  </View>
));

// Create a separate modal component with its own state
const UUIDModalContent = React.memo(({ 
  initialUUID,
  initialStatus, 
  onSubmit 
}) => {
  // Local state for the modal
  const [localUUID, setLocalUUID] = useState(initialUUID);
  const [localStatus, setLocalStatus] = useState(initialStatus);

  const handleSubmit = () => {
    onSubmit({ uuid: localUUID, status: localStatus });
  };

  console.log('Modal Content Rendered');
  
  return (
    <LinearGradient
      colors={['rgba(80,200,120,0.1)', 'rgba(0,0,0,0.2)']}
      style={styles.uuidModalGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.uuidModalTitle}>Configuration</Text>
      
      <View style={styles.uuidInputContainer}>
        <MaterialCommunityIcons 
          name="identifier" 
          size={24} 
          color="#fff" 
          style={styles.inputIcon} 
        />
        <TextInput
          style={styles.uuidInput}
          placeholder="Enter ID Number"
          placeholderTextColor="#rgba(255,255,255,0.6)"
          value={localUUID}
          onChangeText={text => setLocalUUID(text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          autoCapitalize="none"
          multiline={false}
          maxLength={36}
          autoFocus={true}
        />
      </View>

      <Text style={styles.statusLabel}>Select Status</Text>
      <View style={styles.statusGrid}>
        {['regular', 'vip', 'staff'].map((status) => (
          <TouchableOpacity 
            key={status}
            style={[
              styles.statusGridButton, 
              localStatus === status && styles.selectedStatus
            ]}
            onPress={() => setLocalStatus(status)}
          >
            <MaterialCommunityIcons 
              name={
                status === 'vip' ? 'crown' : 
                status === 'staff' ? 'badge-account' : 
                'account'
              } 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.statusGridText}>
              {status.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.applyButton}
        onPress={handleSubmit}
      >
        <LinearGradient
          colors={['#50C878', '#4158D0']}
          style={styles.applyGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.applyButtonText}>Apply</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
});

export default function QRGenerator() {
  console.log('Component Rendered'); // Add main render log

  const [qrData, setQrData] = useState('');
  const [inputType, setInputType] = useState('text'); // 'text', 'url', 'uuid'
  const [uuidStatus, setUuidStatus] = useState('regular'); // 'regular', 'vip', 'staff'
  const [showQR, setShowQR] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUUIDModal, setShowUUIDModal] = useState(false);
  const [tempUUID, setTempUUID] = useState('');
  const [tempStatus, setTempStatus] = useState('regular'); // Add temporary status state
  const qrRef = useRef();

  const navigateBack = useCallback(() => {
    router.back();
  }, []);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (event.velocityX > 500) {
        runOnJS(navigateBack)();
      }
    });

  const generateQRCodeData = () => {
    if (inputType === 'uuid') {
      return JSON.stringify({
        type: 'uuid',
        data: qrData,
        status: uuidStatus,
        created: new Date().toISOString()
      });
    }
    return qrData;
  };

  const generateQRCode = () => {
    if (qrData.trim().length > 0) {
      setShowQR(true);
    }
  };

  const saveQRCode = async () => {
    try {
      setSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission required',
          text2: 'Please allow access to save QR code'
        });
        return;
      }

      // Get QR code as base64
      if (!qrRef.current) {
        throw new Error('QR Code reference not available');
      }

      const qrImage = await new Promise((resolve) => {
        qrRef.current?.toDataURL(resolve);
      });

      // Save to file system then media library
      const filename = `${FileSystem.documentDirectory}qr-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(
        filename,
        qrImage,
        { encoding: FileSystem.EncodingType.Base64 }
      );
      
      await MediaLibrary.saveToLibraryAsync(filename);
      await FileSystem.deleteAsync(filename);
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'QR Code saved to gallery'
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save QR code'
      });
    } finally {
      setSaving(false);
    }
  };

  // Add this function to handle modal submission
  const handleModalSubmit = useCallback(({ uuid, status }) => {
    console.log('Modal Submit:', { uuid, status });
    Keyboard.dismiss();
    setQrData(uuid);
    setUuidStatus(status);
    setShowQR(false);
    setShowUUIDModal(false);
  }, []);

  // Add UUID Modal component
  const UUIDModal = useCallback(() => (
    <Modal
      visible={showUUIDModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        Keyboard.dismiss();
        setShowUUIDModal(false);
      }}
    >
      <View style={styles.uuidModalContainer}>
        <BlurView intensity={95} tint="dark" style={styles.uuidModalContent}>
          <UUIDModalContent
            initialUUID={qrData}
            initialStatus={uuidStatus}
            onSubmit={handleModalSubmit}
          />
        </BlurView>
      </View>
    </Modal>
  ), [showUUIDModal, qrData, uuidStatus, handleModalSubmit]);

  // Update modal show handler to initialize temp UUID
  const handleShowUUIDModal = useCallback(() => {
    console.log('Opening Modal with:', { currentQR: qrData, currentStatus: uuidStatus });
    setTempUUID(qrData);
    setTempStatus(uuidStatus); // Initialize temp status
    setShowUUIDModal(true);
  }, [qrData, uuidStatus]);

  // Modify the renderInputSection to show a button for UUID config
  const renderInputSection = () => {
    return (
      <View style={styles.inputSection}>
        <View style={styles.typeSelector}>
          {['text', 'url', 'uuid'].map((type) => (
            <TouchableOpacity 
              key={type}
              style={[styles.typeButton, inputType === type && styles.selectedType]}
              onPress={() => setInputType(type)}
            >
              <MaterialCommunityIcons 
                name={
                  type === 'url' ? 'link' : 
                  type === 'uuid' ? 'card-account-details' : 
                  'text'
                } 
                size={22} 
                color="#fff" 
              />
              <Text style={styles.typeButtonText}>{type.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {inputType === 'uuid' ? (
          <TouchableOpacity 
            style={styles.uuidButton}
            onPress={handleShowUUIDModal}
          >
            <View style={styles.uuidButtonContent}>
              <MaterialCommunityIcons 
                name="identifier" 
                size={24} 
                color="#fff"
              />
              <View style={styles.uuidInfo}>
                <Text style={styles.uuidLabel}>Configuration</Text>
                <Text style={styles.uuidDetails}>
                  {qrData ? qrData : 'No ID set'} • {uuidStatus.toUpperCase()}
                </Text>
              </View>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color="#fff"
              />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons 
              name={inputType === 'url' ? 'link' : 'text'} 
              size={24} 
              color="#fff" 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.input}
              placeholder={inputType === 'url' ? "Enter URL" : "Enter text"}
              placeholderTextColor="#rgba(255,255,255,0.6)"
              value={qrData}
              onChangeText={(text) => {
                setQrData(text);
                setShowQR(false);
              }}
              autoCapitalize={inputType === 'url' ? 'none' : 'sentences'}
              multiline={true}
              textAlignVertical="top"
              numberOfLines={4}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <GestureDetector gesture={swipeGesture}>
      <LinearGradient
        colors={['#0B0B45', '#1B4D3E', '#2E1A47']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <BlurView intensity={10} tint="dark" style={styles.card}>
              <Text style={styles.title}>Create QR Code</Text>
              
              {renderInputSection()}

              <TouchableOpacity 
                style={styles.previewArea}
                onPress={() => showQR && setShowModal(true)}
                disabled={!showQR}
              >
                {showQR && qrData.trim().length > 0 ? (
                  <ForwardedQRCode
                    value={generateQRCodeData()}
                    size={180}
                    color="#fff"
                    backgroundColor="transparent"
                    ref={qrRef}
                    quietZone={16}
                    wrapperStyle={styles.previewQR}
                    status={inputType === 'uuid' ? uuidStatus : null}
                  />
                ) : (
                  <Text style={styles.previewText}>
                    {qrData.trim().length === 0 
                      ? "Enter text to generate QR Code" 
                      : "Click generate to create QR Code"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.generateButton,
                  qrData.trim().length === 0 && styles.generateButtonDisabled
                ]}
                onPress={generateQRCode}
                disabled={qrData.trim().length === 0}
              >
                <LinearGradient
                  colors={['#50C878', '#4158D0']}
                  style={styles.generateGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.generateText}>Generate QR Code</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <Text style={styles.hint}>Swipe left to return to scanner</Text>
            </BlurView>
          </View>
        </KeyboardAvoidingView>

        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalContainer}>
            <BlurView intensity={95} tint="dark" style={styles.modalContent}>
              <ForwardedQRCode
                value={generateQRCodeData()}
                size={300}
                color="#fff"
                backgroundColor="transparent"
                quietZone={20}
                wrapperStyle={styles.modalQR}
                status={inputType === 'uuid' ? uuidStatus : null}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveQRCode}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Save to Gallery</Text>
                  )}
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>
        <UUIDModal />
        <Toast />
      </LinearGradient>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    overflow: 'hidden',
    maxHeight: '90%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed from 'center' to align with top of multiline input
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    marginBottom: 5,
    padding: 5,
    minHeight: 50, // Minimum height for single line
    maxHeight: 120, // Maximum height for multiline
  },
  inputIcon: {
    marginHorizontal: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    padding: 12,
    paddingTop: 12, // Consistent padding for multiline
    minHeight: 45, // Minimum height for single line
  },
  previewArea: {
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    opacity: 0.9,
  },
  previewText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 10,
  },
  generateGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  generateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 10,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    width: '90%',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 10,
  },
  modalButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 120,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#50C878',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrWrapper: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  qrBackground: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewQR: {
    transform: [{ scale: 0.9 }],
  },
  modalQR: {
    transform: [{ scale: 1.1 }],
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#50C878',
    borderWidth: 3,
  },
  topLeft: {
    top: 8,
    left: 8,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 8,
    right: 8,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 8,
    left: 8,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 8,
    right: 8,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  inputSection: {
    gap: 12,
    marginBottom: 15,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  selectedType: {
    backgroundColor: 'rgba(80,200,120,0.3)',
    borderColor: '#50C878',
    borderWidth: 1,
  },
  typeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  uuidSection: {
    gap: 8,
  },
  statusSelector: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  selectedStatus: {
    backgroundColor: 'rgba(80,200,120,0.3)',
    borderColor: '#50C878',
    borderWidth: 1,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  uuidButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    marginTop: 10,
  },
  uuidButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 12,
  },
  uuidInfo: {
    flex: 1,
  },
  uuidLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uuidDetails: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  uuidModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  uuidModalContent: {
    width: '90%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
  },
  uuidModalGradient: {
    padding: 20,
  },
  uuidModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  uuidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  uuidInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingLeft: 10,
  },
  statusLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statusGridButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    gap: 8,
  },
  statusGridText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  applyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  applyGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrStatusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // Makes sure it doesn't interfere with touch events
  },
  qrStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.3)', // Add semi-transparent background
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  qrStatusText: {
    color: '#fff',
    fontSize: 10, // Smaller font size
    fontWeight: 'bold',
    textAlign: 'center',
  }
});