// Cor de destaque por aba da bottom tab bar — cada ícone tem uma identidade
// visual própria em vez do padrão cinza/azul genérico do React Navigation.
export function withAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
