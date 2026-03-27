// src/app/features/auth/pages/session-started/session-started.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthSessionService } from '../../services/auth-session.service';

@Component({
  selector: 'app-session-started',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-started.component.html',
  styleUrl: './session-started.component.scss',
})
export class SessionStartedComponent {
  private authSessionService = inject(AuthSessionService);

  get accessToken(): string | null {
    return this.authSessionService.getAccessToken();
  }

  get refreshToken(): string | null {
    return this.authSessionService.getRefreshToken();
  }
}