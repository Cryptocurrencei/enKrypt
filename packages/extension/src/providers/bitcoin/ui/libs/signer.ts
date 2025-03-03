import { InternalMethods, InternalOnMessageResponse } from "@/types/messenger";
import { SignerTransactionOptions, SignerMessageOptions } from "../types";
import { bufferToHex } from "ethereumjs-util";
import sendUsingInternalMessengers from "@/libs/messenger/internal-messenger";
import { hexToBuffer } from "@enkryptcom/utils";
import { Psbt } from "bitcoinjs-lib";
import { signAsync } from "bitcoinjs-message";
import { PaymentType } from "../../types/bitcoin-network";

const TransactionSigner = (
  options: SignerTransactionOptions
): Promise<Psbt> => {
  const { account, network, payload } = options;
  if (account.isHardware) {
    throw new Error("btc-hardware not implemented");
  } else {
    const signer = {
      publicKey: hexToBuffer(account.address),
      network: network.networkInfo,
      sign: (hash: Buffer): Promise<Buffer> => {
        return sendUsingInternalMessengers({
          method: InternalMethods.sign,
          params: [bufferToHex(hash), account],
        }).then((res) => {
          if (res.error) {
            return Promise.reject({
              error: res.error,
            });
          } else {
            return hexToBuffer(JSON.parse(res.result!)).subarray(0, 64);
          }
        });
      },
    };
    const tx = new Psbt({
      network: network.networkInfo,
      maximumFeeRate: network.networkInfo.maxFeeRate,
    });
    payload.inputs
      .map((u) => {
        const res: {
          hash: string;
          index: number;
          witnessUtxo?: { script: Buffer; value: number };
          nonWitnessUtxo?: Buffer;
        } = {
          hash: u.hash,
          index: u.index,
        };
        if (network.networkInfo.paymentType === PaymentType.P2WPKH) {
          res.witnessUtxo = {
            script: Buffer.from(u.witnessUtxo.script, "hex"),
            value: u.witnessUtxo.value,
          };
        } else if (network.networkInfo.paymentType === PaymentType.P2PKH) {
          res.nonWitnessUtxo = Buffer.from(u.raw, "hex");
        }
        return res;
      })
      .forEach((input) => tx.addInput(input));
    payload.outputs.forEach((output) => tx.addOutput(output));
    return tx.signAllInputsAsync(signer).then(() => {
      tx.finalizeAllInputs();
      return tx;
    });
  }
};

const MessageSigner = (
  options: SignerMessageOptions
): Promise<InternalOnMessageResponse> => {
  const { account, payload } = options;
  if (account.isHardware) {
    throw new Error("btc-hardware not implemented");
  } else {
    const signer = {
      sign: (
        hash: Buffer
      ): Promise<{ signature: Buffer; recovery: number }> => {
        return sendUsingInternalMessengers({
          method: InternalMethods.sign,
          params: [bufferToHex(hash), account],
        }).then((res) => {
          if (res.error) {
            return Promise.reject({
              error: res.error,
            });
          } else {
            const sigBuffer = hexToBuffer(JSON.parse(res.result!)).subarray(
              0,
              64
            );
            return {
              signature: sigBuffer.subarray(0, 64),
              recovery: sigBuffer[64],
            };
          }
        });
      },
    };
    return signAsync(payload, signer, false).then((res) => {
      return {
        result: JSON.stringify(bufferToHex(res)),
      };
    });
  }
};

export { TransactionSigner, MessageSigner };
