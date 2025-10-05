import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
} from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { last } from 'rxjs';

interface Problem {
  id: string;
  rememberedCount?: number;
  forgotCount?: number;
  lastReviewedAt?: string;
  code?: string;
  difficulty?: string;
  title?: string;
  url?: string;
  description?: string;
  solution?: string;
  tags?: string[];
  // Add any other fields as necessary
  weight?: number; // For weighted random selection
  [key: string]: any;
}

@Component({
  selector: 'app-review',
  imports: [CommonModule],
  templateUrl: './review.component.html',
  styleUrl: './review.component.scss',
})
export class ReviewComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  problem: Problem | null = null;
  showSolution = false;
  loading = true;
  user = this.auth.getCurrentUser();

  toggleSolution() {
    this.showSolution = !this.showSolution;
  }

  async ngOnInit() {
    if (!this.user) return;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadProblemById(id);
    } else {
      await this.loadWeightedRandomProblem();
    }
  }

  private async loadProblemById(id: string) {
    const docRef = doc(
      this.firestore,
      `users/${this.user?.uid}/problems/${id}`
    );
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      this.problem = { id: snap.id, ...snap.data() };
      this.problem.description = this.formatDescription(
        this.problem.description || ''
      );
    } else {
      console.error('No such document!');
      this.router.navigate(['/dashboard']);
    }

    this.loading = false;
  }

  private async loadRandomProblem() {
    const colRef = collection(
      this.firestore,
      `users/${this.user?.uid}/problems`
    );
    const snapshot = await getDocs(colRef);
    const problems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (problems.length === 0) {
      console.error('No questions saved yet');
      this.router.navigate(['/dashboard']);
      return;
    }

    const randomIdx = Math.floor(Math.random() * problems.length);
    this.problem = problems[randomIdx];
    this.loading = false;
  }

  private async loadWeightedRandomProblem() {
    if (!this.user) return;

    const colRef = collection(
      this.firestore,
      `users/${this.user.uid}/problems`
    );

    const q = query(colRef, orderBy('lastReviewedAt', 'asc'), limit(20));
    const snapshot = await getDocs(q);
    const problems: Problem[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (problems.length === 0) {
      console.error('No questions saved yet');
      this.router.navigate(['/dashboard']);
      return;
    }

    // Calculate weights based on forgotten count and last reviewed time
    const now = new Date().getTime();
    const weightedProblems = problems.map((problem) => {
      const forgotCount = problem.forgotCount || 0;
      const rememberedCount = problem.rememberedCount || 0;
      const lastReviewedAt = problem.lastReviewedAt
        ? new Date(problem.lastReviewedAt).getTime()
        : 0;
      const timeSinceLastReview = now - lastReviewedAt;

      // Weight formula: more weight for higher forgot count and longer time since last review
      const weight =
        ((forgotCount + 1) * (timeSinceLastReview + 1)) / (rememberedCount + 1);
      return { ...problem, weight };
    });

    // Select a problem based on weights
    const totalWeight = weightedProblems.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const problem of weightedProblems) {
      if (rand < problem.weight) {
        this.problem = problem;
        this.problem.description = this.formatDescription(
          this.problem.description || ''
        );
        break;
      }
      rand -= problem.weight;
    }
    this.loading = false;
  }

  async markForgot() {
    if (!this.problem || !this.user) return;
    await this.handleFeedback(false);
  }

  async markRemembered() {
    if (!this.problem || !this.user) return;
    await this.handleFeedback(true);
  }

  private async updateRecallStats(remembered: boolean) {
    if (!this.problem || !this.user) return;

    const ref = doc(
      this.firestore,
      `users/${this.user.uid}/problems/${this.problem.id}`
    );
    const updates: any = {
      lastReviewedAt: new Date().toISOString(),
    };

    if (remembered) {
      updates.rememberedCount = (this.problem.rememberedCount || 0) + 1;
    } else {
      updates.forgotCount = (this.problem.forgotCount || 0) + 1;
    }

    await updateDoc(ref, updates);
    await this.loadWeightedRandomProblem();
  }

  private async handleFeedback(remembered: boolean) {
    if (!this.problem) return;
    if (!this.user) return;

    const ref = doc(
      this.firestore,
      `users/${this.user.uid}/problems/${this.problem.id}`
    );
    const updates: any = { lastReviewedAt: new Date().toISOString() };
    if (remembered)
      updates.rememberedCount = (this.problem.rememberedCount || 0) + 1;
    else updates.forgotCount = (this.problem.forgotCount || 0) + 1;

    await updateDoc(ref, updates);
  
    const cardEl = document.querySelector('.problem-card');
    cardEl?.classList.add('fade-out');

    setTimeout(async () => {
      await this.loadWeightedRandomProblem();
      cardEl?.classList.remove('fade-out');
      cardEl?.classList.add('fade-in');
      setTimeout(() => cardEl?.classList.remove('fade-in'), 200);
      scrollTo(0, 0); // Scroll to top after loading new problem
    }, 200);
  }

  private formatDescription(desc: string): string {
    if (!desc) return '';

    return desc
      .replace(/\n\s*\n/g, '<br><br>')
      .replace(/\n/g, '<br>') // single newline → <br>
      .replace(/(Example\s*\d*:)/g, '<br><strong>$1</strong>') // highlight "Example"
      .replace(
        /(Input:|Output:|Explanation:|Constraints:)/g,
        '<strong>$1</strong>'
      )
      .replace(
        /\[(https?:\/\/[^\]]+\.(?:png|jpg|jpeg|gif))\]/g,
        '<img src="$1" alt="Problem illustration" class="problem-img" style="max-width: 100%; border-radius: 8px; margin: 12px 0; display: block;" />'
      );
  }
}
