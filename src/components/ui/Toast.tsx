import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadows } from '../../../theme';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onHide?: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = 'success',
  visible,
  onHide,
  duration = 3000,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        type === 'success' && styles.success,
        type === 'error' && styles.error,
        type === 'info' && styles.info,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: Spacing[4],
    right: Spacing[4],
    borderRadius: Radius.md,
    padding: Spacing[3],
    zIndex: 9999,
    ...Shadows.card,
  },
  success: { backgroundColor: Colors.forest },
  error: { backgroundColor: Colors.terra },
  info: { backgroundColor: Colors.ink },
  message: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    textAlign: 'center',
  },
});
