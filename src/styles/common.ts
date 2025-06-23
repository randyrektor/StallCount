import { COLORS } from '../constants';

export const commonStyles = {
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
};

export const playerCardStyle = {
  padding: '8.5px 10.5px',
  borderRadius: '3.5px',
  textAlign: 'center' as const,
  color: '#fff',
  fontSize: '15.5px',
  fontWeight: 500,
  background: '#4a90e2', // default blue, can be overridden
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '36px',
}; 