import { useMemo } from 'react';

export const useUserStats = (userBets, wonBets, lostBets, pendingBets) => {
  // Compute stats from userBets data
  const stats = useMemo(() => {
    const safeBets = userBets || [];
    const safeWonBets = wonBets || [];
    const safeLostBets = lostBets || [];
    const safePendingBets = pendingBets || [];
    
    const totalBets = safeBets.length;
    // Use pre-calculated wonBets and lostBets for consistency with useUserBets
    const wins = safeWonBets.length;
    const losses = safeLostBets.length;
    const pending = safePendingBets.length;
    
    // Calculate streak (consecutive wins)
    // Sort ALL bets by endTime (most recent first) to determine the current streak
    const sortedAllBets = [...safeBets].sort((a, b) => {
      const aTime = a.market?.endTime || 0;
      const bTime = b.market?.endTime || 0;
      return bTime - aTime;
    });
    
    let streak = 0;
    
    for (const bet of sortedAllBets) {
      // Skip unresolved markets - they're not part of the streak calculation yet
      if (!bet.market?.resolved) {
        continue;
      }
      
      // Determine if this bet was a win or loss
      let isWin = false;
      
      if (bet.market.marketType === 0) { // Binary
        const predictedUp = bet.choice === 1;
        isWin = predictedUp === bet.market.priceWentUp;
      } else if (bet.market.marketType === 1) { // Multi-choice
        isWin = bet.choice === bet.market.winningChoice;
      } else {
        // For other market types, use claim status
        isWin = bet.claimed || bet.isClaimableConfirmed;
      }
      
      if (isWin) {
        streak++;
      } else {
        // A loss breaks the streak - reset to 0
        break;
      }
    }

    return {
      totalBets,
      wins,
      losses,
      pending,
      streak,
      isLoading: false,
      error: null
    };
  }, [userBets, wonBets, lostBets, pendingBets]);

  return stats;
};

export default useUserStats;
