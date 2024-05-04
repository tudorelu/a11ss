// scripts/interact.js
const { ethers } = require("hardhat");

async function main() {
    console.log('Getting the non fun token contract...\n');
    const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    const pass = await ethers.getContractAt('AllocationPass', contractAddress);
    const signers = await ethers.getSigners();

    // name()
    console.log('Querying NFT collection name...');
    const name = await pass.name();
    console.log(`Token Collection Name: ${name}\n`);
    const symbol = await pass.symbol();
    console.log(`Token Collection symbol: ${symbol}\n`);

    // Mint new NFTs from the collection using custom function mintCollectionNFT()
    console.log('Minting a new NFT from the collection to the contractOwner...');
    const contractOwner = signers[0].address;
    const initialMintCount = 10; // Number of NFTs to mint
    let initialMint = [];
    for (let i = 1; i <= initialMintCount; i++) {
        let tx = await pass.mintCollectionNFT(signers[0].address, i.toString());
        await tx.wait(); // wait for this tx to finish to avoid nonce issues
        initialMint.push(i.toString());
    }
    console.log(`${symbol} NFT with tokenIds ${initialMint} and minted to: ${contractOwner}\n`);

    // balanceOf()
    console.log(`Querying the balance count of contractOwner ${contractOwner}...`);
    let contractOwnerBalances = await pass.balanceOf(contractOwner);
    console.log(`${contractOwner} has ${contractOwnerBalances} NFTs from this ${symbol} collection\n`)


    // ownerOf()
    const NFT1 = initialMint[0];
    console.log(`Querying the owner of ${symbol}#${NFT1}...`);
    const owner = await pass.ownerOf(NFT1);
    console.log(`Owner of NFT ${symbol} ${NFT1}: ${owner}\n`);

    // safeTransferFrom()
    const collector = signers[1].address;
    console.log(`Transferring ${symbol}#${NFT1} to collector ${collector}...`);
    // safeTransferFrom() is overloaded (ie. multiple functions with same name) hence differing syntax
    await pass["safeTransferFrom(address,address,uint256)"](contractOwner, collector, NFT1);
    console.log(`${symbol}#${NFT1} transferred from ${contractOwner} to ${collector}`);
    console.log(`Querying the owner of ${symbol}#${NFT1}...`);
    let NFT1Owner = await pass.ownerOf(NFT1);
    console.log(`Owner of ${symbol}#${NFT1}: ${NFT1Owner}\n`);


    // approve()
    console.log(`Approving contractOwner to spend collector ${symbol}#${NFT1}...`);
    // Creates a new instance of the contract connected to the collector
    const collectorContract = nonFunToken.connect(signers[1]); 
    await collectorContract.approve(contractOwner, NFT1);
    console.log(`contractOwner ${contractOwner} has been approved to spend collector ${collector} ${symbol}#${NFT1}\n`);


    // setApprovalForAll()
    console.log(`Approving collector to spend all of contractOwner ${symbol} NFTs...`);
    // Using the contractOwner contract instance as the caller of the function
    await nonFunToken.setApprovalForAll(collector, true) // The second parameter can be set to false to remove operator
    console.log(`collector ${collector} has been approved to spend all of contractOwner ${contractOwner} ${symbol} NFTs\n`)


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });