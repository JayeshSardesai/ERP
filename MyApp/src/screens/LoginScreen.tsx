import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }: any) => {
  const [selectedRole, setSelectedRole] = useState<'Student' | 'Teacher' | 'Admin'>('Student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password || !schoolCode) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    try {
      // TODO: Replace with actual API call
      // const response = await loginUser({ username, password, schoolCode, role: selectedRole });
      
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
        // Navigate to main app
        navigation.replace('MainApp');
      }, 1500);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Login failed. Please check your credentials.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>🎓</Text>
              <Text style={styles.logoTitle}>EduLogix</Text>
              <Text style={styles.logoSubtitle}>EMPOWERING TECHNOLOGIES</Text>
            </View>
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome</Text>
            <Text style={styles.welcomeSubtitle}>Login in to your account</Text>
          </View>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                selectedRole === 'Student' && styles.roleButtonActive,
              ]}
              onPress={() => setSelectedRole('Student')}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  selectedRole === 'Student' && styles.roleButtonTextActive,
                ]}
              >
                Student
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                selectedRole === 'Teacher' && styles.roleButtonActive,
              ]}
              onPress={() => setSelectedRole('Teacher')}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  selectedRole === 'Teacher' && styles.roleButtonTextActive,
                ]}
              >
                Teacher
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                selectedRole === 'Admin' && styles.roleButtonActive,
              ]}
              onPress={() => setSelectedRole('Admin')}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  selectedRole === 'Admin' && styles.roleButtonTextActive,
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor="#93C5FD"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#93C5FD"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* School Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>School Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your school code"
                placeholderTextColor="#93C5FD"
                value={schoolCode}
                onChangeText={setSchoolCode}
                autoCapitalize="characters"
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F2FE',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 60,
    marginBottom: 10,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  logoSubtitle: {
    fontSize: 10,
    color: '#1E3A8A',
    letterSpacing: 2,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#60A5FA',
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#93C5FD',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#60A5FA',
    borderColor: '#60A5FA',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#93C5FD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1E3A8A',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#93C5FD',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1E3A8A',
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginButton: {
    backgroundColor: '#60A5FA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default LoginScreen;
