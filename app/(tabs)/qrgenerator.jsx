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
  Modal,
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
import UUIDConfigModal from './../../components/UUIDConfigModal';

// Add this custom QRCode component with forwardRef
const ForwardedQRCode = React.forwardRef((props, ref) => (
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
        //logo={require('../../assets/images/Logo1.png')}
        logoSize={30}
        logoBackgroundColor="white"
        logoBorderRadius={8}
        logoMargin={4}
      />
    </LinearGradient>
  </View>
));

export default function QRGenerator() {
  const [qrData, setQrData] = useState('');
  const [inputType, setInputType] = useState('text'); // 'text', 'url', 'uuid'
  const [showQR, setShowQR] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUUIDModal, setShowUUIDModal] = useState(false);
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
        created: new Date().toISOString()
      });
    }
    return qrData;
  };

  const generateQRCode = () => {
    Keyboard.dismiss();
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

  const renderInputSection = () => {
    return (
      <View style={styles.inputSection}>
        <View style={styles.typeSelector}>
          {['text', 'url', 'uuid'].map((type) => (
            <TouchableOpacity 
              key={type}
              style={[styles.typeButton, inputType === type && styles.selectedType]}
              onPress={() => {
                setInputType(type);
                if (type === 'uuid') {
                  setShowUUIDModal(true);
                }
              }}
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
            style={styles.uuidDisplay}
            onPress={() => setShowUUIDModal(true)}
          >
            <MaterialCommunityIcons 
              name="identifier" 
              size={24} 
              color="#fff" 
              style={styles.inputIcon} 
            />
            <View style={styles.uuidInfo}>
              <Text style={styles.uuidText}>
                {qrData || 'Click to enter ID'}
              </Text>
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

        <BlurView intensity={25} tint="dark" style={styles.bottomIndicator}>
          <View style={styles.indicatorContainer}>
            <View style={styles.pageIndicator}>
              <View style={styles.dot} />
              <Text style={styles.indicatorText}>Scanner</Text>
            </View>
            <View style={styles.pageIndicator}>
              <View style={[styles.dot, styles.activeDot]} />
              <Text style={[styles.indicatorText, styles.activeText]}>QR Generator</Text>
            </View>
          </View>
        </BlurView>

        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalContainer}>
            <BlurView intensity={95} tint="dark" style={styles.modalContent}>
              <ForwardedQRCode
                value={qrData}
                size={300}
                color="#fff"
                backgroundColor="transparent"
                quietZone={20}
                wrapperStyle={styles.modalQR}
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
        <UUIDConfigModal
          visible={showUUIDModal}
          onClose={() => setShowUUIDModal(false)}
          uuidValue={qrData}
          onUUIDChange={(text) => {
            setQrData(text);
            setShowQR(false);
          }}
        />
        <Toast />
      </LinearGradient>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginTop: 12, // Center icon with first line of text
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
  bottomIndicator: {
    width: '100%',
    paddingVertical: 15,
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
  uuidDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  uuidInfo: {
    flex: 1,
    marginLeft: 10,
  },
  uuidText: {
    color: '#fff',
    fontSize: 16,
  },
  uuidStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
});