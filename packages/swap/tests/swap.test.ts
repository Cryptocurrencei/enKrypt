import { expect } from "chai";
import Web3Eth from "web3-eth";
import Swap from "../src";
import { NATIVE_TOKEN_ADDRESS } from "../src/configs";
import {
  ProviderName,
  SupportedNetworkName,
  WalletIdentifier,
} from "../src/types";
import {
  fromToken,
  toToken,
  amount,
  fromAddress,
  toAddress,
  nodeURL,
} from "./fixtures/mainnet/configs";

describe("Swap", () => {
  // @ts-ignore
  const web3eth = new Web3Eth(nodeURL);
  const enkryptSwap = new Swap({
    api: web3eth,
    network: SupportedNetworkName.Ethereum,
    walletIdentifier: WalletIdentifier.enkrypt,
    evmOptions: {
      infiniteApproval: true,
    },
  });

  it("it should all From tokens", async () => {
    await enkryptSwap.initPromise;
    const fromTokens = enkryptSwap.getFromTokens();
    expect(fromTokens[0].address).to.be.eq(NATIVE_TOKEN_ADDRESS);
    expect(fromTokens.length).to.be.gt(4000);
  });

  it("it should all To tokens", async () => {
    await enkryptSwap.initPromise;
    const toTokens = enkryptSwap.getToTokens();
    expect(toTokens[SupportedNetworkName.Bitcoin].length).to.be.eq(1);
    expect(toTokens[SupportedNetworkName.Bitcoin][0].address).to.be.eq(
      NATIVE_TOKEN_ADDRESS
    );
    expect(toTokens[SupportedNetworkName.Polkadot].length).to.be.eq(1);
    expect(toTokens[SupportedNetworkName.Ethereum].length).to.be.gt(4000);
    expect(toTokens[SupportedNetworkName.Ethereum][0].address).to.be.eq(
      NATIVE_TOKEN_ADDRESS
    );
  });

  it("it should get quote and swap", async () => {
    await enkryptSwap.initPromise;
    const quotes = await enkryptSwap.getQuote({
      amount,
      fromAddress,
      fromToken,
      toToken,
      toAddress,
    });
    expect(quotes?.length).to.be.eq(2);
    expect(quotes[0].quote.provider).to.be.eq(ProviderName.oneInch);
    expect(quotes[1].quote.provider).to.be.eq(ProviderName.changelly);
    const swapOneInch = await enkryptSwap.getSwap(quotes[0].quote);
    expect(swapOneInch?.fromTokenAmount.toString()).to.be.eq(amount.toString());
    expect(swapOneInch?.transactions.length).to.be.eq(2);
    const swapChangelly = await enkryptSwap.getSwap(quotes[1].quote);
    expect(swapChangelly?.transactions.length).to.be.eq(1);
  }).timeout(10000);
});
