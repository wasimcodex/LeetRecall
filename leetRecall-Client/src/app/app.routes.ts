import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { ReviewComponent } from './components/review/review.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'review',
    component: ReviewComponent,
    canActivate: [authGuard],
  },
  {
    path: 'review/:id',
    component: ReviewComponent,
    canActivate: [authGuard]
  }
];
