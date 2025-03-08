import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const UUIDConfigModal = ({ 
  visible, 
  onClose, 
  uuidValue, 
  onUUIDChange 
}) => {
  const handleUUIDChange = (text) => {
    // Allow any character, but limit length to 20 characters
    const limitedText = text.slice(0, 20);
    onUUIDChange(limitedText);
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
          <Text style={styles.modalTitle}>Enter ID</Text>
          
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons 
              name="identifier" 
              size={24} 
              color="#fff" 
              style={styles.inputIcon} 
            />
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter your ID"
                placeholderTextColor="#rgba(255,255,255,0.6)"
                value={uuidValue}
                onChangeText={handleUUIDChange}
                autoCapitalize="none"
                maxLength={20}
              />
              <Text style={styles.formattedText}>
                {uuidValue || 'Type your ID here'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={onClose}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    padding: 20,
    borderRadius: 20,
    width: '90%',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 5,
    marginBottom: 20,
  },
  inputIcon: {
    marginHorizontal: 10,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    color: '#fff',
    fontSize: 16,
    padding: 12,
  },
  formattedText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    paddingLeft: 12,
    paddingBottom: 8,
  },
  confirmButton: {
    backgroundColor: '#50C878',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UUIDConfigModal;
