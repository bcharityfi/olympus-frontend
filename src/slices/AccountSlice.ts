import { BigNumber, BigNumberish, ethers } from "ethers";
import { addresses } from "../constants";
import { abi as ierc20Abi } from "../abi/IERC20.json";
import { abi as sOGVv2 } from "../abi/sOgvv2.json";
import { abi as fuseProxy } from "../abi/FuseProxy.json";
import { abi as wsOGV } from "../abi/wsOGV.json";
import { abi as fiatDAO } from "../abi/FiatDAOContract.json";

import { setAll } from "../helpers";

import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/store";
import { IBaseAddressAsyncThunk, ICalcUserBondDetailsAsyncThunk } from "./interfaces";
import { FiatDAOContract, FuseProxy, IERC20, IERC20__factory, SOgvv2, SOgvv2__factory, WsOGV } from "src/typechain";
import { GOGV__factory } from "src/typechain/factories/GOGV__factory";

interface IUserBalances {
  balances: {
    gogv: string;
    ogv: string;
    sogv: string;
    fsogv: string;
    wsogv: string;
    fiatDaowsogv: string;
    wsogvAsSogv: string;
    pool: string;
  };
}

export const getBalances = createAsyncThunk(
  "account/getBalances",
  async ({ address, networkID, provider }: IBaseAddressAsyncThunk) => {
    let gOgvBalance = BigNumber.from("0");
    let ogvBalance = BigNumber.from("0");
    let sogvBalance = BigNumber.from("0");
    let wsogvBalance = BigNumber.from("0");
    let wsogvAsSogv = BigNumber.from("0");
    let poolBalance = BigNumber.from("0");
    let fsogvBalance = BigNumber.from(0);
    let fiatDaowsogvBalance = BigNumber.from("0");
    try {
      const gOgvContract = GOGV__factory.connect(addresses[networkID].GOGV_ADDRESS, provider);
      gOgvBalance = await gOgvContract.balanceOf(address);
      const wsogvContract = new ethers.Contract(addresses[networkID].WSOGV_ADDRESS as string, wsOGV, provider) as WsOGV;
      wsogvBalance = await wsogvContract.balanceOf(address);
      // NOTE (appleseed): wsogvAsSogv is wsOGV given as a quantity of sOGV
      wsogvAsSogv = await wsogvContract.wOGVTosOGV(wsogvBalance);

      const ogvContract = new ethers.Contract(
        addresses[networkID].OGV_ADDRESS as string,
        ierc20Abi,
        provider,
      ) as IERC20;
      ogvBalance = await ogvContract.balanceOf(address);
      const sogvContract = new ethers.Contract(
        addresses[networkID].SOGV_ADDRESS as string,
        ierc20Abi,
        provider,
      ) as IERC20;
      sogvBalance = await sogvContract.balanceOf(address);

      const poolTokenContract = new ethers.Contract(
        addresses[networkID].PT_TOKEN_ADDRESS as string,
        ierc20Abi,
        provider,
      ) as IERC20;
      poolBalance = await poolTokenContract.balanceOf(address);

      for (const fuseAddressKey of ["FUSE_6_SOGV", "FUSE_18_SOGV", "FUSE_36_SOGV"]) {
        if (addresses[networkID][fuseAddressKey]) {
          const fsogvContract = new ethers.Contract(
            addresses[networkID][fuseAddressKey] as string,
            fuseProxy,
            provider.getSigner(),
          ) as FuseProxy;
          // fsogvContract.signer;
          const balanceOfUnderlying = await fsogvContract.callStatic.balanceOfUnderlying(address);
          fsogvBalance = balanceOfUnderlying.add(fsogvBalance);
        }
      }
      if (addresses[networkID].FIATDAO_WSOGV_ADDRESS) {
        const fiatDaoContract = new ethers.Contract(
          addresses[networkID].FIATDAO_WSOGV_ADDRESS as string,
          fiatDAO,
          provider,
        ) as FiatDAOContract;
        fiatDaowsogvBalance = await fiatDaoContract.balanceOf(address, addresses[networkID].WSOGV_ADDRESS as string);
      }
    } catch (e) {
      console.warn("caught error in getBalances", e);
    }

    return {
      balances: {
        gogv: ethers.utils.formatEther(gOgvBalance),
        ogv: ethers.utils.formatUnits(ogvBalance, "gwei"),
        sogv: ethers.utils.formatUnits(sogvBalance, "gwei"),
        fsogv: ethers.utils.formatUnits(fsogvBalance, "gwei"),
        wsogv: ethers.utils.formatEther(wsogvBalance),
        fiatDaowsogv: ethers.utils.formatEther(fiatDaowsogvBalance),
        wsogvAsSogv: ethers.utils.formatUnits(wsogvAsSogv, "gwei"),
        pool: ethers.utils.formatUnits(poolBalance, "gwei"),
      },
    };
  },
);

