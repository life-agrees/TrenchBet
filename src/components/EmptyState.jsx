import React from 'react';
import { Inbox, Wallet } from 'lucide-react';

/**
 * EmptyState
 *
 * FIX 1: Component previously accepted `title`, `description`, `icon`, `action`
 *         but App.jsx calls it as:
 *           <EmptyState isConnected={isConnected} variant="empty" />
 *         Both `isConnected` and `variant` were silently ignored — every view
 *         showed the same generic "No Data Found" text regardless of whether
 *         the user's wallet was connected.
 *
 *         Now handles the `isConnected` + `variant` prop pattern from App.jsx
 *         while remaining backward compatible with the title/description/icon/action
 *         pattern used elsewhere.
 *
 * FIX 2: Design system — `gray-*` → `dark-*`, action button `blue-500` → `primary`.
 */
export const EmptyState = ({
  // App.jsx pattern
  isConnected,
  variant,
  // Generic pattern (backwards compatible)
  title,
  description,
  icon: Icon,
  action,
}) => {
  // FIX 1: derive display values from isConnected/variant when present
  let resolvedTitle       = title       ?? 'No Data Found';
  let resolvedDescription = description ?? "There's nothing to show here yet.";
  let ResolvedIcon        = Icon        ?? Inbox;

  if (!isConnected && isConnected !== undefined) {
    // Wallet not connected — override with a more helpful message
    resolvedTitle       = 'Connect Your Wallet';
    resolvedDescription = 'Connect your wallet to access this feature.';
    ResolvedIcon        = Wallet;
  } else if (variant === 'empty') {
    resolvedTitle       = 'Nothing Here Yet';
    resolvedDescription = 'Place some bets to see your data here.';
    ResolvedIcon        = Inbox;
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* FIX 2: dark-800 instead of gray-800 */}
      <div className="w-16 h-16 bg-white dark:bg-dark-800/50 rounded-full flex items-center justify-center mb-4">
        <ResolvedIcon className="w-8 h-8 text-neutral-500" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{resolvedTitle}</h3>
      <p className="text-neutral-400 text-sm max-w-sm mb-4">{resolvedDescription}</p>
      {action && (
        // FIX 2: primary instead of blue-500
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-dark-950 text-sm font-bold rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;