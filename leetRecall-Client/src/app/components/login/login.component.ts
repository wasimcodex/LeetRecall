import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  user$: typeof this.auth.user$;
  loading$: typeof this.auth.loading$;

  constructor(private auth: AuthService, private router: Router) {
    this.user$ = this.auth.user$;
    this.loading$ = this.auth.loading$;
    this.user$.subscribe((user) => {
      if (user) this.router.navigate(['/dashboard']);
    });
  }

  signInWithGoogle() {
    this.auth.signInWithGoogle();
  }

  signOut() {
    this.auth.signOutUser();
  }
}