interface IUserAccountDetails {
  staking: {
    ogvStake: number;
    ogvUnstake: number;
  };
  wrapping: {
    sogvWrap: number;
    wsogvUnwrap: number;
    gOgvUnwrap: number;
  };
}

export const getMigrationAllowances = createAsyncThunk(
  "account/getMigrationAllowances",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk) => {
    let ogvAllowance = BigNumber.from(0);
    let sOgvAllowance = BigNumber.from(0);
    let wsOgvAllowance = BigNumber.from(0);
    let gOgvAllowance = BigNumber.from(0);

    if (addresses[networkID].OGV_ADDRESS) {
      const ogvContract = IERC20__factory.connect(addresses[networkID].OGV_ADDRESS, provider);
      ogvAllowance = await ogvContract.allowance(address, addresses[networkID].MIGRATOR_ADDRESS);
    }

    if (addresses[networkID].SOGV_ADDRESS) {
      const sOgvContract = IERC20__factory.connect(addresses[networkID].SOGV_ADDRESS, provider);
      sOgvAllowance = await sOgvContract.allowance(address, addresses[networkID].MIGRATOR_ADDRESS);
    }

    if (addresses[networkID].WSOGV_ADDRESS) {
      const wsOgvContract = IERC20__factory.connect(addresses[networkID].WSOGV_ADDRESS, provider);
      wsOgvAllowance = await wsOgvContract.allowance(address, addresses[networkID].MIGRATOR_ADDRESS);
    }

    if (addresses[networkID].GOGV_ADDRESS) {
      const gOgvContract = IERC20__factory.connect(addresses[networkID].GOGV_ADDRESS, provider);
      gOgvAllowance = await gOgvContract.allowance(address, addresses[networkID].MIGRATOR_ADDRESS);
    }

    return {
      migration: {
        ogv: +ogvAllowance,
        sogv: +sOgvAllowance,
        wsogv: +wsOgvAllowance,
        gogv: +gOgvAllowance,
      },
      isMigrationComplete: false,
    };
  },
);

export const loadAccountDetails = createAsyncThunk(
  "account/loadAccountDetails",
  async ({ networkID, provider, address }: IBaseAddressAsyncThunk, { dispatch }) => {
    let stakeAllowance = BigNumber.from("0");
    let unstakeAllowance = BigNumber.from("0");
    let wrapAllowance = BigNumber.from("0");
    let unwrapAllowance = BigNumber.from("0");
    let gOgvUnwrapAllowance = BigNumber.from("0");
    let poolAllowance = BigNumber.from("0");
    try {
      const gOgvContract = GOGV__factory.connect(addresses[networkID].GOGV_ADDRESS, provider);
      gOgvUnwrapAllowance = await gOgvContract.allowance(address, addresses[networkID].MIGRATOR_ADDRESS);

      const ogvContract = new ethers.Contract(
        addresses[networkID].OGV_ADDRESS as string,
        ierc20Abi,
        provider,
      ) as IERC20;
      stakeAllowance = await ogvContract.allowance(address, addresses[networkID].STAKING_HELPER_ADDRESS);

      const sogvContract = new ethers.Contract(addresses[networkID].SOGV_ADDRESS as string, sOGVv2, provider) as SOgvv2;
      unstakeAllowance = await sogvContract.allowance(address, addresses[networkID].STAKING_ADDRESS);
      poolAllowance = await sogvContract.allowance(address, addresses[networkID].PT_PRIZE_POOL_ADDRESS);
      wrapAllowance = await sogvContract.allowance(address, addresses[networkID].WSOGV_ADDRESS);

      const wsogvContract = new ethers.Contract(addresses[networkID].WSOGV_ADDRESS as string, wsOGV, provider) as WsOGV;
      unwrapAllowance = await wsogvContract.allowance(address, addresses[networkID].WSOGV_ADDRESS);
    } catch (e) {
      console.warn("failed contract calls in slice", e);
    }
    await dispatch(getBalances({ address, networkID, provider }));

    return {
      staking: {
        ogvStake: +stakeAllowance,
        ogvUnstake: +unstakeAllowance,
      },
      wrapping: {
        ogvWrap: Number(ethers.utils.formatUnits(wrapAllowance, "gwei")),
        ogvUnwrap: Number(ethers.utils.formatUnits(unwrapAllowance, "gwei")),
        gOgvUnwrap: Number(ethers.utils.formatUnits(gOgvUnwrapAllowance, "ether")),
      },
    };
  },
);

