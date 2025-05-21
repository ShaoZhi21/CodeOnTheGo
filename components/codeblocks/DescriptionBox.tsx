// app/components/DescriptionBox.tsx
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
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
    marginLeft: 8,
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#FF375F',
    fontWeight: 'bold',
    lineHeight: 18,
  },
});

export default DescriptionBox;