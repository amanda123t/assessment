/**
 * Reducer + state for assessment/page.tsx.
 *
 * FullAssessmentState merges the previous AssessmentState with all the
 * individual useState fields that lived in the page component.
 * AssessmentAction covers every state transition in the flow.
 */

import {
  SubprocessAssessment,
  SelectedSubprocessItem, CustomArea,
  Macroprocess, Process, Subprocess,
} from '@/types';
import {
  addAssessment, advanceIndex, isAssessmentComplete,
} from '@/lib/assessmentEngine';

// ── Constants ─────────────────────────────────────────────────────────────────

export const MAX_CUSTOM = 10;

// ── State ─────────────────────────────────────────────────────────────────────

export interface FullAssessmentState {
  // Assessment flow
  globalSelectedSubprocesses: SelectedSubprocessItem[];
  assessments:                SubprocessAssessment[];
  currentSubprocessIndex:     number;
  step:                       'start' | 'explore' | 'questionnaire' | 'ranking';
  industry:                   string | null;

  // Identification
  company: string;
  email:   string;

  // Resume / continue
  answeredSubprocessIds: string[];
  continueError:         string | null;
  isContinuing:          boolean;
  showResumeModal:       boolean;
  resumeLink:            string;
  linkCopied:            boolean;

  // Group mode
  mode:            'individual' | 'group';
  shareLink:       string;
  showShareModal:  boolean;
  shareLinkCopied: boolean;

  // Custom areas
  customAreas: CustomArea[];
}

export const INITIAL_FULL_STATE: FullAssessmentState = {
  globalSelectedSubprocesses: [],
  assessments:                [],
  currentSubprocessIndex:     0,
  step:                       'start',
  industry:                   null,
  company:                    '',
  email:                      '',
  answeredSubprocessIds:      [],
  continueError:              null,
  isContinuing:               false,
  showResumeModal:            false,
  resumeLink:                 '',
  linkCopied:                 false,
  mode:                       'individual',
  shareLink:                  '',
  showShareModal:             false,
  shareLinkCopied:            false,
  customAreas:                [],
};

// ── Actions ───────────────────────────────────────────────────────────────────

export type AssessmentAction =
  | { type: 'SET_STEP';     payload: FullAssessmentState['step'] }
  | { type: 'SET_COMPANY';  payload: string }
  | { type: 'SET_EMAIL';    payload: string }
  | { type: 'SET_INDUSTRY'; payload: string | null }

  | { type: 'TOGGLE_SUBPROCESS';
      payload: { subprocess: Subprocess; macroprocess: Macroprocess; process: Process } }
  | { type: 'TOGGLE_ALL_IN_PROCESS';
      payload: { subprocesses: Subprocess[]; macroprocess: Macroprocess; process: Process; selectAll: boolean } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'ADD_CUSTOM_SUBPROCESS';    payload: SelectedSubprocessItem }
  | { type: 'REMOVE_CUSTOM_SUBPROCESS'; payload: string }

  | { type: 'START_EVALUATION' }
  | { type: 'COMPLETE_QUESTIONNAIRE'; payload: SubprocessAssessment }
  | { type: 'GO_BACK_IN_QUESTIONNAIRE' }

  | { type: 'SET_MODE';           payload: 'individual' | 'group' }
  | { type: 'SET_SHARE_LINK';     payload: string }
  | { type: 'TOGGLE_SHARE_MODAL'; payload: boolean }
  | { type: 'TOGGLE_RESUME_MODAL'; payload: boolean }
  | { type: 'SET_RESUME_LINK';    payload: string }
  | { type: 'SET_LINK_COPIED';    payload: boolean }
  | { type: 'SET_SHARE_LINK_COPIED'; payload: boolean }

  | { type: 'SET_ANSWERED_IDS';  payload: string[] }
  | { type: 'SET_CUSTOM_AREAS';  payload: CustomArea[] }
  | { type: 'SET_CONTINUE_ERROR'; payload: string | null }
  | { type: 'SET_IS_CONTINUING';  payload: boolean }

  // Compound actions that update multiple fields atomically
  | { type: 'GROUP_DIAGNOSTIC_CREATED'; payload: { link: string } }
  | { type: 'LOAD_DIAGNOSTIC_SUCCESS';  payload: { company: string } }

  | { type: 'RESTART' };

// ── Reducer ───────────────────────────────────────────────────────────────────

