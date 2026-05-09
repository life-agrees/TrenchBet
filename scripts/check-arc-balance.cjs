async function main() {
  const address = "0x52CEb1CC4Fe3cFaCC5F0cd12EA7215734CB0AA3d";
  const balance = await ethers.provider.getBalance(address);
  console.log(`Balance of ${address} on Arc Testnet:`);
  console.log(`${ethers.formatEther(balance)} USDC (native)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
