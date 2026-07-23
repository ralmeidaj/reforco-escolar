import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, type ViewStyle, type TextStyle,
} from 'react-native';

// ── Cores ─────────────────────────────────────────────────────────────────────
export const colors = {
  primary:  '#2563EB',
  success:  '#16A34A',
  danger:   '#DC2626',
  warning:  '#D97706',
  muted:    '#6B7280',
  bg:       '#F9FAFB',
  card:     '#FFFFFF',
  border:   '#E5E7EB',
  text:     '#111827',
  textSub:  '#6B7280',
};

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  success: { bg: '#DCFCE7', text: '#15803D' },
  danger:  { bg: '#FEE2E2', text: '#B91C1C' },
  warning: { bg: '#FEF3C7', text: '#B45309' },
  muted:   { bg: '#F3F4F6', text: '#6B7280' },
  primary: { bg: '#DBEAFE', text: '#1D4ED8' },
};

export function Badge({ label, variant = 'muted' }: { label: string; variant?: string }) {
  const c = BADGE_COLORS[variant] ?? BADGE_COLORS.muted;
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
  style?: ViewStyle;
}

export function Button({ label, onPress, loading, disabled, variant = 'primary', style }: ButtonProps) {
  const bg = variant === 'danger' ? colors.danger : variant === 'ghost' ? 'transparent' : colors.primary;
  const textColor = variant === 'ghost' ? colors.primary : '#fff';
  const borderStyle = variant === 'ghost' ? { borderWidth: 1, borderColor: colors.primary } : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[s.btn, { backgroundColor: bg }, borderStyle, (disabled || loading) && s.btnDisabled, style]}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[s.btnText, { color: textColor }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, message }: { icon?: string; message: string }) {
  return (
    <View style={s.emptyState}>
      {icon ? <Text style={s.emptyIcon}>{icon}</Text> : null}
      <Text style={s.emptyText}>{message}</Text>
    </View>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────
export function SkeletonCard({ height = 72 }: { height?: number }) {
  return <View style={[s.skeleton, { height }]} />;
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  badge: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  btn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { fontSize: 14, fontWeight: '600' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  skeleton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    opacity: 0.6,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
});
