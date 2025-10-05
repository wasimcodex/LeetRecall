// src/app/dashboard/dashboard.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { collection, Firestore, limit, orderBy, query, collectionData, startAfter, getDocs } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true, // Make sure standalone is true
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'] // Use styleUrls (plural)
})
export class DashboardComponent implements OnInit {
  // Use inject() for cleaner dependency injection
  private auth = inject(AuthService);
  private firestore = inject(Firestore);

  // This is the only stream you need to expose
  problems: any[] = [];
  loading = false;
  noMore = false;
  pageSize = 10;
  lastVisible: any = null;
  user$ = this.auth.user$;

  async ngOnInit() {
    await this.loadProblems();
  }

  async loadProblems() {
    if (this.noMore || this.loading) return;
    this.loading = true;

    const user = this.auth.getCurrentUser();
    if (!user) return;

    const problemsRef = collection(this.firestore, `users/${user.uid}/problems`);
    let q = query(problemsRef, orderBy('savedAt', 'desc'), limit(this.pageSize));

    if (this.lastVisible) {
      q = query(problemsRef, orderBy('savedAt', 'desc'), startAfter(this.lastVisible), limit(this.pageSize));
    }

    const snapshot = await getDocs(q);
    const newProblems = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));

    if (newProblems.length > 0)
    {
      this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
      this.problems.push(...newProblems);
    }
    else
    {
      this.noMore = true
    }

    this.loading = false;

  }

  signOut() {
    this.auth.signOutUser();
  }
}