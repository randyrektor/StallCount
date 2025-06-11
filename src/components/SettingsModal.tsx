import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { COLORS } from '../constants';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  team1Name: string;
  team2Name: string;
  onTeam1NameChange: (name: string) => void;
  onTeam2NameChange: (name: string) => void;
  gameStartTime: string;
  halftimeTime: string;
  endTime: string;
  onGameStartTimeChange: (time: string) => void;
  onHalftimeTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  genderRatioMode: 'ABBA' | '4-3' | '3-4';
  onGenderRatioModeChange: (mode: 'ABBA' | '4-3' | '3-4') => void;
  onReset: () => void;
}

export function SettingsModal({
  visible,
  onClose,
  team1Name,
  team2Name,
  onTeam1NameChange,
  onTeam2NameChange,
  gameStartTime,
  halftimeTime,
  endTime,
  onGameStartTimeChange,
  onHalftimeTimeChange,
  onEndTimeChange,
  genderRatioMode,
  onGenderRatioModeChange,
  onReset,
}: SettingsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Settings</Text>
          
          {/* Team Names */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Names</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Home Team</Text>
              <TextInput
                style={styles.input}
                value={team1Name}
                onChangeText={onTeam1NameChange}
                placeholder="Home Team Name"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Away Team</Text>
              <TextInput
                style={styles.input}
                value={team2Name}
                onChangeText={onTeam2NameChange}
                placeholder="Away Team Name"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* Game Times */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Game Times</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Game Start</Text>
              <TextInput
                style={styles.input}
                value={gameStartTime}
                onChangeText={onGameStartTimeChange}
                placeholder="HH:MM"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Halftime</Text>
              <TextInput
                style={styles.input}
                value={halftimeTime}
                onChangeText={onHalftimeTimeChange}
                placeholder="HH:MM"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Game End</Text>
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={onEndTimeChange}
                placeholder="HH:MM"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* Gender Ratio Mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gender Ratio Mode</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.ratioButton,
                  genderRatioMode === 'ABBA' && styles.ratioButtonActive
                ]}
                onPress={() => onGenderRatioModeChange('ABBA')}
              >
                <Text style={[
                  styles.ratioButtonText,
                  genderRatioMode === 'ABBA' && styles.ratioButtonTextActive
                ]}>ABBA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ratioButton,
                  genderRatioMode === '4-3' && styles.ratioButtonActive
                ]}
                onPress={() => onGenderRatioModeChange('4-3')}
              >
                <Text style={[
                  styles.ratioButtonText,
                  genderRatioMode === '4-3' && styles.ratioButtonTextActive
                ]}>4-3</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ratioButton,
                  genderRatioMode === '3-4' && styles.ratioButtonActive
                ]}
                onPress={() => onGenderRatioModeChange('3-4')}
              >
                <Text style={[
                  styles.ratioButtonText,
                  genderRatioMode === '3-4' && styles.ratioButtonTextActive
                ]}>3-4</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.resetButton]} 
              onPress={() => {
                onReset();
                onClose();
              }}
            >
              <Text style={styles.buttonText}>Reset Game</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.closeButton]} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)',
      },
      default: {
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#b3b3b3',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: 10,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  ratioButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#404040',
    alignItems: 'center',
  },
  ratioButtonActive: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  ratioButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  ratioButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#e74c3c',
  },
  closeButton: {
    backgroundColor: '#4a90e2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 