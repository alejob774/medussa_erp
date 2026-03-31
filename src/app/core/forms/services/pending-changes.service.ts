import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface PendingChangesState {
  isDirty: boolean;
  message: string;
}

const DEFAULT_MESSAGE =
  'Tienes cambios sin guardar. Si continúas, se descartarán. ¿Deseas seguir?';

@Injectable({
  providedIn: 'root',
})
export class PendingChangesService {
  private readonly stateSubject = new BehaviorSubject<PendingChangesState>({
    isDirty: false,
    message: DEFAULT_MESSAGE,
  });

  readonly state$ = this.stateSubject.asObservable();

  setDirty(isDirty: boolean, message: string = DEFAULT_MESSAGE): void {
    this.stateSubject.next({ isDirty, message });
  }

  clear(): void {
    this.stateSubject.next({
      isDirty: false,
      message: DEFAULT_MESSAGE,
    });
  }

  hasPendingChanges(): boolean {
    return this.stateSubject.value.isDirty;
  }

  confirmDiscard(customMessage?: string): boolean {
    if (!this.hasPendingChanges()) {
      return true;
    }

    if (typeof window === 'undefined') {
      this.clear();
      return true;
    }

    const confirmed = window.confirm(
      customMessage ?? this.stateSubject.value.message,
    );

    if (confirmed) {
      this.clear();
    }

    return confirmed;
  }
}
