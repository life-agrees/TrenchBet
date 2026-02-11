import { useMemo } from 'react';

export const useUserStats = (userBets) => {
  // Compute stats from userBets data
  const stats = useMemo(() => {
    const safeBets = userBets || [];
    
    const totalBets = safeBets.length;
    const wins = safeBets.filter(bet => bet.market?.resolved && (bet.claimed || bet.isClaimableConfirmed)).length;
    const losses = safeBets.filter(bet => bet.market?.resolved && !bet.claimed && !bet.isClaimableConfirmed).length;
    
    // Calculate streak (consecutive wins)
    let streak = 0;
    const sortedBets = [...safeBets]
      .filter(bet => bet.market?.resolved)
      .sort((a, b) => (b.market?.endTime || 0) - (a.market?.endTime || 0));
    
    for (const bet of sortedBets) {
      if (bet.claimed || bet.isClaimableConfirmed) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalBets,
      wins,
      losses,
      streak,
      isLoading: false,
      error: null
    };
  }, [userBets]);

  return stats;
};

export default useUserStats;
