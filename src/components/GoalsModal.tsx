import React, { useState, useMemo } from 'react';
import { X, Plus, Calendar, Edit3, Trash2, Check, Sparkles } from 'lucide-react';
import type { GoalItem, GoalType } from '../types/journal';
import { getTodayIsoString, formatShortDate } from '../utils/dateUtils';

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: GoalType;
  goals: GoalItem[];
  onAddGoal: (text: string, type: GoalType, deadline?: string) => void;
  onToggleGoal: (id: string) => void;
  onEditGoal: (id: string, newText: string, newDeadline?: string) => void;
  onDeleteGoal: (id: string) => void;
}

export const GoalsModal: React.FC<GoalsModalProps> = ({
  isOpen,
  onClose,
  type,
  goals,
  onAddGoal,
  onToggleGoal,
  onEditGoal,
  onDeleteGoal
}) => {
  const [newText, setNewText] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  const todayIso = useMemo(() => getTodayIsoString(), []);

  // Filter goals by type (short-term vs long-term)
  const filteredGoals = useMemo(() => {
    const list = goals.filter((g) => g.type === type);
    
    // Sort: unticked first, then ticked
    // Within each group, goals with nearest deadline first
    return list.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // Both completed or both incomplete
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

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddGoal(newText.trim(), type, newDeadline || undefined);
    setNewText('');
    setNewDeadline('');
  };

  const startEdit = (goal: GoalItem) => {
    setEditingId(goal.id);
    setEditText(goal.text);
    setEditDeadline(goal.deadline || '');
  };

  const saveEdit = (id: string) => {
    if (!editText.trim()) return;
    onEditGoal(id, editText.trim(), editDeadline || undefined);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const iconEmoji = type === 'short-term' ? '🌱' : '🌳';
  const titleText = type === 'short-term' ? 'Short-term Goals' : 'Long-term Goals';
  const subtitleText =
    type === 'short-term'
      ? 'Daily steps, quick wins & small milestones~'
      : 'Big dreams, future plans & long-range vision~';

  return (
    <div className="modal-backdrop-blur">
      <div className="goals-modal-card">
        {/* Header */}
        <div className="modal-header-row">
          <div className="modal-title-group">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{iconEmoji}</span>
              <h3 className="modal-title font-handwritten text-2xl">
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

        {/* Add Goal Bar */}
        <form onSubmit={handleAddSubmit} className="add-goal-form">
          <div className="add-goal-inputs-row">
            <input
              type="text"
              className="goal-text-input"
              placeholder={`Add a new ${type === 'short-term' ? 'short-term' : 'long-term'} goal...`}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />
            <div className="deadline-input-wrapper">
              <Calendar className="w-3.5 h-3.5 text-stone-500 ml-2" />
              <input
                type="date"
                className="goal-date-input"
                title="Optional deadline"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="add-goal-btn"
              disabled={!newText.trim()}
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Goals List */}
        <div className="goals-list-container">
          {filteredGoals.length === 0 ? (
            <div className="goals-empty-state">
              <div className="doodle-graphic">
                <Sparkles className="w-6 h-6 text-amber-300 mx-auto animate-pulse" />
              </div>
              <p className="empty-goals-text">no goals yet, add one~ {iconEmoji}</p>
            </div>
          ) : (
            <ul className="goals-items-list">
              {filteredGoals.map((goal) => {
                const isEditing = editingId === goal.id;
                const isPassed = !goal.completed && goal.deadline && goal.deadline < todayIso;

                if (isEditing) {
                  return (
                    <li key={goal.id} className="goal-item-row editing">
                      <input
                        type="text"
                        className="edit-goal-text-input"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                      />
                      <input
                        type="date"
                        className="edit-goal-date-input"
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                      />
                      <div className="edit-actions-buttons">
                        <button
                          type="button"
                          className="save-edit-btn"
                          onClick={() => saveEdit(goal.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="cancel-edit-btn"
                          onClick={cancelEdit}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                }

                return (
                  <li
                    key={goal.id}
                    className={`goal-item-row ${goal.completed ? 'completed' : ''}`}
                  >
                    <label className="goal-checkbox-label">
                      <input
                        type="checkbox"
                        checked={goal.completed}
                        onChange={() => onToggleGoal(goal.id)}
                        className="custom-goal-checkbox"
                      />
                      <span className={`goal-text-display ${goal.completed ? 'line-through opacity-60' : ''}`}>
                        {goal.text}
                      </span>
                    </label>

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
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
