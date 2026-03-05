import { createReducer, on } from '@ngrx/store';
import { setUser, clearUser } from './auth.actions';
import { User } from '../../services/auth.service';

export interface AuthState {
  user: User | null;
}

export const initialAuthState: AuthState = {
  user: null
};

export const authReducer = createReducer(
  initialAuthState,
  on(setUser, (state, { user }) => ({ ...state, user })),
  on(clearUser, state => ({ ...state, user: null }))
);

