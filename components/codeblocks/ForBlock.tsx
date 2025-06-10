import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ForBlockProps {
  condition: string;
  body: string;
  onChangeCondition: (text: string) => void;
  onChangeBody: (text: string) => void;
  onDelete?: () => void;
  borderStyle?: object;
  explanation?: string;
}

export function ForBlock({ condition, body, onChangeCondition, onChangeBody, onDelete, borderStyle, explanation }: ForBlockProps) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={[styles.container, borderStyle]}>
        <View style={styles.row}>
          <ThemedText style={styles.label}>for</ThemedText>
          <TextInput
            style={styles.conditionInput}
            value={condition}
            onChangeText={onChangeCondition}
            placeholder="condition"
            placeholderTextColor="#aaa"
          />
          {onDelete && (
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
              <Image source={require('@/assets/images/icons/trash-delete-icon.png')} style={styles.deleteIcon} />
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={styles.bodyInput}
          value={body}
          onChangeText={onChangeBody}
          placeholder="do..."
          placeholderTextColor="#aaa"
          multiline
        />
      </View>
      {explanation && (
        <View style={styles.explanationContainer}>
          <Text style={styles.explanationText}>💡 {explanation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0e6ff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d9b3ff',
    padding: 10,
    marginBottom: 8,
    gap: 8,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontWeight: 'bold',
    color: '#a855f7',
    fontSize: 16,
    marginRight: 4,
  },
  conditionInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#a855f7',
    fontSize: 16,
    color: '#222',
    padding: 4,
    marginHorizontal: 4,
    minWidth: 60,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: '#a855f7',
    borderRadius: 6,
    fontSize: 16,
    color: '#222',
    padding: 12,
    backgroundColor: '#fff',
    marginLeft: 25,
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
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#faf5ff',
    marginTop: -10,
  },
  explanationText: {
    fontSize: 14,
    color: '#7c3aed',
    fontStyle: 'italic',
  },
}); 