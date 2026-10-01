import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Calendar, Edit3, Trash2, Check, Sparkles, ChevronDown, ChevronUp, Layers, ListChecks, SplitSquareVertical, FileText } from 'lucide-react';
import type { GoalItem, GoalSubItem, GoalType } from '../types/journal';
import { getTodayIsoString, formatShortDate } from '../utils/dateUtils';

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: GoalType;
  goals: GoalItem[];
  onAddGoal: (text: string, type: GoalType, deadline?: string, subItems?: GoalSubItem[]) => void;
  onAddMultipleGoals?: (newGoals: { text: string; type: GoalType; deadline?: string; subItems?: GoalSubItem[] }[]) => void;
  onToggleGoal: (id: string) => void;
  onEditGoal: (id: string, newText: string, newDeadline?: string, subItems?: GoalSubItem[]) => void;
  onDeleteGoal: (id: string) => void;
}

export const GoalsModal: React.FC<GoalsModalProps> = ({
  isOpen,
  onClose,
  type,
  goals,
  onAddGoal,
  onAddMultipleGoals,
  onToggleGoal,
  onEditGoal,
  onDeleteGoal
}) => {
  const [newText, setNewText] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  
  // Smart paste state
  const [pastedText, setPastedText] = useState<string | null>(null);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editSubItems, setEditSubItems] = useState<GoalSubItem[]>([]);

  // Expanded goal cards state (for > 4 lines text clamp)
  const [expandedTextIds, setExpandedTextIds] = useState<Record<string, boolean>>({});
  // Collapsible sub-items list state
  const [expandedSubItemIds, setExpandedSubItemIds] = useState<Record<string, boolean>>({});

  // Mobile collapse form toggle
  const [showMobileForm, setShowMobileForm] = useState<boolean>(true);

  // New sub-item input per goal card
  const [newSubItemText, setNewSubItemText] = useState<Record<string, string>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const todayIso = useMemo(() => getTodayIsoString(), []);

  // Auto-grow textarea
  const adjustTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(180, Math.max(80, el.scrollHeight))}px`;
  };

  useEffect(() => {
    adjustTextareaHeight(textareaRef.current);
  }, [newText]);

  useEffect(() => {
    adjustTextareaHeight(editTextareaRef.current);
  }, [editText]);

  // Filter goals by type (short-term vs long-term)
  const filteredGoals = useMemo(() => {
    const list = goals.filter((g) => g.type === type);

    // Sort: unticked goals first, then ticked goals
    // Within each group, nearest deadline first
    return list.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      if (a.deadline && b.deadline) {
        return a.deadline.localeCompare(b.deadline);
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;

      return b.createdAt - a.createdAt;
    });
  }, [goals, type]);

  const completedCount = filteredGoals.filter((g) => g.completed).length;

  if (!isOpen) return null;

  // Handle Paste event on Add Goal Textarea
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    if (text && text.includes('\n') && text.trim().split('\n').filter((l) => l.trim()).length > 1) {
      setPastedText(text);
      setShowPasteModal(true);
    }
  };

  // Helper to clean bullet points
  const cleanBullet = (str: string): string => {
    return str.replace(/^[\s\-*•\d+.\(\)]+/, '').trim();
  };

  // Smart paste action handlers
  const handleSmartPasteOneGoal = () => {
    if (!pastedText) return;
    setNewText(pastedText.trim());
    setPastedText(null);
    setShowPasteModal(false);
  };

  const handleSmartPasteChecklist = () => {
    if (!pastedText) return;
    const lines = pastedText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const title = cleanBullet(lines[0]);
    const subItems: GoalSubItem[] = lines.slice(1).map((line, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      text: cleanBullet(line),
      completed: false
    }));

    onAddGoal(title, type, newDeadline || undefined, subItems);

    setNewText('');
    setNewDeadline('');
    setPastedText(null);
    setShowPasteModal(false);
  };

  const handleSmartPasteSplitSeparate = () => {
    if (!pastedText) return;
    const lines = pastedText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    // Check if lines have roadmap structure (e.g. "Phase 1" followed by bullets)
    const newGoalsList: { text: string; type: GoalType; deadline?: string; subItems?: GoalSubItem[] }[] = [];
    let currentGoal: { text: string; subItems: GoalSubItem[] } | null = null;

    for (const line of lines) {
      const isHeader = /^((Phase|Step|Week|Day)\s+\d+|^\d+\.\s+|^[A-Z][a-zA-Z0-9\s]+:)/i.test(line);
      const isBullet = /^[\s\-*•]/.test(line);

      if (isHeader || (!isBullet && !currentGoal)) {
        if (currentGoal) {
          newGoalsList.push({
            text: currentGoal.text,
            type,
            deadline: newDeadline || undefined,
            subItems: currentGoal.subItems.length > 0 ? currentGoal.subItems : undefined
          });
        }
        currentGoal = { text: cleanBullet(line), subItems: [] };
      } else if (currentGoal) {
        currentGoal.subItems.push({
          id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: cleanBullet(line),
          completed: false
        });
      } else {
        newGoalsList.push({
          text: cleanBullet(line),
          type,
          deadline: newDeadline || undefined
        });
      }
    }

    if (currentGoal) {
      newGoalsList.push({
        text: currentGoal.text,
        type,
        deadline: newDeadline || undefined,
        subItems: currentGoal.subItems.length > 0 ? currentGoal.subItems : undefined
      });
    }

    if (onAddMultipleGoals && newGoalsList.length > 1) {
      onAddMultipleGoals(newGoalsList);
    } else {
      newGoalsList.forEach((g) => onAddGoal(g.text, g.type, g.deadline, g.subItems));
    }

    setNewText('');
    setNewDeadline('');
    setPastedText(null);
    setShowPasteModal(false);
  };

  // Form Submit
  const handleAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newText.trim()) return;

    onAddGoal(newText.trim(), type, newDeadline || undefined);
    setNewText('');
    setNewDeadline('');
  };

  const handleKeyDownAdd = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddSubmit();
    }
  };

  // Start inline editing
  const startEdit = (goal: GoalItem) => {
    setEditingId(goal.id);
    setEditText(goal.text);
    setEditDeadline(goal.deadline || '');
    setEditSubItems(goal.subItems ? [...goal.subItems] : []);
  };

  const saveEdit = (id: string) => {
    if (!editText.trim()) return;
    onEditGoal(id, editText.trim(), editDeadline || undefined, editSubItems);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // Main goal checkbox toggle
  const handleToggleMainGoal = (goal: GoalItem) => {
    const nextCompleted = !goal.completed;

    if (goal.subItems && goal.subItems.length > 0) {
      // Toggle all sub-items to match main goal
      const updatedSubItems = goal.subItems.map((sub) => ({
        ...sub,
        completed: nextCompleted
      }));
      onEditGoal(goal.id, goal.text, goal.deadline, updatedSubItems);
    } else {
      onToggleGoal(goal.id);
    }
  };

  // Sub-item toggle inside goal card
  const handleToggleSubItem = (goal: GoalItem, subId: string) => {
    if (!goal.subItems) return;

    const updatedSubItems = goal.subItems.map((sub) =>
      sub.id === subId ? { ...sub, completed: !sub.completed } : sub
    );

    // Auto-tick goal if ALL sub-items are ticked; untick if ANY sub-item is unticked
    const allDone = updatedSubItems.every((s) => s.completed);
    const hasUnticked = updatedSubItems.some((s) => !s.completed);

    let nextCompleted = goal.completed;
    if (allDone) nextCompleted = true;
    else if (hasUnticked) nextCompleted = false;

    onEditGoal(goal.id, goal.text, goal.deadline, updatedSubItems);
    if (nextCompleted !== goal.completed && !allDone && !hasUnticked) {
      onToggleGoal(goal.id);
    }
  };

  // Add sub-item to existing goal card
  const handleAddSubItemToCard = (goal: GoalItem) => {
    const txt = newSubItemText[goal.id]?.trim();
    if (!txt) return;

    const newSub: GoalSubItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: txt,
      completed: false
    };

    const updatedSubItems = [...(goal.subItems || []), newSub];
    onEditGoal(goal.id, goal.text, goal.deadline, updatedSubItems);

    setNewSubItemText((prev) => ({ ...prev, [goal.id]: '' }));
  };

  // Delete sub-item from existing goal card
  const handleDeleteSubItemFromCard = (goal: GoalItem, subId: string) => {
    if (!goal.subItems) return;
    const updatedSubItems = goal.subItems.filter((s) => s.id !== subId);
    onEditGoal(goal.id, goal.text, goal.deadline, updatedSubItems);
  };

  const iconEmoji = type === 'short-term' ? '🌱' : '🌳';
  const titleText = type === 'short-term' ? 'Short-term Goals' : 'Long-term Goals';
  const subtitleText =
    type === 'short-term'
      ? 'Daily steps, quick wins & milestones~'
      : 'Big dreams, roadmaps & long-range vision~';

  return (
    <div className="modal-backdrop-blur">
      <div className="goals-modal-card-wide">
        {/* Header */}
        <div className="modal-header-row">
          <div className="modal-title-group">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{iconEmoji}</span>
              <h3 className="modal-title font-handwritten text-2.5xl">
                {titleText}
              </h3>
              <span className="goals-progress-badge">
                {completedCount}/{filteredGoals.length} done
              </span>
            </div>
            <p className="modal-subtitle">{subtitleText}</p>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Smart Paste Modal Popup */}
        {showPasteModal && (
          <div className="smart-paste-popover-overlay">
            <div className="smart-paste-popover">
              <div className="smart-paste-header">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h4>Multi-line Text Pasted! How would you like to add it?</h4>
              </div>
              <p className="smart-paste-subtitle">Choose your paste layout:</p>

              <div className="smart-paste-options-list">
                <button
                  type="button"
                  className="smart-paste-btn"
                  onClick={handleSmartPasteOneGoal}
                >
                  <FileText className="w-4 h-4 text-pink-500 shrink-0" />
                  <div>
                    <strong>a) Keep as one goal</strong>
                    <span>Preserves line breaks inside a single goal description</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="smart-paste-btn"
                  onClick={handleSmartPasteChecklist}
                >
                  <ListChecks className="w-4 h-4 text-purple-500 shrink-0" />
                  <div>
                    <strong>b) Make a checklist</strong>
                    <span>First line becomes title, following lines/bullets become sub-items</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="smart-paste-btn"
                  onClick={handleSmartPasteSplitSeparate}
                >
                  <SplitSquareVertical className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong>c) Split into separate goals</strong>
                    <span>Each line or roadmap section becomes its own goal</span>
                  </div>
                </button>
              </div>

              <button
                type="button"
                className="smart-paste-cancel-btn"
                onClick={() => {
                  setShowPasteModal(false);
                  setPastedText(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Mobile Form Toggle Button */}
        <div className="md:hidden mb-2">
          <button
            type="button"
            className="toggle-mobile-form-btn"
            onClick={() => setShowMobileForm(!showMobileForm)}
          >
            <Plus className="w-4 h-4" />
            <span>{showMobileForm ? 'Hide Add Goal Form' : 'Add New Goal'}</span>
          </button>
        </div>

        {/* Two-Column Layout Container */}
        <div className="goals-two-column-layout">
          {/* LEFT COLUMN: Add Goal Form (Sticky) */}
          <div className={`goals-left-form-col ${showMobileForm ? '' : 'hidden md:block'}`}>
            <div className="add-goal-box-card">
              <h4 className="column-section-title font-handwritten text-xl">
                ➕ Add a New Goal
              </h4>

              <div className="form-field-group">
                <label className="field-label-sm">Goal Description / Title:</label>
                <textarea
                  ref={textareaRef}
                  className="goal-auto-textarea"
                  placeholder="Type or paste your goal, roadmap, or checklist..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={handleKeyDownAdd}
                  onPaste={handlePaste}
                  rows={3}
                />
                <span className="keyboard-shortcut-hint">
                  Press <strong>Ctrl+Enter</strong> to add (plain Enter for new line)
                </span>
              </div>

              <div className="form-field-group mt-3">
                <label className="field-label-sm">Deadline Date (optional):</label>
                <div className="deadline-input-wrapper">
                  <Calendar className="w-3.5 h-3.5 text-stone-500 ml-2" />
                  <input
                    type="date"
                    className="goal-date-input"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                className="add-goal-submit-btn"
                disabled={!newText.trim()}
                onClick={() => handleAddSubmit()}
              >
                <Plus className="w-4 h-4" />
                <span>Add Goal</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Scrollable Goals List */}
          <div className="goals-right-list-col">
            <h4 className="column-section-title font-handwritten text-xl mb-2">
              📋 Your Goals ({filteredGoals.length})
            </h4>

            <div className="goals-list-scroll-container">
              {filteredGoals.length === 0 ? (
                <div className="goals-empty-state">
                  <Sparkles className="w-8 h-8 text-amber-300 mx-auto animate-pulse" />
                  <p className="empty-goals-text">no goals yet, add one~ {iconEmoji}</p>
                </div>
              ) : (
                <ul className="goals-cards-list">
                  {filteredGoals.map((goal) => {
                    const isEditing = editingId === goal.id;
                    const isPassed = !goal.completed && goal.deadline && goal.deadline < todayIso;
                    
                    const textLines = goal.text.split('\n');
                    const isLongText = textLines.length > 4 || goal.text.length > 200;
                    const isTextExpanded = expandedTextIds[goal.id];
                    const isSubItemsExpanded = expandedSubItemIds[goal.id] !== false; // expanded by default

                    const subItemsCount = goal.subItems?.length || 0;
                    const completedSubItemsCount = goal.subItems?.filter((s) => s.completed).length || 0;

                    if (isEditing) {
                      return (
                        <li key={goal.id} className="goal-card-item editing">
                          <textarea
                            ref={editTextareaRef}
                            className="edit-goal-auto-textarea"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                          />

                          <div className="edit-date-row">
                            <Calendar className="w-3.5 h-3.5 text-stone-500 ml-1" />
                            <input
                              type="date"
                              className="edit-goal-date-input"
                              value={editDeadline}
                              onChange={(e) => setEditDeadline(e.target.value)}
                            />
                          </div>

                          <div className="edit-actions-buttons">
                            <button
                              type="button"
                              className="save-edit-btn"
                              onClick={() => saveEdit(goal.id)}
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> Save
                            </button>
                            <button
                              type="button"
                              className="cancel-edit-btn"
                              onClick={cancelEdit}
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> Cancel
                            </button>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li
                        key={goal.id}
                        className={`goal-card-item ${goal.completed ? 'completed' : ''}`}
                      >
                        <div className="goal-card-top-row">
                          <label className="goal-checkbox-label">
                            <input
                              type="checkbox"
                              checked={goal.completed}
                              onChange={() => handleToggleMainGoal(goal)}
                              className="custom-goal-checkbox"
                            />
                            <div className="goal-text-content-wrapper">
                              <p
                                className={`goal-text-display ${
                                  goal.completed ? 'line-through opacity-60' : ''
                                } ${!isTextExpanded && isLongText ? 'line-clamp-4' : ''}`}
                              >
                                {goal.text}
                              </p>

                              {isLongText && (
                                <button
                                  type="button"
                                  className="show-more-toggle-btn"
                                  onClick={() =>
                                    setExpandedTextIds((prev) => ({
                                      ...prev,
                                      [goal.id]: !prev[goal.id]
                                    }))
                                  }
                                >
                                  {isTextExpanded ? (
                                    <>
                                      <span>show less</span> <ChevronUp className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <>
                                      <span>show more</span> <ChevronDown className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </label>

                          <div className="goal-card-meta-actions">
                            {goal.deadline && (
                              <span
                                className={`deadline-chip ${
                                  isPassed ? 'passed-deadline' : 'normal-deadline'
                                }`}
                                title={isPassed ? 'Deadline passed' : 'Deadline date'}
                              >
                                📅 {formatShortDate(goal.deadline)}
                              </span>
                            )}

                            <div className="goal-row-actions">
                              <button
                                type="button"
                                className="goal-action-btn edit"
                                onClick={() => startEdit(goal)}
                                title="Edit goal"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                className="goal-action-btn delete"
                                onClick={() => onDeleteGoal(goal.id)}
                                title="Delete goal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Sub-items Checklist Section */}
                        {subItemsCount > 0 && (
                          <div className="subitems-section">
                            <button
                              type="button"
                              className="subitems-toggle-header"
                              onClick={() =>
                                setExpandedSubItemIds((prev) => ({
                                  ...prev,
                                  [goal.id]: !isSubItemsExpanded
                                }))
                              }
                            >
                              <div className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-purple-600" />
                                <span>
                                  Checklist ({completedSubItemsCount}/{subItemsCount} done)
                                </span>
                              </div>
                              {isSubItemsExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {isSubItemsExpanded && (
                              <ul className="subitems-list">
                                {goal.subItems?.map((sub) => (
                                  <li key={sub.id} className="subitem-row">
                                    <label className="subitem-label">
                                      <input
                                        type="checkbox"
                                        checked={sub.completed}
                                        onChange={() => handleToggleSubItem(goal, sub.id)}
                                        className="subitem-checkbox"
                                      />
                                      <span
                                        className={`subitem-text ${
                                          sub.completed ? 'line-through opacity-60' : ''
                                        }`}
                                      >
                                        {sub.text}
                                      </span>
                                    </label>
                                    <button
                                      type="button"
                                      className="subitem-delete-btn"
                                      onClick={() => handleDeleteSubItemFromCard(goal, sub.id)}
                                      title="Delete sub-item"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {/* Inline Add Sub-item Row */}
                        <div className="add-subitem-row">
                          <input
                            type="text"
                            className="add-subitem-input"
                            placeholder="+ Add sub-item..."
                            value={newSubItemText[goal.id] || ''}
                            onChange={(e) =>
                              setNewSubItemText((prev) => ({
                                ...prev,
                                [goal.id]: e.target.value
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubItemToCard(goal);
                              }
                            }}
                          />
                          {newSubItemText[goal.id]?.trim() && (
                            <button
                              type="button"
                              className="add-subitem-btn"
                              onClick={() => handleAddSubItemToCard(goal)}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
