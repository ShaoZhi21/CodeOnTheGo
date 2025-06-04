// app/components/DescriptionBox.tsx
import React from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface DescriptionBoxProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onDelete?: () => void;
}

const MIN_HEIGHT = 20; // About one line
const MAX_HEIGHT = 200;
const CHAR_LIMIT = 90;

const DescriptionBox: React.FC<DescriptionBoxProps> = ({ value, onChangeText, placeholder, onDelete }) => {
  const isOverLimit = value.length >= CHAR_LIMIT;

  return (
    <View style={styles.row}>
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
          <Image source={require('@/assets/images/icons/wrong-icon.png')} style={styles.deleteIcon} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
    marginBottom: 8,
    gap: 8,
    borderWidth: 2,
    borderColor: '#C4B5FD',
    borderRadius: 12,
    backgroundColor: '#E6D3FF',
  },
  codeInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#9333EA',
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
});

export default DescriptionBox;