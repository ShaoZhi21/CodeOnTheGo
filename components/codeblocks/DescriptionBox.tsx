// app/components/DescriptionBox.tsx
import React from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface DescriptionBoxProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onDelete?: () => void;
  borderStyle?: object;
  explanation?: string;
}

const MIN_HEIGHT = 20; // About one line
const MAX_HEIGHT = 200;
const CHAR_LIMIT = 90;

const DescriptionBox: React.FC<DescriptionBoxProps> = ({ value, onChangeText, placeholder, onDelete, borderStyle, explanation }) => {
  const isOverLimit = value.length >= CHAR_LIMIT;

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={[styles.row, { 
        paddingRight: onDelete ? 10 : 8,
        paddingLeft: onDelete ? 6 : 8,
      }, borderStyle]}>
        <View style={styles.codeInputContainer}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            style={styles.codeInput}
            multiline
            placeholder={placeholder || "Write your solution here..."}
            maxLength={CHAR_LIMIT} // allow a little overflow for warning
          />
          {isOverLimit && (
            <Text style={styles.limitWarning}>Max characters. Use a new box.</Text>
          )}
        </View>
        {onDelete && (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Image source={require('@/assets/images/icons/trash-delete-icon.png')} style={styles.deleteIcon} />
          </TouchableOpacity>
        )}
      </View>
      {explanation && (
        <View style={styles.explanationContainer}>
          <Text style={styles.explanationText}>💡 {explanation}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0, // Remove margin when explanation is present
    gap: 8,
    borderWidth: 2,
    borderColor: '#d9b3ff',
    borderRadius: 12,
    backgroundColor: '#f0e6ff',
    paddingVertical: 6,
    zIndex: 1, // Ensure main block border appears above explanation
  },
  codeInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#a855f7',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 12,
  },
  codeInput: {
    fontSize: 16,
    color: '#444',
    textAlignVertical: 'top',
    padding: 0,
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
  },
  limitWarning: {
    color: '#FF375F',
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF375F',
    backgroundColor: 'white',
  },
  deleteIcon: {
    width: 14,
    height: 14,
    tintColor: '#FF375F',
  },
  explanationContainer: {
    padding: 12,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopWidth: 0,
    borderColor: '#d9b3ff',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#faf5ff',
    marginTop: -10, // Move up to overlap with main block
  },
  explanationText: {
    fontSize: 14,
    color: '#7c3aed',
    fontStyle: 'italic',
  },
});

export default DescriptionBox;