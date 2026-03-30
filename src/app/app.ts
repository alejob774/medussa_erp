import { Component } from '@angular/core';
import { LoginPageComponent } from './features/auth/pages/login-page/login-page.component';

@Component({
  selector: 'app-root',
  imports: [LoginPageComponent],
  template: `<app-login-page />`,
})
export class App {}