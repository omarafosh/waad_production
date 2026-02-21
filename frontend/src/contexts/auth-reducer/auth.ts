// action - state management
import { REGISTER, LOGIN, LOGOUT } from './actions';

export interface AuthState {
  isLoggedIn: boolean;
  isInitialized: boolean;
  user: any | null;
  roles: string[];
  permissions: string[];
}

export interface AuthAction {
  type: string;
  payload?: {
    user?: any;
    roles?: string[];
    permissions?: string[];
  };
}

// initial state
const initialState: AuthState = {
  isLoggedIn: false,
  isInitialized: false,
  user: null,
  roles: [],
  permissions: []
};

// ==============================|| AUTH REDUCER ||============================== //

const auth = (state: AuthState = initialState, action: AuthAction): AuthState => {
  switch (action.type) {
    case REGISTER: {
      const { user, roles = [], permissions = [] } = action.payload || {};
      return {
        ...state,
        user,
        roles,
        permissions
      };
    }
    case LOGIN: {
      const { user, roles = [], permissions = [] } = action.payload || {};
      return {
        ...state,
        isLoggedIn: true,
        isInitialized: true,
        user,
        roles,
        permissions
      };
    }
    case LOGOUT: {
      return {
        ...state,
        isInitialized: true,
        isLoggedIn: false,
        user: null,
        roles: [],
        permissions: []
      };
    }
    default: {
      return { ...state };
    }
  }
};

export default auth;
