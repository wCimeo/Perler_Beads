import { useReducer, useCallback } from 'react';
import type { AppView, SizeOption, ConvertResponse } from '../types/index.js';
import { DEFAULT_MAX_SIZE } from '../utils/constants.js';

export type { AppView, SizeOption };

export interface AppState {
  view: AppView;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  selectedMode: string;
  colorFile: string;
  selectedSize: SizeOption;
  maxSize: number;
  tolerance: number;
  numColors: number;
  result: ConvertResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: AppState = {
  view: 'form',
  imageFile: null,
  imagePreviewUrl: null,
  selectedMode: 'mard',
  colorFile: '221',
  selectedSize: 52,
  maxSize: DEFAULT_MAX_SIZE,
  tolerance: 0,
  numColors: 0,
  result: null,
  loading: false,
  error: null,
};

type Action =
  | { type: 'SET_IMAGE'; file: File; previewUrl: string }
  | { type: 'SET_MODE'; mode: string }
  | { type: 'SET_COLOR_FILE'; colorFile: string }
  | { type: 'SET_SIZE'; size: SizeOption }
  | { type: 'SET_MAX_SIZE'; maxSize: number }
  | { type: 'SET_TOLERANCE'; tolerance: number }
  | { type: 'SET_NUM_COLORS'; numColors: number }
  | { type: 'CONVERT_START' }
  | { type: 'CONVERT_SUCCESS'; result: ConvertResponse }
  | { type: 'CONVERT_ERROR'; error: string }
  | { type: 'GO_TO_FORM' }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_IMAGE':
      return {
        ...state,
        imageFile: action.file,
        imagePreviewUrl: action.previewUrl,
        error: null,
      };
    case 'SET_MODE':
      return { ...state, selectedMode: action.mode };
    case 'SET_COLOR_FILE':
      return { ...state, colorFile: action.colorFile };
    case 'SET_SIZE':
      return { ...state, selectedSize: action.size };
    case 'SET_MAX_SIZE':
      return { ...state, maxSize: action.maxSize };
    case 'SET_TOLERANCE':
      return { ...state, tolerance: action.tolerance };
    case 'SET_NUM_COLORS':
      return { ...state, numColors: action.numColors };
    case 'CONVERT_START':
      return { ...state, loading: true, error: null };
    case 'CONVERT_SUCCESS':
      return {
        ...state,
        loading: false,
        result: action.result,
        view: 'preview',
      };
    case 'CONVERT_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'GO_TO_FORM':
      return {
        ...state,
        view: 'form',
        result: null,
        error: null,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setImage = useCallback((file: File, previewUrl: string) => {
    dispatch({ type: 'SET_IMAGE', file, previewUrl });
  }, []);

  const setMode = useCallback((mode: string) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  const setColorFile = useCallback((colorFile: string) => {
    dispatch({ type: 'SET_COLOR_FILE', colorFile });
  }, []);

  const setSize = useCallback((size: SizeOption) => {
    dispatch({ type: 'SET_SIZE', size });
  }, []);

  const setMaxSize = useCallback((maxSize: number) => {
    dispatch({ type: 'SET_MAX_SIZE', maxSize });
  }, []);

  const setTolerance = useCallback((tolerance: number) => {
    dispatch({ type: 'SET_TOLERANCE', tolerance });
  }, []);

  const setNumColors = useCallback((numColors: number) => {
    dispatch({ type: 'SET_NUM_COLORS', numColors });
  }, []);

  const startConvert = useCallback(() => {
    dispatch({ type: 'CONVERT_START' });
  }, []);

  const convertSuccess = useCallback((result: ConvertResponse) => {
    dispatch({ type: 'CONVERT_SUCCESS', result });
  }, []);

  const convertError = useCallback((error: string) => {
    dispatch({ type: 'CONVERT_ERROR', error });
  }, []);

  const goToForm = useCallback(() => {
    dispatch({ type: 'GO_TO_FORM' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    setImage,
    setMode,
    setColorFile,
    setSize,
    setMaxSize,
    setTolerance,
    setNumColors,
    startConvert,
    convertSuccess,
    convertError,
    goToForm,
    reset,
  };
}
