import { Dimensions } from 'react-native';

export function isTablet(): boolean {
  const { width } = Dimensions.get('window');
  return width >= 768;
}
