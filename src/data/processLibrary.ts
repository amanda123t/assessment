import { Macroprocess } from '@/types';
import libraryJson from './processLibrary.json';

// Type-safe loader for the JSON library.
// To expand the library, edit processLibrary.json only.
export const processLibrary: Macroprocess[] = libraryJson as Macroprocess[];
