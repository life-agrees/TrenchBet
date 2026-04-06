import React from 'react';
import { useVouchers } from '../hooks/useVouchers';

/**
 * Displays user's voucher balance and system status
 * Shows only if vouchers system is active and user has logged in
 */
export const VoucherBalance = ({ userAddress }) => {
  const { voucherBalanceFormatted, isSystemActive, isLoading, error } = useVouchers(userAddress);

  // Don't render if system not active or no user
  if (!isSystemActive || !userAddress) {
    return null;
  }

  if (error) {
    return (
      <div className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded text-sm">
        <span>⚠️ Error loading voucher balance</span>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm">
      <div className="flex items-center justify-between">
        <span className="text-blue-800 font-medium">Betting Vouchers:</span>
        <span className="text-blue-900 font-bold">
          {isLoading ? 'Loading...' : `$${voucherBalanceFormatted}`}
        </span>
      </div>
      <p className="text-blue-700 text-xs mt-1">
        Used before bet credits and USDC
      </p>
    </div>
  );
};

export default VoucherBalance;
