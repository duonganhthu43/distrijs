import React, { useState, useEffect } from 'react';
import { TodoItem, TodoStatus } from '@distri/core';
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

export interface TodosDisplayProps {
  todos: TodoItem[];
  className?: string;
  title?: string;
  /** Auto-collapse when all tasks are done (default: true) */
  autoCollapseOnDone?: boolean;
  /** Initial collapsed state (default: false) */
  defaultCollapsed?: boolean;
}

const getStatusIcon = (status: TodoStatus) => {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />;
    case 'open':
    default:
      return <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  }
};

const getStatusStyles = (status: TodoStatus) => {
  switch (status) {
    case 'done':
      return 'text-muted-foreground line-through';
    case 'in_progress':
      return 'text-foreground font-medium';
    case 'open':
    default:
      return 'text-foreground';
  }
};

export const TodosDisplay: React.FC<TodosDisplayProps> = ({
  todos,
  className = '',
  title = 'Tasks',
  autoCollapseOnDone = true,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (!todos || todos.length === 0) {
    return null;
  }

  const completedCount = todos.filter(t => t.status === 'done').length;
  const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
  const totalCount = todos.length;
  const allDone = completedCount === totalCount;

  // Auto-collapse when all tasks are done
  useEffect(() => {
    if (autoCollapseOnDone && allDone) {
      setIsCollapsed(true);
    }
  }, [autoCollapseOnDone, allDone]);

  return (
    <div className={`rounded-lg border bg-card p-3 ${className}`}>
      {/* Header - clickable to toggle collapse */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-1.5">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          {allDone && (
            <CheckCircle2 className="h-4 w-4 text-green-500 ml-1" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{totalCount} done
          {inProgressCount > 0 && ` (${inProgressCount} in progress)`}
        </span>
      </button>

      {/* Progress bar - always visible */}
      <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Todo list - collapsible */}
      {!isCollapsed && (
        <ul className="space-y-1.5 overflow-hidden mt-3">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-start gap-2 text-sm min-w-0"
            >
              {getStatusIcon(todo.status)}
              <span className={`${getStatusStyles(todo.status)} break-words min-w-0`}>
                {todo.content}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TodosDisplay;
