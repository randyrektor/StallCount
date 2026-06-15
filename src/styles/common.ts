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
  padding: '8.5px 10.5px',
  borderRadius: '3.5px',
  textAlign: 'center' as const,
  color: THEME.textOnAccent,
  fontSize: '15.5px',
  fontWeight: 500,
  background: THEME.open,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '36px',
};
