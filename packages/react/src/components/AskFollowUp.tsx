/**
 * AskFollowUp - Interactive stepper component for agent follow-up questions
 *
 * This tool allows agents to ask a series of questions to the user.
 * Questions are rendered as a stepper, one at a time.
 * User answers are collected and sent back to the agent.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DistriUiTool, UiToolProps } from '../types';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface FollowUpQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multiselect' | 'boolean';
  options?: string[];
  placeholder?: string;
  required?: boolean;
  default?: string | string[] | boolean;
}

export interface AskFollowUpInput {
  title?: string;
  description?: string;
  questions: FollowUpQuestion[];
}

export interface AskFollowUpOutput {
  answers: Record<string, string | string[] | boolean>;
  completed: boolean;
}

// ============================================================================
// Styling Types
// ============================================================================

export interface AskFollowUpClassNames {
  /** Root container */
  root?: string;
  /** Header section with title/description */
  header?: string;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Progress bar container */
  progressContainer?: string;
  /** Individual progress segment */
  progressSegment?: string;
  /** Progress segment when completed */
  progressSegmentCompleted?: string;
  /** Progress segment when active */
  progressSegmentActive?: string;
  /** Progress segment when pending */
  progressSegmentPending?: string;
  /** Progress text (e.g., "Question 1 of 3") */
  progressText?: string;
  /** Question container */
  questionContainer?: string;
  /** Question label */
  questionLabel?: string;
  /** Required indicator */
  requiredIndicator?: string;
  /** Text input field */
  textInput?: string;
  /** Option button (for select/multiselect) */
  optionButton?: string;
  /** Option button when selected */
  optionButtonSelected?: string;
  /** Checkbox in multiselect */
  checkbox?: string;
  /** Checkbox when checked */
  checkboxChecked?: string;
  /** Boolean button container */
  booleanContainer?: string;
  /** Boolean button */
  booleanButton?: string;
  /** Boolean button when selected */
  booleanButtonSelected?: string;
  /** Actions container (Back/Skip/Next buttons) */
  actionsContainer?: string;
  /** Back button */
  backButton?: string;
  /** Back button when disabled */
  backButtonDisabled?: string;
  /** Skip button */
  skipButton?: string;
  /** Next/Submit button */
  nextButton?: string;
  /** Next button when disabled */
  nextButtonDisabled?: string;
  /** Completed state container */
  completedContainer?: string;
  /** Completed icon */
  completedIcon?: string;
  /** Completed text */
  completedText?: string;
  /** Answer summary item */
  answerItem?: string;
  /** Answer question text */
  answerQuestion?: string;
  /** Answer value text */
  answerValue?: string;
}

// Global classNames configuration
let globalClassNames: AskFollowUpClassNames = {};

/**
 * Configure global classNames for all AskFollowUp instances
 */
export function configureAskFollowUpStyles(classNames: AskFollowUpClassNames) {
  globalClassNames = classNames;
}

// ============================================================================
// Tool Definition
// ============================================================================

export const ASK_FOLLOW_UP_TOOL_NAME = 'ask_follow_up';

export function createAskFollowUpTool(): DistriUiTool {
  return {
    type: 'ui',
    name: ASK_FOLLOW_UP_TOOL_NAME,
    description: 'Ask the user a series of follow-up questions to gather more information. Questions are shown one at a time in a stepper format.',
    isExternal: false,
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Optional title for the question series',
        },
        description: {
          type: 'string',
          description: 'Optional description explaining why these questions are being asked',
        },
        questions: {
          type: 'array',
          description: 'Array of questions to ask',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique identifier for the question (used as key in answers)',
              },
              question: {
                type: 'string',
                description: 'The question text to display',
              },
              type: {
                type: 'string',
                enum: ['text', 'select', 'multiselect', 'boolean'],
                description: 'Type of input: text for free-form, select for single choice, multiselect for multiple choices, boolean for yes/no',
              },
              options: {
                type: 'array',
                items: { type: 'string' },
                description: 'Options for select/multiselect types',
              },
              placeholder: {
                type: 'string',
                description: 'Placeholder text for text inputs',
              },
              required: {
                type: 'boolean',
                description: 'Whether this question must be answered',
              },
              default: {
                description: 'Default value for the question',
              },
            },
            required: ['id', 'question', 'type'],
          },
        },
      },
      required: ['questions'],
    },
    component: AskFollowUpComponent,
  };
}

