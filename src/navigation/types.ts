/**
 * Rotte dello stack. Rispecchiano quelle di react-router-dom nella webapp:
 *   "/"                              -> Login
 *   "/register"                      -> Register
 *   "/forgot-password"               -> ForgotPassword
 *   "/reset-password/:uid/:token"    -> ResetPassword
 *   "/home"                          -> Home
 *   "/lists/:id"                     -> ListDetail
 *   "/profile"                       -> Profile
 */
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { uid: string; token: string };
  Home: undefined;
  ListDetail: { listId: number };
  Profile: undefined;
};
