import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { PillButton } from '@/components/PillButton';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { useAuth } from '@/lib/auth';
import { palette, space } from '@/constants/theme';
import { OnboardingAnimation } from '@/components/OnboardingAnimation';

type Mode = 'signin' | 'signup' | 'forgot';

export default function Login() {
  const { signInWithEmail, signUpWithEmail, signInWithApple, forgotPassword } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  const onPrimary = async () => {
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, username);
      }
    } catch (e: any) {
      Alert.alert('Sign-in failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter your email first', 'Type your email above, then tap "Send reset link".');
      return;
    }
    setBusy(true);
    try {
      await forgotPassword(email);
      Alert.alert('Check your inbox', `A password reset link has been sent to ${email.trim()}.`);
      setMode('signin');
    } catch (e: any) {
      Alert.alert('Could not send reset email', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onApple = async () => {
    setBusy(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple sign-in failed', e?.message ?? 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tone="cream">
      <OnboardingAnimation
        visible={showOnboarding}
        onDone={() => setShowOnboarding(false)}
      />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text variant="hero" color={palette.starbucksGreen}>
              Word Share
            </Text>
            <Text variant="bodyLarge" color={palette.textBlackSoft} style={{ marginTop: 8 }}>
              Send words. Build a bank. Together.
            </Text>
          </View>

          {mode === 'forgot' ? (
            <View style={styles.form}>
              <Text variant="h2" style={styles.modeTitle}>Reset password</Text>
              <FloatingLabelInput
                label="Email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <PillButton
                label={busy ? 'Sending…' : 'Send reset link'}
                onPress={onForgotPassword}
                loading={busy}
                fullWidth
                size="large"
              />
              <Pressable onPress={() => setMode('signin')} style={styles.toggleRow}>
                <Text variant="smallStrong" color={palette.greenAccent}>Back to sign in</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <Text variant="h2" style={styles.modeTitle}>
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </Text>

              {mode === 'signup' ? (
                <FloatingLabelInput
                  label="Username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={setUsername}
                />
              ) : null}
              <FloatingLabelInput
                label="Email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <FloatingLabelInput
                label="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <PillButton
                label={mode === 'signin' ? 'Sign in' : 'Create account'}
                onPress={onPrimary}
                loading={busy}
                fullWidth
                size="large"
              />

              {mode === 'signin' ? (
                <Pressable onPress={() => setMode('forgot')} style={styles.toggleRow}>
                  <Text variant="small" color={palette.textBlackSoft}>Forgot your password?</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
                style={styles.toggleRow}
              >
                <Text variant="small" color={palette.textBlackSoft}>
                  {mode === 'signin' ? "New to Word Share? " : 'Already have an account? '}
                </Text>
                <Text variant="smallStrong" color={palette.greenAccent}>
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </Text>
              </Pressable>
            </View>
          )}

          {mode !== 'forgot' && Platform.OS === 'ios' ? (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text variant="micro" style={styles.dividerLabel}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={999}
                style={styles.appleBtn}
                onPress={onApple}
              />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.s7 },
  header: { alignItems: 'center', marginBottom: space.s7 },
  form: { gap: space.s3 },
  modeTitle: { textAlign: 'center', marginBottom: space.s1 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: space.s1 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: space.s5,
    gap: space.s3,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: palette.inputBorder },
  dividerLabel: { color: palette.textBlackSoft },
  appleBtn: { height: 52, width: '100%' },
});
