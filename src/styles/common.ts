import { THEME } from '../constants';

export const commonStyles = {
  cardContainer: {
    padding: 10,
    backgroundColor: THEME.bgApp,
    borderRadius: 8,
    borderWidth: 0,
    borderColor: THEME.border,
    alignItems: 'stretch',
    flexShrink: 0,
    width: '100%',
  },
};

export const playerCardStyle = {
  padding: '10px 12px',
  borderRadius: '8px',
  textAlign: 'center' as const,
  color: THEME.textOnAccent,
  fontSize: '15px',
  fontWeight: 600,
  background: THEME.open,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '40px',
};
