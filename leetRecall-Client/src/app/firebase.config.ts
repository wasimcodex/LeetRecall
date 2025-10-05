import {initializeApp} from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth";
import { environment } from "../environments/env";

const app = initializeApp(environment.firebase);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
