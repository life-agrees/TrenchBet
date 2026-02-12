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
    
    // Calculate streak (consecutive wins) from wonBets for consistency
    let streak = 0;
    const sortedWonBets = [...safeWonBets]
      .sort((a, b) => (b.market?.endTime || 0) - (a.market?.endTime || 0));
    
    for (const bet of sortedWonBets) {
      if (bet.market?.resolved) {
        streak++;
      } else {
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
