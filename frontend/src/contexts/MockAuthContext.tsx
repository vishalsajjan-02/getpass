// Re-export everything from the real AuthContext so existing imports still compile.
export {
  AuthProvider as MockAuthProvider,
  useAuth as useMockAuth,
  useAuth,
  type User,
  type UserRole,
} from './AuthContext';
