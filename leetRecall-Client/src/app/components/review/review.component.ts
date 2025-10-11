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
  where,
} from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

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
  weight?: number; // For weighted random selection
  confidenceScore?: number;
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

  private async loadWeightedRandomProblem() {
    if (!this.user) return;

    this.loading = true;

    const colRef = collection(
      this.firestore,
      `users/${this.user.uid}/problems`
    );

    const q = query(
      colRef,
      where('nextReviewAt', '<=', new Date().toISOString()),
      orderBy('nextReviewAt', 'asc'),
      limit(50)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn("No problems due for reveiw.")
      this.loading = false;
      this.router.navigate(['/dashboard']);
      return;
    }

    const problems: Problem[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Problem[];

    const now = new Date().getTime();

    const weightedProblems = problems.map(problem => {
      const confidence = problem.confidenceScore ?? 0.5;
      const lastReviewedAt = problem.lastReviewedAt ? new Date(problem.lastReviewedAt).getTime() : 0;

      const daysSinceLast = (now - lastReviewedAt) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.exp(daysSinceLast / 7);
      const randomness = Math.random() * 0.3 + 0.85;

      const weight = (1 - confidence) * recencyBoost * randomness;

      return {...problem, weight};
    })

    const totalWeight = weightedProblems.reduce((sum, p) => sum + p.weight, 0)
    let rand = Math.random() * totalWeight;

    let selected: Problem | null = null;
    for (const p of weightedProblems) {
      if (rand < p.weight) {
        selected = p;
        break;
      }
      rand -= p.weight;
    }

    if (!selected) {
      console.error("Weighted selection failed - defaulting to first problem.")
      selected = weightedProblems[0];
    }

    this.problem = {
      ...selected,
      description: this.formatDescription(selected.description || '')
    };

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

  private computeConfidence(remembered: boolean): number {
    if (!this.problem) return 0;

    let rememberedCount = this.problem.rememberedCount ?? 0;
    let forgotCount = this.problem.forgotCount ?? 0;
    if (remembered) rememberedCount += 1;
    else forgotCount += 1;
    const lastReviewedAt =
      this.problem.lastReviewedAt ?? new Date().toISOString();

    const total = rememberedCount + forgotCount + 1;
    const performance = (rememberedCount - forgotCount) / total;
    const daysSinceLastReview =
      (Date.now() - new Date(lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24);
    const decay = Math.exp(-daysSinceLastReview / 10);

    // sigmoid scales between 0–1 smoothly
    const sigmoid = 1 / (1 + Math.exp(-performance * 3));

    return Math.min(1, Math.max(0, sigmoid * decay));
  }

  private async handleFeedback(remembered: boolean) {
    if (!this.problem) return;
    if (!this.user) return;

    const ref = doc(
      this.firestore,
      `users/${this.user.uid}/problems/${this.problem.id}`
    );

    const confidenceScore = this.computeConfidence(remembered);

    const baseInterval = 1;
    const multiplier = 1 + confidenceScore * 4;
    const nextReviewAt = new Date(new Date().getTime() + baseInterval * multiplier * 24 * 60 * 60 * 1000);
    const updates: any = {
      lastReviewedAt: new Date().toISOString(),
      confidenceScore,
      nextReviewAt: nextReviewAt.toISOString()
    };

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