// ============================================================================
// Component
// ============================================================================

function AskFollowUpComponent({
  toolCall,
  toolCallState,
  completeTool,
}: UiToolProps): React.ReactNode {
  const input = toolCall.input as AskFollowUpInput;
  const questions = useMemo(() => input?.questions || [], [input?.questions]);
  const hasQuestions = questions.length > 0;
  const styles = globalClassNames;

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | boolean>>(() => {
    // Initialize with defaults
    const defaults: Record<string, string | string[] | boolean> = {};
    questions.forEach((q) => {
      if (q.default !== undefined) {
        defaults[q.id] = q.default;
      } else if (q.type === 'multiselect') {
        defaults[q.id] = [];
      } else if (q.type === 'boolean') {
        defaults[q.id] = false;
      } else {
        defaults[q.id] = '';
      }
    });
    return defaults;
  });
  // Track which questions have "Other" selected (for custom text input)
  const [otherSelected, setOtherSelected] = useState<Record<string, boolean>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});

  const currentQuestion = hasQuestions ? questions[currentStep] : null;
  const isLastStep = currentStep === questions.length - 1;
  const isCompleted = toolCallState?.status === 'completed';

  // Handle empty questions case - complete immediately
  useEffect(() => {
    if (!hasQuestions && !isCompleted) {
      const output: AskFollowUpOutput = { answers: {}, completed: true };
      completeTool({
        tool_call_id: toolCall.tool_call_id,
        tool_name: toolCall.tool_name,
        parts: [{
          part_type: 'data',
          data: output,
        }],
      });
    }
  }, [hasQuestions, isCompleted, completeTool, toolCall.tool_call_id, toolCall.tool_name]);

  const handleAnswer = useCallback((value: string | string[] | boolean) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  }, [currentQuestion]);

  const handleNext = useCallback(() => {
    if (!currentQuestion) return;
    if (currentQuestion.required && !answers[currentQuestion.id]) {
      return; // Don't proceed if required and empty
    }

    if (isLastStep) {
      // Submit all answers
      const output: AskFollowUpOutput = {
        answers,
        completed: true,
      };
      completeTool({
        tool_call_id: toolCall.tool_call_id,
        tool_name: toolCall.tool_name,
        parts: [{
          part_type: 'data',
          data: output,
        }],
      });
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentQuestion, answers, isLastStep, completeTool, toolCall]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  }, [handleNext]);

  // Skip all remaining questions and submit with current answers
  const handleSkip = useCallback(() => {
    const output: AskFollowUpOutput = {
      answers,
      completed: true,
    };
    completeTool({
      tool_call_id: toolCall.tool_call_id,
      tool_name: toolCall.tool_name,
      parts: [{
        part_type: 'data',
        data: output,
      }],
    });
  }, [answers, completeTool, toolCall]);

  // No questions - show nothing while effect completes
  if (!hasQuestions) {
    return null;
  }

  // Show completed state
  if (isCompleted) {
    return (
      <div className={cn('border rounded-lg p-4 bg-muted/30', styles.completedContainer)}>
        <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', styles.completedText)}>
          <CheckIcon className={cn('w-4 h-4 text-green-500', styles.completedIcon)} />
          <span>Follow-up questions answered</span>
        </div>
        <div className="mt-2 space-y-1">
          {questions.map((q) => (
            <div key={q.id} className={cn('text-xs', styles.answerItem)}>
              <span className={cn('text-muted-foreground', styles.answerQuestion)}>{q.question}</span>
              <span className={cn('ml-2 font-medium', styles.answerValue)}>
                {Array.isArray(answers[q.id])
                  ? (answers[q.id] as string[]).join(', ')
                  : String(answers[q.id])}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Safety check - should not happen if hasQuestions is true
  if (!currentQuestion) {
    return null;
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-background shadow-sm', styles.root)}>
      {/* Header */}
      {(input.title || input.description) && (
        <div className={cn('px-4 py-3 border-b bg-muted/30', styles.header)}>
          {input.title && (
            <h3 className={cn('font-medium text-sm', styles.title)}>{input.title}</h3>
          )}
          {input.description && (
            <p className={cn('text-xs text-muted-foreground mt-1', styles.description)}>{input.description}</p>
          )}
        </div>
      )}

      {/* Progress indicator */}
      <div className={cn('px-4 pt-3', styles.progressContainer)}>
        <div className="flex items-center gap-1">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                styles.progressSegment,
                idx < currentStep
                  ? cn('bg-primary', styles.progressSegmentCompleted)
                  : idx === currentStep
                    ? cn('bg-primary/50', styles.progressSegmentActive)
                    : cn('bg-muted', styles.progressSegmentPending)
              )}
            />
          ))}
        </div>
        <p className={cn('text-xs text-muted-foreground mt-2', styles.progressText)}>
          Question {currentStep + 1} of {questions.length}
        </p>
      </div>

      {/* Question */}
      <div className={cn('p-4', styles.questionContainer)}>
        <label className={cn('block text-sm font-medium mb-3', styles.questionLabel)}>
          {currentQuestion.question}
          {currentQuestion.required && <span className={cn('text-destructive ml-1', styles.requiredIndicator)}>*</span>}
        </label>

        {/* Input based on type */}
        {currentQuestion.type === 'text' && (
          <input
            type="text"
            value={answers[currentQuestion.id] as string || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentQuestion.placeholder || 'Type your answer...'}
            className={cn(
              'w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50',
              styles.textInput
            )}
            autoFocus
          />
        )}

        {currentQuestion.type === 'select' && currentQuestion.options && (
          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  setOtherSelected((prev) => ({ ...prev, [currentQuestion.id]: false }));
                  handleAnswer(option);
                }}
                className={cn(
                  'w-full px-3 py-2 text-sm text-left border rounded-md transition-colors',
                  styles.optionButton,
                  answers[currentQuestion.id] === option && !otherSelected[currentQuestion.id]
                    ? cn('border-primary bg-primary/10', styles.optionButtonSelected)
                    : 'hover:bg-muted'
                )}
              >
                {option}
              </button>
            ))}
            {/* Other option with text input */}
            <button
              onClick={() => {
                setOtherSelected((prev) => ({ ...prev, [currentQuestion.id]: true }));
                handleAnswer(otherText[currentQuestion.id] || '');
              }}
              className={cn(
                'w-full px-3 py-2 text-sm text-left border rounded-md transition-colors',
                styles.optionButton,
                otherSelected[currentQuestion.id]
                  ? cn('border-primary bg-primary/10', styles.optionButtonSelected)
                  : 'hover:bg-muted'
              )}
            >
              Other (type your own)
            </button>
            {otherSelected[currentQuestion.id] && (
              <input
                type="text"
                value={otherText[currentQuestion.id] || ''}
                onChange={(e) => {
                  setOtherText((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }));
                  handleAnswer(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder={currentQuestion.placeholder || 'Type your custom answer...'}
                className={cn(
                  'w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50',
                  styles.textInput
                )}
                autoFocus
              />
            )}
          </div>
        )}

        {currentQuestion.type === 'multiselect' && currentQuestion.options && (
          <div className="space-y-2">
            {currentQuestion.options.map((option) => {
              const selected = (answers[currentQuestion.id] as string[] || []).includes(option);
              return (
                <button
                  key={option}
                  onClick={() => {
                    const current = answers[currentQuestion.id] as string[] || [];
                    const newValue = selected
                      ? current.filter((v) => v !== option)
                      : [...current, option];
                    handleAnswer(newValue);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left border rounded-md transition-colors flex items-center gap-2',
                    styles.optionButton,
                    selected
                      ? cn('border-primary bg-primary/10', styles.optionButtonSelected)
                      : 'hover:bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 border rounded flex items-center justify-center',
                    styles.checkbox,
                    selected ? cn('bg-primary border-primary', styles.checkboxChecked) : 'border-muted-foreground'
                  )}>
                    {selected && <CheckIcon className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  {option}
                </button>
              );
            })}
            {/* Other option for multiselect */}
            <button
              onClick={() => {
                setOtherSelected((prev) => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }));
              }}
              className={cn(
                'w-full px-3 py-2 text-sm text-left border rounded-md transition-colors flex items-center gap-2',
                styles.optionButton,
                otherSelected[currentQuestion.id]
                  ? cn('border-primary bg-primary/10', styles.optionButtonSelected)
                  : 'hover:bg-muted'
              )}
            >
              <div className={cn(
                'w-4 h-4 border rounded flex items-center justify-center',
                styles.checkbox,
                otherSelected[currentQuestion.id] ? cn('bg-primary border-primary', styles.checkboxChecked) : 'border-muted-foreground'
              )}>
                {otherSelected[currentQuestion.id] && <CheckIcon className="w-3 h-3 text-primary-foreground" />}
              </div>
              Other (type your own)
            </button>
            {otherSelected[currentQuestion.id] && (
              <input
                type="text"
                value={otherText[currentQuestion.id] || ''}
                onChange={(e) => {
                  const customValue = e.target.value;
                  setOtherText((prev) => ({ ...prev, [currentQuestion.id]: customValue }));
                  // Add/update custom value in the answers array
                  const current = answers[currentQuestion.id] as string[] || [];
                  const prevCustom = otherText[currentQuestion.id];
                  const filtered = current.filter((v) => v !== prevCustom);
                  if (customValue) {
                    handleAnswer([...filtered, customValue]);
                  } else {
                    handleAnswer(filtered);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={currentQuestion.placeholder || 'Type your custom answer...'}
                className={cn(
                  'w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50',
                  styles.textInput
                )}
                autoFocus
              />
            )}
          </div>
        )}

        {currentQuestion.type === 'boolean' && (
          <div className={cn('flex gap-3', styles.booleanContainer)}>
            <button
              onClick={() => handleAnswer(true)}
              className={cn(
                'flex-1 px-4 py-2 text-sm border rounded-md transition-colors',
                styles.booleanButton,
                answers[currentQuestion.id] === true
                  ? cn('border-primary bg-primary/10', styles.booleanButtonSelected)
                  : 'hover:bg-muted'
              )}
            >
              Yes
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className={cn(
                'flex-1 px-4 py-2 text-sm border rounded-md transition-colors',
                styles.booleanButton,
                answers[currentQuestion.id] === false
                  ? cn('border-primary bg-primary/10', styles.booleanButtonSelected)
                  : 'hover:bg-muted'
              )}
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={cn('px-4 pb-4 flex items-center justify-between', styles.actionsContainer)}>
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md transition-colors',
            styles.backButton,
            currentStep === 0
              ? cn('text-muted-foreground cursor-not-allowed', styles.backButtonDisabled)
              : 'hover:bg-muted'
          )}
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSkip}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors text-muted-foreground hover:bg-muted',
              styles.skipButton
            )}
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            disabled={currentQuestion.required && !answers[currentQuestion.id]}
            className={cn(
              'px-4 py-1.5 text-sm rounded-md transition-colors',
              styles.nextButton,
              currentQuestion.required && !answers[currentQuestion.id]
                ? cn('bg-muted text-muted-foreground cursor-not-allowed', styles.nextButtonDisabled)
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isLastStep ? 'Submit' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple check icon component
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
