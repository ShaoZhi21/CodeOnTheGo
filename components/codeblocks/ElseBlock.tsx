import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

interface ElseBlockProps {
  body: string;
  onChangeBody: (text: string) => void;
  onDelete?: () => void;
}

export function ElseBlock({ body, onChangeBody, onDelete }: ElseBlockProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ThemedText style={styles.label}>else</ThemedText>
      </View>
      <TextInput
        style={styles.bodyInput}
        value={body}
        onChangeText={onChangeBody}
        placeholder="then..."
        placeholderTextColor="#aaa"
        multiline
      />
      {onDelete && (
        <ThemedText style={styles.delete} onPress={onDelete}>Delete</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e6f4ea',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  label: {
    fontWeight: 'bold',
    color: '#009045',
    fontSize: 16,
    marginRight: 4,
  },
  bodyInput: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#009045',
    borderRadius: 6,
    fontSize: 16,
    color: '#222',
    padding: 6,
    backgroundColor: '#fff',
    marginLeft: 25,
  },
  delete: {
    color: '#FF375F',
    marginTop: 6,
    fontWeight: 'bold',
    textAlign: 'right',
  },
}); 