export function assessmentReducer(
  state:  FullAssessmentState,
  action: AssessmentAction,
): FullAssessmentState {
  switch (action.type) {

    // ── Identification ───────────────────────────────────────────────────────
    case 'SET_STEP':     return { ...state, step: action.payload };
    case 'SET_COMPANY':  return { ...state, company:  action.payload };
    case 'SET_EMAIL':    return { ...state, email:    action.payload };
    case 'SET_INDUSTRY': return { ...state, industry: action.payload };

    // ── Subprocess selection ─────────────────────────────────────────────────
    case 'TOGGLE_SUBPROCESS': {
      const { subprocess, macroprocess, process } = action.payload;
      const exists = state.globalSelectedSubprocesses.some(
        item => item.subprocess.id === subprocess.id,
      );
      if (exists) {
        return {
          ...state,
          globalSelectedSubprocesses: state.globalSelectedSubprocesses.filter(
            item => item.subprocess.id !== subprocess.id,
          ),
        };
      }
      return {
        ...state,
        globalSelectedSubprocesses: [
          ...state.globalSelectedSubprocesses,
          { macroprocess, process, subprocess },
        ],
      };
    }

    case 'TOGGLE_ALL_IN_PROCESS': {
      const { subprocesses, macroprocess, process, selectAll } = action.payload;
      if (selectAll) {
        const existingIds = new Set(
          state.globalSelectedSubprocesses.map(i => i.subprocess.id),
        );
        const toAdd: SelectedSubprocessItem[] = subprocesses
          .filter(sp => !existingIds.has(sp.id))
          .map(sp => ({ macroprocess, process, subprocess: sp }));
        return {
          ...state,
          globalSelectedSubprocesses: [...state.globalSelectedSubprocesses, ...toAdd],
        };
      }
      const idsToRemove = new Set(subprocesses.map(sp => sp.id));
      return {
        ...state,
        globalSelectedSubprocesses: state.globalSelectedSubprocesses.filter(
          item => !idsToRemove.has(item.subprocess.id),
        ),
      };
    }

    case 'CLEAR_SELECTION':
      return { ...state, globalSelectedSubprocesses: [] };

    case 'ADD_CUSTOM_SUBPROCESS': {
      const customCount = state.globalSelectedSubprocesses.filter(i => i.isCustom).length;
      if (customCount >= MAX_CUSTOM) return state;
      return {
        ...state,
        globalSelectedSubprocesses: [...state.globalSelectedSubprocesses, action.payload],
      };
    }

    case 'REMOVE_CUSTOM_SUBPROCESS':
      return {
        ...state,
        globalSelectedSubprocesses: state.globalSelectedSubprocesses.filter(
          i => i.subprocess.id !== action.payload,
        ),
      };

    // ── Evaluation flow ──────────────────────────────────────────────────────
    case 'START_EVALUATION':
      return { ...state, currentSubprocessIndex: 0, step: 'questionnaire' };

    case 'COMPLETE_QUESTIONNAIRE': {
      const assessment = action.payload;

      // Guard: ignore duplicate dispatches for the same subprocess.
      const alreadyAssessed = state.assessments.some(
        (a) => a.subprocessId === assessment.subprocessId,
      );
      if (alreadyAssessed) {
        console.warn('[Reducer] Duplicate COMPLETE_QUESTIONNAIRE for', assessment.subprocessId, '— ignoring');
        return state;
      }

      const updatedAssessments = addAssessment(state.assessments, assessment);
      const subprocesses = state.globalSelectedSubprocesses.map((i) => i.subprocess);
      const done = isAssessmentComplete(subprocesses, state.currentSubprocessIndex);

      console.log('[Reducer] COMPLETE_QUESTIONNAIRE', {
        subprocessId: assessment.subprocessId,
        currentIndex: state.currentSubprocessIndex,
        totalSelected: subprocesses.length,
        done,
        nextIndex: done ? state.currentSubprocessIndex : advanceIndex(state.currentSubprocessIndex),
        nextStep: done ? 'ranking' : 'questionnaire',
      });

      return {
        ...state,
        assessments:            updatedAssessments,
        currentSubprocessIndex: done ? state.currentSubprocessIndex : advanceIndex(state.currentSubprocessIndex),
        step:                   done ? 'ranking' : 'questionnaire',
      };
    }

    case 'GO_BACK_IN_QUESTIONNAIRE':
      if (state.currentSubprocessIndex === 0) {
        return { ...state, step: 'explore' };
      }
      return { ...state, currentSubprocessIndex: state.currentSubprocessIndex - 1 };

    // ── Modals / UI flags ────────────────────────────────────────────────────
    case 'SET_MODE':            return { ...state, mode:            action.payload };
    case 'SET_SHARE_LINK':      return { ...state, shareLink:       action.payload };
    case 'TOGGLE_SHARE_MODAL':  return { ...state, showShareModal:  action.payload };
    case 'TOGGLE_RESUME_MODAL': return { ...state, showResumeModal: action.payload };
    case 'SET_RESUME_LINK':     return { ...state, resumeLink:      action.payload };
    case 'SET_LINK_COPIED':     return { ...state, linkCopied:      action.payload };
    case 'SET_SHARE_LINK_COPIED': return { ...state, shareLinkCopied: action.payload };

    // ── Async helpers ────────────────────────────────────────────────────────
    case 'SET_ANSWERED_IDS':   return { ...state, answeredSubprocessIds: action.payload };
    case 'SET_CUSTOM_AREAS':   return { ...state, customAreas:          action.payload };
    case 'SET_CONTINUE_ERROR': return { ...state, continueError:         action.payload };
    case 'SET_IS_CONTINUING':  return { ...state, isContinuing:          action.payload };

    // ── Compound transitions ─────────────────────────────────────────────────
    case 'GROUP_DIAGNOSTIC_CREATED':
      return {
        ...state,
        mode:           'group',
        shareLink:      action.payload.link,
        showShareModal: true,
        step:           'explore',
      };

    case 'LOAD_DIAGNOSTIC_SUCCESS':
      return {
        ...state,
        company: action.payload.company,
        step:    'explore',
      };

    case 'RESTART':
      return { ...INITIAL_FULL_STATE };

    default:
      return state;
  }
}
