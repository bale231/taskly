import { getStateFromPath, NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import FindUsersScreen from "../screens/FindUsersScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import FriendRequestsScreen from "../screens/FriendRequestsScreen";
import FriendsScreen from "../screens/FriendsScreen";
import HomeScreen from "../screens/HomeScreen";
import ListDetailScreen from "../screens/ListDetailScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Il link di reset password arriva per email e nella webapp puntava a
 * /reset-password/:uid/:token. Qui lo stesso path apre l'app via
 * taskly://reset-password/:uid/:token.
 *
 * Il link di verifica email (taskly://verify-email/:uid/:token) invece non
 * ha una sua schermata: naviga a Login stesso con `verifyEmail: {uid,
 * token}`, che chiama l'API di verifica e mostra l'esito in una modale
 * sopra il login — niente schermata intermedia da attraversare.
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL("/"), "taskly://"],
  config: {
    screens: {
      Login: "login",
      Register: "register",
      ForgotPassword: "forgot-password",
      ResetPassword: "reset-password/:uid/:token",
      Home: "home",
      ListDetail: "lists/:listId",
      Profile: "profile",
      FindUsers: "find-users",
      FriendRequests: "friend-requests",
      Friends: "friends",
    },
  },
  getStateFromPath: (path, options) => {
    const match = path.match(/^\/?verify-email\/([^/]+)\/([^/]+)\/?$/);
    if (match) {
      const [, uid, token] = match;
      return {
        routes: [{ name: "Login", params: { verifyEmail: { uid, token } } }],
      };
    }
    return getStateFromPath(path, options);
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ListDetail" component={ListDetailScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="FindUsers" component={FindUsersScreen} />
        <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} />
        <Stack.Screen name="Friends" component={FriendsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
