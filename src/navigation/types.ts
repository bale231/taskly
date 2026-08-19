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
  /**
   * `todosCount` è opzionale: la Home lo passa (già conosce `list.todos.length`
   * dalla lista appena caricata) per dimensionare correttamente lo skeleton
   * di caricamento; senza (es. deep link diretto) si usa un default.
   */
  ListDetail: { listId: number; todosCount?: number };
  Profile: undefined;
  FindUsers: undefined;
  FriendRequests: undefined;
  Friends: undefined;
};
