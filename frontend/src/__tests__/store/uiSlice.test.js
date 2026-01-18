/**
 * UI Slice Tests
 */

import uiReducer, {
  setScreen,
  addToast,
  removeToast,
  openModal,
  closeModal,
} from '../../store/slices/uiSlice';

describe('uiSlice', () => {
  const initialState = {
    currentScreen: 'home',
    toasts: [],
    modals: {
      isOpen: false,
      type: null,
      data: null,
    },
  };

  test('should return initial state', () => {
    expect(uiReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('setScreen', () => {
    test('should set current screen', () => {
      const state = uiReducer(initialState, setScreen('hall'));
      
      expect(state.currentScreen).toBe('hall');
    });

    test('should handle all valid screens', () => {
      const screens = ['home', 'hall', 'lobby', 'game'];
      
      screens.forEach(screen => {
        const state = uiReducer(initialState, setScreen(screen));
        expect(state.currentScreen).toBe(screen);
      });
    });
  });

  describe('addToast', () => {
    test('should add a toast notification', () => {
      const toast = {
        message: 'Success!',
        type: 'success',
      };
      
      const state = uiReducer(initialState, addToast(toast));
      
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].message).toBe('Success!');
      expect(state.toasts[0].type).toBe('success');
      expect(state.toasts[0].id).toBeDefined();
    });

    test('should add multiple toasts', () => {
      let state = uiReducer(initialState, addToast({ message: 'First', type: 'info' }));
      state = uiReducer(state, addToast({ message: 'Second', type: 'warning' }));
      
      expect(state.toasts).toHaveLength(2);
    });
  });

  describe('removeToast', () => {
    test('should remove a toast by id', () => {
      const state = uiReducer(initialState, addToast({ message: 'Test', type: 'info' }));
      const toastId = state.toasts[0].id;
      
      const newState = uiReducer(state, removeToast(toastId));
      
      expect(newState.toasts).toHaveLength(0);
    });

    test('should not affect other toasts', () => {
      let state = uiReducer(initialState, addToast({ message: 'First', type: 'info' }));
      const firstId = state.toasts[0].id;
      state = uiReducer(state, addToast({ message: 'Second', type: 'warning' }));
      
      const newState = uiReducer(state, removeToast(firstId));
      
      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0].message).toBe('Second');
    });
  });

  describe('openModal', () => {
    test('should open modal with type and data', () => {
      const state = uiReducer(initialState, openModal({ 
        type: 'confirm', 
        data: { title: 'Confirm Action' } 
      }));
      
      expect(state.modals.isOpen).toBe(true);
      expect(state.modals.type).toBe('confirm');
      expect(state.modals.data).toEqual({ title: 'Confirm Action' });
    });
  });

  describe('closeModal', () => {
    test('should close modal', () => {
      let state = uiReducer(initialState, openModal({ type: 'confirm' }));
      state = uiReducer(state, closeModal());
      
      expect(state.modals.isOpen).toBe(false);
      expect(state.modals.type).toBeNull();
      expect(state.modals.data).toBeNull();
    });
  });
});
