import { useChainId } from 'wagmi';
import { getContracts, MULTICHAIN_CONTRACTS } from '../utils/constants';
import { useMemo } from 'react';

/**
 * Smart Hook to get the correct contract addresses based on the current network.
 * If the user is on an unsupported network, it defaults to Base Sepolia (84532).
 */
export function useContractAddresses() {
  const chainId = useChainId();

  const contracts = useMemo(() => {
    // Fallback to Base Sepolia if chainId is not in our supported list
    const id = MULTICHAIN_CONTRACTS[chainId] ? chainId : 84532;
    return getContracts(id);
  }, [chainId]);

  return {
    ...contracts,
    explorerUrl: contracts.EXPLORER,
    networkName: contracts.NAME,
    isArc: chainId === 5042002,
    isBase: chainId === 84532,
    isXLayer: chainId === 1952,
    chainId
  };
}
