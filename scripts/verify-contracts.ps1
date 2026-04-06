################################
# Verify Contracts on Base Sepolia
################################

# Contract Addresses
$PROXY = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581"
$CORE = "0xfE81BE3a4145Fc9d334CdE475ccBa44a449fF303"
$TYPES = "0x85e680ca2786388DC87C2a905cb30c46dEE8413d"

# Constructor Arguments
$USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
$ADMIN = "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Verifying Contracts on Base Sepolia" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# Verify Core Implementation
# ============================================================
Write-Host "1️⃣  Verifying Core Implementation..." -ForegroundColor Yellow
Write-Host "   Contract: $CORE" -ForegroundColor Gray
Write-Host "   Constructor args:" -ForegroundColor Gray
Write-Host "     USDC: $USDC" -ForegroundColor Gray
Write-Host "     PROXY: $PROXY" -ForegroundColor Gray
Write-Host ""

npx hardhat verify --network baseSepolia $CORE $USDC $PROXY

Write-Host ""
Write-Host "Waiting 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# ============================================================
# Verify Types Implementation
# ============================================================
Write-Host ""
Write-Host "2️⃣  Verifying Types Implementation..." -ForegroundColor Yellow
Write-Host "   Contract: $TYPES" -ForegroundColor Gray
Write-Host "   Constructor args:" -ForegroundColor Gray
Write-Host "     USDC: $USDC" -ForegroundColor Gray
Write-Host "     PROXY: $PROXY" -ForegroundColor Gray
Write-Host ""

npx hardhat verify --network baseSepolia $TYPES $USDC $PROXY

Write-Host ""
Write-Host "Waiting 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# ============================================================
# Verify Proxy
# ============================================================
Write-Host ""
Write-Host "3️⃣  Verifying Proxy..." -ForegroundColor Yellow
Write-Host "   Contract: $PROXY" -ForegroundColor Gray
Write-Host "   Constructor args:" -ForegroundColor Gray
Write-Host "     CORE: $CORE" -ForegroundColor Gray
Write-Host "     TYPES: $TYPES" -ForegroundColor Gray
Write-Host "     ADMIN: $ADMIN" -ForegroundColor Gray
Write-Host ""

npx hardhat verify --network baseSepolia $PROXY $CORE $TYPES $ADMIN

# ============================================================
# Summary
# ============================================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ Verification Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Verified Contracts:" -ForegroundColor Cyan
Write-Host "   • Core:  $CORE" -ForegroundColor Gray
Write-Host "   • Types: $TYPES" -ForegroundColor Gray
Write-Host "   • Proxy: $PROXY" -ForegroundColor Gray
Write-Host ""

Write-Host "🔗 View on Basescan:" -ForegroundColor Cyan
Write-Host "   Core:  https://sepolia.basescan.org/address/$CORE" -ForegroundColor White
Write-Host "   Types: https://sepolia.basescan.org/address/$TYPES" -ForegroundColor White
Write-Host "   Proxy: https://sepolia.basescan.org/address/$PROXY" -ForegroundColor White
Write-Host ""

Write-Host "💡 What to check:" -ForegroundColor Cyan
Write-Host "   ✓ Proxy.getAdmin() should return $ADMIN" -ForegroundColor Gray
Write-Host "   ✓ Proxy.getCoreImplementation() should return $CORE" -ForegroundColor Gray
Write-Host "   ✓ Proxy.getTypesImplementation() should return $TYPES" -ForegroundColor Gray
