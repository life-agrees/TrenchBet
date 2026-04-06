const hre = require("hardhat");

async function main() {
  const BET_VOUCHERS_ADDRESS = "0xC6989A4D70560413C7Db582352C3fCb0D440D915";

  const abi = [
    {
      inputs: [],
      name: "owner",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    }
  ];

  const contract = new hre.ethers.Contract(BET_VOUCHERS_ADDRESS, abi, hre.ethers.provider);
  const owner = await contract.owner();
  
  console.log(`BetVouchers owner: ${owner}`);
  console.log(`Expected admin:   0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d`);
  console.log(`Match: ${owner.toLowerCase() === '0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d'}`);
}

main().catch(console.error);
