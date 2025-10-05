import { Injectable } from "@angular/core";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { auth, provider } from "../firebase.config";
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private userSubject: BehaviorSubject<User | null>;
  public user$: Observable<User | null>;
  public loading$: BehaviorSubject<boolean>;

  constructor() {
    this.userSubject = new BehaviorSubject<User | null>(null);
    this.user$ = this.userSubject.asObservable();
    this.loading$ = new BehaviorSubject<boolean>(true);

    onAuthStateChanged(auth, (user) => {
      this.userSubject.next(user);
      this.loading$.next(false);
    });
  }

  async signInWithGoogle(): Promise<void> {
    try {
      const result = await signInWithPopup(auth, provider);
      this.userSubject.next(result.user);
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  }

  async signOutUser(): Promise<void> {
    try {
      await signOut(auth);
      this.userSubject.next(null);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }
}