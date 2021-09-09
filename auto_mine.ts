import ABI from "./abi.json";
import Web3 from "web3";
import BN from "bn.js";
import { randomBytes } from "crypto";

import { createAlchemyWeb3 } from "@alch/alchemy-web3";

type Gem = {
  name: string;
  color: string;
  entropy: string;
  difficulty: string;
  gemsPerMine: string;
  multiplier: string;
  crafter: string;
  manager: string;
  pendingManager: string;
};

const MAX_UINT = new BN(2).pow(new BN(256));

function getSalt() {
  const value = randomBytes(32); // 32 bytes = 256 bits

  // Value as native bigint
  const bigInt = BigInt(`0x${value.toString("hex")}`);

  // Value as BN.js number
  const bn = new BN(value.toString("hex"), 16);
  return bn;
}

const web3 = createAlchemyWeb3("wss:...");

var cancel = false;

const KIND = "9";
const CHAIN_ID = "1";

const PROVABLY_ADDRESS = "0xC67DED0eC78b849e17771b2E8a7e303B4dAd6dD4";
const ADDR = "";

const provably = new web3.eth.Contract(ABI as any, PROVABLY_ADDRESS);

const getMineValue = async (): Promise<Gem> => {
  return provably.methods.gems(KIND).call();
};

function luck(
  web3: Web3,
  chainId: string,
  entropy: string,
  gemAddr: string,
  senderAddr: string,
  kind: string,
  nonce: string,
  salt: BN
): BN {
  return new BN(
    (
      web3.utils.soliditySha3(
        { t: "uint256", v: chainId }, // chainid
        { t: "bytes32", v: entropy },
        { t: "address", v: gemAddr }, // gem address
        { t: "address", v: senderAddr }, // sender address
        { t: "uint", v: kind }, // gem kind
        { t: "uint", v: nonce }, // sender nonce
        { t: "uint", v: salt } // sender salt
      ) as string
    ).slice(2),
    16
  );
}
const infLoop = async () => {
  const resetMined = async () => {
    const { entropy, difficulty } = await getMineValue();
    const nonce = await provably.methods.nonce(ADDR).call();
    return { entropy, difficulty, nonce };
  };

  const { entropy, difficulty, nonce } = await resetMined();
  let num = 0;
  while (!cancel) {
    const salt = getSalt();
    const ans = luck(
      web3 as any,
      CHAIN_ID,
      entropy,
      PROVABLY_ADDRESS,
      ADDR,
      KIND,
      nonce,
      salt
    ).toString();
    console.log(num);
    num += 1;
    console.log("salt", salt.toString());
    console.log("ans", ans);
    console.log("diff", difficulty);
    // console.log("real", await provably.methods.luck(KIND, salt).call());
    // console.log("diff", MAX_UINT.div(new BN(difficulty)).toString());
    if (new BN(2).pow(new BN(256)).div(new BN(difficulty)).gte(new BN(ans))) {
      console.log("ANSWER:", salt.toString());
      process.exit();
    }
  }
  cancel = false;
};

const main = async () => {
  var subscription = web3.eth.subscribe(
    "logs",
    {
      address: PROVABLY_ADDRESS,
      topics: [
        "0xf23a961744a760027f8811c59a0eaef0d29cf965578b17412bcc375b52fa39d1",
      ],
    },
    function (error, result) {
      cancel = true;
      if (error) {
        console.log(`error from subscribe ${error}`);
        process.exit();
      }
      infLoop();
    }
  );
  infLoop();
};

main();
