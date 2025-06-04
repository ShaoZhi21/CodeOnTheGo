import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface ElseBlockProps {
  body: string;
  onChangeBody: (text: string) => void;
  onDelete?: () => void;
}

export function ElseBlock({ body, onChangeBody, onDelete }: ElseBlockProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <ThemedText style={styles.label}>else:</ThemedText>
        {onDelete && (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Image source={require('@/assets/images/icons/wrong-icon.png')} style={styles.deleteIcon} />
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        style={styles.bodyInput}
        value={body}
        onChangeText={onChangeBody}
        placeholder="then..."
        placeholderTextColor="#aaa"
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e6f4ea',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#b8e6d3',
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontWeight: 'bold',
    color: '#009045',
    fontSize: 16,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: '#009045',
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
}); 