import { NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Il link di reset password arriva per email e nella webapp puntava a
 * /reset-password/:uid/:token. Qui lo stesso path apre l'app via
 * taskly://reset-password/:uid/:token.
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
    },
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
