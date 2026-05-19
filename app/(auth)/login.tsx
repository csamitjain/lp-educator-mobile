import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { sendPhoneOtp, verifyPhoneOtp } from '@/lib/supabase';
import { changeLanguage, getCurrentLang } from '@/lib/i18n';
import { Colors, FontFamily, FontSize, Gradients, Spacing, Radius } from '../../theme';
import TextInput from '@/components/ui/TextInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Toast from '@/components/ui/Toast';
import type { SupportedLanguage } from '@/lib/constants';

type Screen = 'phone' | 'otp';

const OTP_RESEND_SECONDS = 30;

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentLang = getCurrentLang();

  // Screen state
  const [screen, setScreen] = useState<Screen>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Countdown timer for OTP resend
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  // Validation
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCountdown() {
    setCountdown(OTP_RESEND_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ message, type, visible: true });
  }

  function validatePhone(): boolean {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setPhoneError(t('auth.login.invalid_phone'));
      return false;
    }
    setPhoneError('');
    return true;
  }

  function validateOtp(): boolean {
    if (otp.trim().length !== 6) {
      setOtpError(t('auth.login.invalid_otp'));
      return false;
    }
    setOtpError('');
    return true;
  }

  async function handleSendOtp() {
    if (!validatePhone()) return;
    setLoading(true);
    try {
      const { error } = await sendPhoneOtp(phone);
      if (error) {
        showToast(error, 'error');
        return;
      }
      setScreen('otp');
      startCountdown();
      showToast(t('auth.login.otp_sent', { phone: `+91 ${phone}` }), 'info');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!validateOtp()) return;
    setLoading(true);
    try {
      const { error } = await verifyPhoneOtp(phone, otp);
      if (error) {
        showToast(error, 'error');
        setOtpError(t('auth.login.invalid_otp'));
        return;
      }
      // Auth state change is picked up by EducatorContext + AuthGate
      // which will automatically redirect to onboarding or dashboard
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const { error } = await sendPhoneOtp(phone);
      if (error) {
        showToast(error, 'error');
        return;
      }
      startCountdown();
      setOtp('');
      showToast(t('auth.login.otp_sent', { phone: `+91 ${phone}` }), 'info');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleLang() {
    const next: SupportedLanguage = currentLang === 'hi' ? 'en' : 'hi';
    await changeLanguage(next);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {/* Header */}
      <LinearGradient
        colors={Gradients.header.colors}
        start={Gradients.header.start}
        end={Gradients.header.end}
        locations={Gradients.header.locations}
        style={styles.header}
      >
        {/* Language toggle */}
        <TouchableOpacity onPress={handleToggleLang} style={styles.langToggle}>
          <Text style={styles.langToggleText}>
            {currentLang === 'hi' ? 'EN' : 'हिं'}
          </Text>
        </TouchableOpacity>

        {/* App logo / name */}
        <Text style={styles.appName}>{t('app.name')}</Text>
        <Text style={styles.appTagline}>{t('app.tagline')}</Text>
      </LinearGradient>

      {/* Form */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {screen === 'phone' ? (
          <>
            <Text style={styles.screenTitle}>{t('auth.login.title')}</Text>
            <Text style={styles.screenSubtitle}>{t('auth.login.subtitle')}</Text>

            <View style={styles.formCard}>
              <TextInput
                label={t('auth.login.phone_label')}
                placeholder={t('auth.login.phone_placeholder')}
                prefix={t('auth.login.phone_prefix')}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v.replace(/\D/g, '').slice(0, 10));
                  setPhoneError('');
                }}
                keyboardType="phone-pad"
                maxLength={10}
                error={phoneError}
                required
              />

              <PrimaryButton
                label={loading ? t('auth.login.sending') : t('auth.login.send_otp')}
                loading={loading}
                onPress={handleSendOtp}
                disabled={phone.length < 10}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.screenTitle}>{t('auth.login.otp_label')}</Text>
            <Text style={styles.screenSubtitle}>
              {t('auth.login.otp_sent', { phone: `+91 ${phone}` })}
            </Text>

            {/* Back to phone */}
            <TouchableOpacity
              onPress={() => { setScreen('phone'); setOtp(''); setOtpError(''); }}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>← {t('buttons.back')}</Text>
            </TouchableOpacity>

            <View style={styles.formCard}>
              <TextInput
                label={t('auth.login.otp_label')}
                placeholder={t('auth.login.otp_placeholder')}
                value={otp}
                onChangeText={(v) => {
                  setOtp(v.replace(/\D/g, '').slice(0, 6));
                  setOtpError('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                error={otpError}
                required
              />

              <PrimaryButton
                label={loading ? t('auth.login.verifying') : t('auth.login.verify')}
                loading={loading}
                onPress={handleVerifyOtp}
                disabled={otp.length < 6}
              />

              {/* Resend OTP */}
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={countdown > 0 || loading}
                style={styles.resendBtn}
              >
                <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
                  {countdown > 0
                    ? t('auth.login.resend_in', { seconds: countdown })
                    : t('auth.login.resend_otp')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.cream },
  header: {
    paddingTop: 56,
    paddingBottom: Spacing[8],
    paddingHorizontal: Spacing[5],
    alignItems: 'center',
  },
  langToggle: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: Spacing[4],
  },
  langToggleText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  appName: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extraBold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.75)',
    marginTop: Spacing[1],
  },
  scroll: { flex: 1 },
  content: {
    padding: Spacing[5],
    paddingTop: Spacing[6],
  },
  screenTitle: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.extraBold,
    color: Colors.ink,
    marginBottom: Spacing[1],
  },
  screenSubtitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.inkMuted,
    marginBottom: Spacing[5],
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing[5],
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: {
    marginBottom: Spacing[4],
  },
  backBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.forest,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: Spacing[4],
    paddingVertical: Spacing[2],
  },
  resendText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.forest,
  },
  resendDisabled: {
    color: Colors.inkFaint,
  },
});
