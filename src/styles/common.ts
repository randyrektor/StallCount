import { StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export const commonStyles = StyleSheet.create({
  cardContainer: {
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: COLORS.border,
    alignItems: 'stretch',
    flexShrink: 0,
    width: '100%',
  },
}); 