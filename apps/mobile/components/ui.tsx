import {
  View, Text, TouchableOpacity, ActivityIndicator, Animated,
  StyleSheet, type ViewStyle,
} from 'react-native';
import { useEffect, useRef } from 'react';

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
  default: { bg: '#F3F4F6', text: '#6B7280' },
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
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  return <Animated.View style={[s.skeleton, { height, opacity }]} />;
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

// ── AppLogo ───────────────────────────────────────────────────────────────────
export function AppLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim   = size === 'sm' ? 36  : size === 'lg' ? 72  : 52;
  const emoji = size === 'sm' ? 16  : size === 'lg' ? 32  : 24;
  const name  = size === 'sm' ? 15  : size === 'lg' ? 26  : 20;
  const sub   = size === 'sm' ? 0   : size === 'lg' ? 13  : 11;

  return (
    <View style={logo.wrap}>
      <View style={[logo.circle, { width: dim, height: dim, borderRadius: dim / 2 }]}>
        <Text style={{ fontSize: emoji }}>📚</Text>
      </View>
      <View>
        <Text style={[logo.name, { fontSize: name }]}>Reforços Escolares</Text>
        {sub > 0 && <Text style={[logo.sub, { fontSize: sub }]}>Plataforma pedagógica</Text>}
      </View>
    </View>
  );
}

const logo = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  circle: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  name:   { fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  sub:    { color: colors.muted, marginTop: 1 },
});

// ── AppSplashScreen ───────────────────────────────────────────────────────────
export function AppSplashScreen({ onDone }: { onDone: () => void }) {
  const scale   = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1,   useNativeDriver: true, tension: 55, friction: 7 }),
        Animated.timing(opacity, { toValue: 1,   duration: 350,         useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.timing(fadeOut,   { toValue: 0,   duration: 280,         useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={[sp.container, { opacity: fadeOut }]}>
      <Animated.View style={[sp.inner, { opacity, transform: [{ scale }] }]}>
        <View style={sp.iconCircle}>
          <Text style={sp.iconEmoji}>📚</Text>
        </View>
        <Text style={sp.appName}>Reforços Escolares</Text>
        <Text style={sp.tagline}>Plataforma pedagógica</Text>
      </Animated.View>
    </Animated.View>
  );
}

const sp = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  inner:      { alignItems: 'center', gap: 16 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  iconEmoji:  { fontSize: 44 },
  appName:    { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tagline:    { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
});

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
