#!/bin/bash

# Contract Addresses
PROXY="0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581"
CORE="0xfE81BE3a4145Fc9d334CdE475ccBa44a449fF303"
TYPES="0x85e680ca2786388DC87C2a905cb30c46dEE8413d"

# Constructor Arguments
USDC="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
ADMIN="0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d"

echo "==========================================="
echo "Verifying Contracts on Base Sepolia"
echo "==========================================="
echo ""

# Verify Core Implementation
echo "1️⃣  Verifying Core ($(date))..."
echo "   Constructor args: USDC=$USDC, PROXY=$PROXY"
npx hardhat verify --network baseSepolia $CORE $USDC $PROXY

echo ""
sleep 5

# Verify Types Implementation
echo "2️⃣  Verifying Types ($(date))..."
echo "   Constructor args: USDC=$USDC, PROXY=$PROXY"
npx hardhat verify --network baseSepolia $TYPES $USDC $PROXY

echo ""
sleep 5

# Verify Proxy
echo "3️⃣  Verifying Proxy ($(date))..."
echo "   Constructor args: CORE=$CORE, TYPES=$TYPES, ADMIN=$ADMIN"
npx hardhat verify --network baseSepolia $PROXY $CORE $TYPES $ADMIN

echo ""
echo "==========================================="
echo "✅ Verification Complete!"
echo "==========================================="
echo ""
echo "📋 Verified Contracts:"
echo "   • Core:  $CORE"
echo "   • Types: $TYPES"
echo "   • Proxy: $PROXY"
echo ""
echo "🔗 View on Basescan:"
echo "   Core:  https://sepolia.basescan.org/address/$CORE"
echo "   Types: https://sepolia.basescan.org/address/$TYPES"
echo "   Proxy: https://sepolia.basescan.org/address/$PROXY"
