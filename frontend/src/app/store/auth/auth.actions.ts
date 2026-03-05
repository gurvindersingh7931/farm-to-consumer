import { createAction, props } from '@ngrx/store';
import { User } from '../../services/auth.service';

export const setUser = createAction(
  '[Auth] Set User',
  props<{ user: User }>()
);

export const clearUser = createAction('[Auth] Clear User');