export interface IUserBondDetails {
  // bond: string;
  allowance: number;
  interestDue: number;
  bondMaturationBlock: number;
  pendingPayout: string; //Payout formatted in gwei.
}
export const calculateUserBondDetails = createAsyncThunk(
  "account/calculateUserBondDetails",
  async ({ address, bond, networkID, provider }: ICalcUserBondDetailsAsyncThunk) => {
    if (!address) {
      return {
        bond: "",
        displayName: "",
        bondIconSvg: "",
        isLP: false,
        allowance: 0,
        balance: "0",
        interestDue: 0,
        bondMaturationBlock: 0,
        pendingPayout: "",
      };
    }
    // dispatch(fetchBondInProgress());

    // Calculate bond details.
    const bondContract = bond.getContractForBond(networkID, provider);
    const reserveContract = bond.getContractForReserve(networkID, provider);

    let pendingPayout, bondMaturationBlock;

    const bondDetails = await bondContract.bondInfo(address);
    let interestDue: BigNumberish = Number(bondDetails.payout.toString()) / Math.pow(10, 9);
    bondMaturationBlock = +bondDetails.vesting + +bondDetails.lastBlock;
    pendingPayout = await bondContract.pendingPayoutFor(address);

    let allowance,
      balance = BigNumber.from(0);
    allowance = await reserveContract.allowance(address, bond.getAddressForBond(networkID) || "");
    balance = await reserveContract.balanceOf(address);
    // formatEthers takes BigNumber => String
    const balanceVal = ethers.utils.formatEther(balance);
    // balanceVal should NOT be converted to a number. it loses decimal precision
    return {
      bond: bond.name,
      displayName: bond.displayName,
      bondIconSvg: bond.bondIconSvg,
      isLP: bond.isLP,
      allowance: Number(allowance.toString()),
      balance: balanceVal,
      interestDue,
      bondMaturationBlock,
      pendingPayout: ethers.utils.formatUnits(pendingPayout, "gwei"),
    };
  },
);

interface IAccountSlice extends IUserAccountDetails, IUserBalances {
  bonds: { [key: string]: IUserBondDetails };
  balances: {
    gogv: string;
    ogv: string;
    sogv: string;
    dai: string;
    oldsogv: string;
    fsogv: string;
    wsogv: string;
    fiatDaowsogv: string;
    wsogvAsSogv: string;
    pool: string;
  };
  loading: boolean;
  staking: {
    ogvStake: number;
    ogvUnstake: number;
  };
  migration: {
    ogv: number;
    sogv: number;
    wsogv: number;
    gogv: number;
  };
  pooling: {
    sogvPool: number;
  };
}

const initialState: IAccountSlice = {
  loading: false,
  bonds: {},
  balances: {
    gogv: "",
    ogv: "",
    sogv: "",
    dai: "",
    oldsogv: "",
    fsogv: "",
    wsogv: "",
    fiatDaowsogv: "",
    pool: "",
    wsogvAsSogv: "",
  },
  staking: { ogvStake: 0, ogvUnstake: 0 },
  wrapping: { sogvWrap: 0, wsogvUnwrap: 0, gOgvUnwrap: 0 },
  pooling: { sogvPool: 0 },
  migration: { ogv: 0, sogv: 0, wsogv: 0, gogv: 0 },
};

const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    fetchAccountSuccess(state, action) {
      setAll(state, action.payload);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadAccountDetails.pending, state => {
        state.loading = true;
      })
      .addCase(loadAccountDetails.fulfilled, (state, action) => {
        setAll(state, action.payload);
        state.loading = false;
      })
      .addCase(loadAccountDetails.rejected, (state, { error }) => {
        state.loading = false;
        console.log(error);
      })
      .addCase(getBalances.pending, state => {
        state.loading = true;
      })
      .addCase(getBalances.fulfilled, (state, action) => {
        setAll(state, action.payload);
        state.loading = false;
      })
      .addCase(getBalances.rejected, (state, { error }) => {
        state.loading = false;
        console.log(error);
      })
      .addCase(calculateUserBondDetails.pending, state => {
        state.loading = true;
      })
      .addCase(calculateUserBondDetails.fulfilled, (state, action) => {
        if (!action.payload) return;
        const bond = action.payload.bond;
        state.bonds[bond] = action.payload;
        state.loading = false;
      })
      .addCase(calculateUserBondDetails.rejected, (state, { error }) => {
        state.loading = false;
        console.log(error);
      })
      .addCase(getMigrationAllowances.fulfilled, (state, action) => {
        setAll(state, action.payload);
      })
      .addCase(getMigrationAllowances.rejected, (state, { error }) => {
        console.log(error);
      });
  },
});

export default accountSlice.reducer;

export const { fetchAccountSuccess } = accountSlice.actions;

const baseInfo = (state: RootState) => state.account;

export const getAccountState = createSelector(baseInfo, account => account);
